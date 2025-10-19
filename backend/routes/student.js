const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all student routes
router.use(authenticateToken);
router.use(requireRole(['student']));

// Get student's timetable
router.get('/timetable', async (req, res) => {
  try {
    const userMetadata = JSON.parse(req.user.metadata || '{}');
    const { section, semester, program } = userMetadata;

    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'Student section not found in profile'
      });
    }

    // Get section ID
    const [sections] = await pool.execute(
      'SELECT id FROM sections WHERE name = ? AND is_active = 1',
      [section]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const sectionId = sections[0].id;

    // Get timetable for the section
    const [blocks] = await pool.execute(`
      SELECT b.*, c.name as course_name, c.code as course_code, c.credit_hours,
             u.name as instructor_name, r.name as room_name, r.type as room_type,
             ts.start_time, ts.end_time
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN users u ON b.teacher_id = u.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.section_id = ?
      ORDER BY b.day, ts.slot_number
    `, [sectionId]);

    res.json({
      success: true,
      data: blocks
    });
  } catch (error) {
    console.error('Get student timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
});

// Get student's exam schedule
router.get('/exams', async (req, res) => {
  try {
    const userMetadata = JSON.parse(req.user.metadata || '{}');
    const { section, semester, program } = userMetadata;

    if (!section) {
      return res.status(400).json({
        success: false,
        message: 'Student section not found in profile'
      });
    }

    // Get section ID
    const [sections] = await pool.execute(
      'SELECT id FROM sections WHERE name = ? AND is_active = 1',
      [section]
    );

    if (sections.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Section not found'
      });
    }

    const sectionId = sections[0].id;

    // Get courses for the section
    const [courses] = await pool.execute(`
      SELECT c.id, c.name, c.code
      FROM courses c
      JOIN sections s ON c.major_id = s.major_id AND c.shift = s.shift
      WHERE s.id = ? AND c.is_active = 1
    `, [sectionId]);

    const courseIds = courses.map(c => c.id);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get exams for these courses
    const [exams] = await pool.execute(`
      SELECT e.*, c.name as course_name, c.code as course_code,
             r.name as room_name, r.type as room_type,
             u.name as invigilator_name, es.name as session_name, es.exam_type
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      JOIN exam_sessions es ON e.exam_session_id = es.id
      WHERE e.course_id IN (${courseIds.map(() => '?').join(',')})
      ORDER BY e.exam_date, e.start_time
    `, courseIds);

    res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Get student exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam schedule'
    });
  }
});

// Get student's notifications
router.get('/notifications', async (req, res) => {
  try {
    const { unread_only } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (unread_only === 'true') {
      query += ' AND is_read = 0';
    }

    query += ' ORDER BY created_at DESC';

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
router.patch('/notifications/:notificationId/read', async (req, res) => {
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

// Get student profile
router.get('/profile', async (req, res) => {
  try {
    const metadata = JSON.parse(req.user.metadata || '{}');
    
    res.json({
      success: true,
      data: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        metadata: metadata
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Update student profile
router.patch('/profile', [
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('program').optional().trim().notEmpty().withMessage('Program required'),
  body('semester').optional().isInt({ min: 1 }).withMessage('Semester must be positive'),
  body('section').optional().trim().notEmpty().withMessage('Section required')
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

    const { name, program, semester, section } = req.body;
    const currentMetadata = JSON.parse(req.user.metadata || '{}');
    
    const updatedMetadata = {
      ...currentMetadata,
      ...(program && { program }),
      ...(semester && { semester }),
      ...(section && { section })
    };

    let updateQuery = 'UPDATE users SET metadata = ?';
    const params = [JSON.stringify(updatedMetadata)];

    if (name) {
      updateQuery += ', name = ?';
      params.push(name);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.user.id);

    await pool.execute(updateQuery, params);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

module.exports = router;