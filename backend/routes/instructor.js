const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all instructor routes
router.use(authenticateToken);
router.use(requireRole(['instructor']));

// Get instructor's course requests
router.get('/course-requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT cr.*, c.name as course_name, c.code as course_code, c.credit_hours,
             s.name as section_name, s.student_strength, s.shift,
             m.name as major_name, p.name as program_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE cr.instructor_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND cr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY cr.created_at DESC';

    const [requests] = await pool.execute(query, params);

    res.json({
      success: true,
      data: requests.map(request => ({
        ...request,
        preferences: JSON.parse(request.preferences || '{}')
      }))
    });
  } catch (error) {
    console.error('Get course requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course requests'
    });
  }
});

// Accept course request
router.post('/course-requests/:requestId/accept', [
  body('preferences').isObject().withMessage('Preferences required'),
  body('preferences.days').isArray({ min: 1 }).withMessage('At least one day required'),
  body('preferences.time_slots').isArray({ min: 1 }).withMessage('At least one time slot required')
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

    const { requestId } = req.params;
    const { preferences } = req.body;

    // Check if request exists and belongs to instructor
    const [requests] = await pool.execute(
      'SELECT * FROM course_requests WHERE id = ? AND instructor_id = ? AND status = "pending"',
      [requestId, req.user.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course request not found or already processed'
      });
    }

    // Validate preferences against available time slots
    const [timeSlots] = await pool.execute(
      'SELECT * FROM time_slots WHERE is_active = 1 AND shift = ?',
      [requests[0].shift]
    );

    const availableSlotIds = timeSlots.map(slot => slot.id);
    const invalidSlots = preferences.time_slots.filter(slotId => !availableSlotIds.includes(slotId));

    if (invalidSlots.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time slots selected'
      });
    }

    // Update request with preferences and mark as accepted
    await pool.execute(
      'UPDATE course_requests SET status = "accepted", preferences = ?, accepted_at = NOW() WHERE id = ?',
      [JSON.stringify(preferences), requestId]
    );

    res.json({
      success: true,
      message: 'Course request accepted successfully'
    });
  } catch (error) {
    console.error('Accept course request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept course request'
    });
  }
});

// Undo course request acceptance (within 10 seconds)
router.post('/course-requests/:requestId/undo', async (req, res) => {
  try {
    const { requestId } = req.params;

    // Check if request exists and was recently accepted
    const [requests] = await pool.execute(
      'SELECT * FROM course_requests WHERE id = ? AND instructor_id = ? AND status = "accepted"',
      [requestId, req.user.id]
    );

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course request not found'
      });
    }

    const request = requests[0];
    const acceptedAt = new Date(request.accepted_at);
    const now = new Date();
    const timeDiff = (now - acceptedAt) / 1000; // seconds

    if (timeDiff > 10) {
      return res.status(400).json({
        success: false,
        message: 'Undo period expired (10 seconds)'
      });
    }

    // Reset request to pending
    await pool.execute(
      'UPDATE course_requests SET status = "pending", preferences = NULL, accepted_at = NULL WHERE id = ?',
      [requestId]
    );

    res.json({
      success: true,
      message: 'Course request undone successfully'
    });
  } catch (error) {
    console.error('Undo course request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to undo course request'
    });
  }
});

// Get instructor's timetable
router.get('/timetable', async (req, res) => {
  try {
    const { day } = req.query;
    let query = `
      SELECT b.*, c.name as course_name, c.code as course_code, c.credit_hours,
             s.name as section_name, s.student_strength,
             r.name as room_name, r.type as room_type, r.capacity,
             ts.start_time, ts.end_time
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.teacher_id = ?
    `;
    const params = [req.user.id];

    if (day) {
      query += ' AND b.day = ?';
      params.push(day);
    }

    query += ' ORDER BY b.day, ts.slot_number';

    const [blocks] = await pool.execute(query, params);

    res.json({
      success: true,
      data: blocks
    });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable'
    });
  }
});

// Reschedule a class
router.post('/reschedule/:blockId', [
  body('new_day').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']).withMessage('Valid day required'),
  body('new_time_slot_id').isInt().withMessage('Valid time slot required'),
  body('new_room_id').isInt().withMessage('Valid room required')
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

    const { blockId } = req.params;
    const { new_day, new_time_slot_id, new_room_id } = req.body;

    // Check if block exists and belongs to instructor
    const [blocks] = await pool.execute(
      'SELECT * FROM blocks WHERE id = ? AND teacher_id = ?',
      [blockId, req.user.id]
    );

    if (blocks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Block not found or access denied'
      });
    }

    const block = blocks[0];

    // Check for conflicts
    const [conflicts] = await pool.execute(`
      SELECT b.*, u.name as teacher_name, c.name as course_name, r.name as room_name
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      JOIN courses c ON b.course_id = c.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.day = ? AND b.time_slot_id = ? AND b.id != ?
    `, [new_day, new_time_slot_id, blockId]);

    // Check teacher conflict
    const teacherConflict = conflicts.find(c => c.teacher_id === req.user.id);
    if (teacherConflict) {
      return res.status(400).json({
        success: false,
        message: 'Teacher has another class at this time'
      });
    }

    // Check room conflict
    const roomConflict = conflicts.find(c => c.room_id === new_room_id);
    if (roomConflict) {
      return res.status(400).json({
        success: false,
        message: 'Room is occupied at this time'
      });
    }

    // Check section conflict
    const sectionConflict = conflicts.find(c => c.section_id === block.section_id);
    if (sectionConflict) {
      return res.status(400).json({
        success: false,
        message: 'Section has another class at this time'
      });
    }

    // Update the block
    await pool.execute(
      'UPDATE blocks SET day = ?, time_slot_id = ?, room_id = ?, is_rescheduled = 1 WHERE id = ?',
      [new_day, new_time_slot_id, new_room_id, blockId]
    );

    // Log the reschedule action
    await pool.execute(
      'INSERT INTO audit_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'reschedule_class', JSON.stringify({
        block_id: blockId,
        old_day: block.day,
        new_day: new_day,
        old_time_slot_id: block.time_slot_id,
        new_time_slot_id: new_time_slot_id,
        old_room_id: block.room_id,
        new_room_id: new_room_id
      })]
    );

    res.json({
      success: true,
      message: 'Class rescheduled successfully'
    });
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reschedule class'
    });
  }
});

// Get instructor's notifications
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

module.exports = router;