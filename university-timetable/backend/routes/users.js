const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { 
  sendRegistrationApprovalEmail,
  sendRegistrationRejectionEmail 
} = require('../utils/email');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10 } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    const offset = (page - 1) * limit;
    
    // Get users with pagination
    const usersResult = await executeQuery(
      `SELECT id, name, email, role, status, metadata, created_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    
    // Get total count
    const countResult = await executeQuery(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    
    if (!usersResult.success || !countResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users'
      });
    }
    
    res.json({
      success: true,
      data: {
        users: usersResult.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.data[0].total,
          pages: Math.ceil(countResult.data[0].total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get pending registration requests
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT id, name, email, role, metadata, created_at 
       FROM users 
       WHERE status = 'pending' 
       ORDER BY created_at ASC`
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch pending requests'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Approve user registration
router.post('/:userId/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details
    const userResult = await executeQuery(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.data[0];
    
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'User is not pending approval'
      });
    }
    
    // Update user status
    const updateResult = await executeQuery(
      'UPDATE users SET status = ? WHERE id = ?',
      ['approved', userId]
    );
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to approve user'
      });
    }
    
    // Send approval email
    await sendRegistrationApprovalEmail(user.email, user.name, user.role);
    
    // Log approval action
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'APPROVE_USER', 'users', userId, JSON.stringify({ status: 'approved' })]
    );
    
    res.json({
      success: true,
      message: 'User approved successfully'
    });
    
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reject user registration
router.post('/:userId/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    // Get user details
    const userResult = await executeQuery(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.data[0];
    
    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'User is not pending approval'
      });
    }
    
    // Update user status
    const updateResult = await executeQuery(
      'UPDATE users SET status = ? WHERE id = ?',
      ['rejected', userId]
    );
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reject user'
      });
    }
    
    // Send rejection email
    await sendRegistrationRejectionEmail(user.email, user.name, reason);
    
    // Log rejection action
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'REJECT_USER', 'users', userId, JSON.stringify({ status: 'rejected', reason })]
    );
    
    res.json({
      success: true,
      message: 'User rejected successfully'
    });
    
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user by ID
router.get('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await executeQuery(
      'SELECT id, name, email, role, status, metadata, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (!result.success || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = result.data[0];
    user.metadata = JSON.parse(user.metadata || '{}');
    
    res.json({
      success: true,
      data: user
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user
router.put('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, metadata } = req.body;
    
    // Check if user exists
    const userResult = await executeQuery(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update user
    const updateResult = await executeQuery(
      'UPDATE users SET name = ?, email = ?, role = ?, metadata = ? WHERE id = ?',
      [name, email, role, JSON.stringify(metadata || {}), userId]
    );
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
    
    // Log update action
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_USER', 'users', userId, JSON.stringify({ name, email, role, metadata })]
    );
    
    res.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user
router.delete('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const userResult = await executeQuery(
      'SELECT id, name FROM users WHERE id = ?',
      [userId]
    );
    
    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deletion of super admin (first admin)
    const adminCountResult = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "approved"'
    );
    
    if (adminCountResult.success && adminCountResult.data[0].count <= 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the last admin user'
      });
    }
    
    // Delete user
    const deleteResult = await executeQuery(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    
    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
    
    // Log deletion action
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'DELETE_USER', 'users', userId]
    );
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statsResult = await executeQuery(`
      SELECT 
        role,
        status,
        COUNT(*) as count
      FROM users 
      GROUP BY role, status
    `);
    
    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user statistics'
      });
    }
    
    // Process statistics
    const stats = {
      total: 0,
      byRole: { admin: 0, instructor: 0, student: 0 },
      byStatus: { pending: 0, approved: 0, rejected: 0 }
    };
    
    statsResult.data.forEach(row => {
      stats.total += row.count;
      stats.byRole[row.role] += row.count;
      stats.byStatus[row.status] += row.count;
    });
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;