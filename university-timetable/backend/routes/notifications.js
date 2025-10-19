const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { is_read, type, page = 1, limit = 10 } = req.query;
    
    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];
    
    if (is_read !== undefined) {
      whereClause += ' AND is_read = ?';
      params.push(is_read === 'true');
    }
    
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    
    const offset = (page - 1) * limit;
    
    const result = await executeQuery(`
      SELECT id, type, title, message, is_read, metadata, created_at
      FROM notifications 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notifications'
      });
    }
    
    // Get total count
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );
    
    res.json({
      success: true,
      data: {
        notifications: result.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.data[0].total,
          pages: Math.ceil(countResult.data[0].total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
    
    if (result.data.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(
      'UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false',
      [req.user.id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to mark all notifications as read'
      });
    }
    
    res.json({
      success: true,
      message: `${result.data.affectedRows} notifications marked as read`
    });
    
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete notification'
      });
    }
    
    if (result.data.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const statsResult = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread,
        COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
        type,
        COUNT(*) as count_by_type
      FROM notifications 
      WHERE user_id = ?
      GROUP BY type
    `, [req.user.id]);
    
    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch notification statistics'
      });
    }
    
    // Get total counts
    const totalResult = await executeQuery(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread
      FROM notifications 
      WHERE user_id = ?
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: {
        total: totalResult.data[0].total,
        unread: totalResult.data[0].unread,
        byType: statsResult.data
      }
    });
    
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create notification (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, type, title, message, metadata } = req.body;
    
    // Check if user is admin or creating for themselves
    if (req.user.role !== 'admin' && user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create notifications for other users'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO notifications (user_id, type, title, message, metadata) VALUES (?, ?, ?, ?, ?)',
      [user_id, type, title, message, JSON.stringify(metadata || {})]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create notification'
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: { id: result.data.insertId }
    });
    
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Send bulk notification (admin only)
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { user_ids, type, title, message, metadata } = req.body;
    
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }
    
    // Create notifications for all users
    const notifications = user_ids.map(user_id => [
      user_id,
      type,
      title,
      message,
      JSON.stringify(metadata || {})
    ]);
    
    const values = notifications.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = notifications.flat();
    
    const result = await executeQuery(
      `INSERT INTO notifications (user_id, type, title, message, metadata) VALUES ${values}`,
      params
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create bulk notifications'
      });
    }
    
    res.status(201).json({
      success: true,
      message: `Notifications sent to ${user_ids.length} users`,
      data: { affectedRows: result.data.affectedRows }
    });
    
  } catch (error) {
    console.error('Create bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;