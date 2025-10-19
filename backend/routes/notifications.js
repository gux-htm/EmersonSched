const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const nodemailer = require('nodemailer');

const router = express.Router();

// Apply authentication to all notification routes
router.use(authenticateToken);

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send notification to user
router.post('/send', [
  body('user_id').isUUID().withMessage('Valid user ID required'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('message').trim().notEmpty().withMessage('Message required'),
  body('type').isIn(['timetable', 'reschedule', 'exam', 'general']).withMessage('Invalid notification type'),
  body('send_email').optional().isBoolean().withMessage('Send email must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_id, title, message, type, metadata, send_email = false } = req.body;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, name, email FROM users WHERE id = ?',
      [user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Create notification in database
    const [result] = await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, metadata) VALUES (?, ?, ?, ?, ?)',
      [user_id, title, message, type, JSON.stringify(metadata || {})]
    );

    // Send email if requested
    if (send_email && user.email) {
      try {
        const transporter = createTransporter();
        
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `EmersonSched: ${title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #A855F7;">EmersonSched Notification</h2>
              <h3>${title}</h3>
              <p>${message}</p>
              <p style="color: #666; font-size: 14px;">
                This is an automated notification from EmersonSched University Timetable Management System.
              </p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: { notificationId: result.insertId }
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

// Send bulk notifications
router.post('/send-bulk', [
  body('user_ids').isArray({ min: 1 }).withMessage('User IDs array required'),
  body('title').trim().notEmpty().withMessage('Title required'),
  body('message').trim().notEmpty().withMessage('Message required'),
  body('type').isIn(['timetable', 'reschedule', 'exam', 'general']).withMessage('Invalid notification type'),
  body('send_email').optional().isBoolean().withMessage('Send email must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { user_ids, title, message, type, metadata, send_email = false } = req.body;

    // Get users
    const [users] = await pool.execute(
      `SELECT id, name, email FROM users WHERE id IN (${user_ids.map(() => '?').join(',')})`,
      user_ids
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid users found'
      });
    }

    // Create notifications
    const notifications = users.map(user => [
      user.id,
      title,
      message,
      type,
      JSON.stringify(metadata || {})
    ]);

    await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, metadata) VALUES ?',
      [notifications]
    );

    // Send emails if requested
    if (send_email) {
      const transporter = createTransporter();
      
      for (const user of users) {
        if (user.email) {
          try {
            await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: user.email,
              subject: `EmersonSched: ${title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #A855F7;">EmersonSched Notification</h2>
                  <h3>${title}</h3>
                  <p>${message}</p>
                  <p style="color: #666; font-size: 14px;">
                    This is an automated notification from EmersonSched University Timetable Management System.
                  </p>
                </div>
              `
            });
          } catch (emailError) {
            console.error(`Email sending failed for user ${user.id}:`, emailError);
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Notifications sent to ${users.length} users`,
      data: { sentCount: users.length }
    });
  } catch (error) {
    console.error('Send bulk notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications'
    });
  }
});

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const { unread_only, type, limit = 50 } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [notifications] = await pool.execute(query, params);

    res.json({
      success: true,
      data: notifications.map(notification => ({
        ...notification,
        metadata: JSON.parse(notification.metadata || '{}')
      }))
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;

    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read'
    });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN type = 'timetable' THEN 1 ELSE 0 END) as timetable,
        SUM(CASE WHEN type = 'reschedule' THEN 1 ELSE 0 END) as reschedule,
        SUM(CASE WHEN type = 'exam' THEN 1 ELSE 0 END) as exam,
        SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as general
      FROM notifications 
      WHERE user_id = ?
    `, [req.user.id]);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

module.exports = router;