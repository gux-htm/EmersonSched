const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateRoom, validate } = require('../utils/validation');

const router = express.Router();

// Get all rooms
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { type, capacity_min, capacity_max } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    
    if (capacity_min) {
      whereClause += ' AND capacity >= ?';
      params.push(capacity_min);
    }
    
    if (capacity_max) {
      whereClause += ' AND capacity <= ?';
      params.push(capacity_max);
    }
    
    const result = await executeQuery(`
      SELECT * FROM rooms 
      ${whereClause}
      ORDER BY name ASC
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch rooms'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new room
router.post('/', authenticateToken, requireAdmin, validate(validateRoom), async (req, res) => {
  try {
    const { name, type, capacity, resources } = req.body;
    
    // Check if room name already exists
    const existingRoom = await executeQuery(
      'SELECT id FROM rooms WHERE name = ?',
      [name]
    );
    
    if (existingRoom.success && existingRoom.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Room with this name already exists'
      });
    }
    
    const result = await executeQuery(
      'INSERT INTO rooms (name, type, capacity, resources) VALUES (?, ?, ?, ?)',
      [name, type, capacity, JSON.stringify(resources || {})]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create room'
      });
    }
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_ROOM', 'rooms', result.data.insertId, JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { id: result.data.insertId, ...req.body }
    });
    
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update room
router.put('/:id', authenticateToken, requireAdmin, validate(validateRoom), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, resources } = req.body;
    
    // Check if room exists
    const existingResult = await executeQuery(
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if new name conflicts with existing rooms
    if (name !== existingResult.data[0].name) {
      const nameCheck = await executeQuery(
        'SELECT id FROM rooms WHERE name = ? AND id != ?',
        [name, id]
      );
      
      if (nameCheck.success && nameCheck.data.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Room with this name already exists'
        });
      }
    }
    
    const result = await executeQuery(
      'UPDATE rooms SET name = ?, type = ?, capacity = ?, resources = ? WHERE id = ?',
      [name, type, capacity, JSON.stringify(resources || {}), id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update room'
      });
    }
    
    // Log update
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_ROOM', 'rooms', id, JSON.stringify(existingResult.data[0]), JSON.stringify(req.body)]
    );
    
    res.json({
      success: true,
      message: 'Room updated successfully'
    });
    
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete room
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if room exists
    const existingResult = await executeQuery(
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if room is being used in blocks
    const blockCheck = await executeQuery(
      'SELECT id FROM blocks WHERE room_id = ?',
      [id]
    );
    
    if (blockCheck.success && blockCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room that is assigned to timetable blocks'
      });
    }
    
    // Check if room is being used in exams
    const examCheck = await executeQuery(
      'SELECT id FROM exams WHERE room_id = ?',
      [id]
    );
    
    if (examCheck.success && examCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room that is assigned to exams'
      });
    }
    
    const result = await executeQuery(
      'DELETE FROM rooms WHERE id = ?',
      [id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete room'
      });
    }
    
    // Log deletion
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_ROOM', 'rooms', id, JSON.stringify(existingResult.data[0])]
    );
    
    res.json({
      success: true,
      message: 'Room deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get room availability for a specific time slot
router.get('/:id/availability', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { day, time_slot_id, shift } = req.query;
    
    if (!day || !time_slot_id || !shift) {
      return res.status(400).json({
        success: false,
        message: 'Day, time_slot_id, and shift are required'
      });
    }
    
    // Check if room is available
    const conflictCheck = await executeQuery(`
      SELECT b.id, c.name as course_name, s.name as section_name, u.name as teacher_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN users u ON b.teacher_id = u.id
      WHERE b.room_id = ? AND b.day = ? AND b.time_slot_id = ? AND b.shift = ? AND b.status = 'active'
    `, [id, day, time_slot_id, shift]);
    
    if (!conflictCheck.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to check room availability'
      });
    }
    
    const isAvailable = conflictCheck.data.length === 0;
    
    res.json({
      success: true,
      data: {
        isAvailable,
        conflicts: conflictCheck.data
      }
    });
    
  } catch (error) {
    console.error('Check room availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get room statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statsResult = await executeQuery(`
      SELECT 
        type,
        COUNT(*) as count,
        AVG(capacity) as avg_capacity,
        MIN(capacity) as min_capacity,
        MAX(capacity) as max_capacity
      FROM rooms 
      GROUP BY type
    `);
    
    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch room statistics'
      });
    }
    
    // Get total rooms
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM rooms');
    
    res.json({
      success: true,
      data: {
        total: totalResult.data[0].total,
        byType: statsResult.data
      }
    });
    
  } catch (error) {
    console.error('Get room stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;