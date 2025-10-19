const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { verifyToken, requireInstructor, requireAdminOrInstructor } = require('../middleware/auth');
const {
  sanitizeObject,
  successResponse,
  errorResponse,
  logAction,
  getCurrentDateTime,
  addMinutes
} = require('../utils/helpers');

const router = express.Router();

// Apply instructor authentication to all routes
router.use(verifyToken, requireInstructor);

// Get instructor dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const instructorId = req.user.id;

    const [
      totalCourses,
      acceptedCourses,
      pendingCourses,
      totalClasses,
      upcomingClasses,
      todayClasses
    ] = await Promise.all([
      Database.count('course_requests', 'instructor_id = ?', [instructorId]),
      Database.count('course_requests', 'instructor_id = ? AND status = ?', [instructorId, 'accepted']),
      Database.count('course_requests', 'instructor_id = ? AND status = ?', [instructorId, 'pending']),
      Database.count('blocks', 'teacher_id = ? AND is_active = ?', [instructorId, true]),
      Database.count('blocks b JOIN time_slots ts ON b.time_slot_id = ts.id', 
        'b.teacher_id = ? AND b.is_active = ? AND b.day >= DAYNAME(CURDATE())', [instructorId, true]),
      Database.count('blocks b JOIN time_slots ts ON b.time_slot_id = ts.id', 
        'b.teacher_id = ? AND b.is_active = ? AND b.day = DAYNAME(CURDATE())', [instructorId, true])
    ]);

    // Get today's schedule
    const todaySchedule = await Database.query(`
      SELECT 
        b.id, b.day,
        c.name as course_name, c.code as course_code,
        s.name as section_name,
        r.name as room_name,
        ts.slot_name, ts.start_time, ts.end_time,
        m.name as major_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      JOIN majors m ON c.major_id = m.id
      WHERE b.teacher_id = ? AND b.is_active = 1 AND b.day = DAYNAME(CURDATE())
      ORDER BY ts.start_time
    `, [instructorId]);

    const stats = {
      courses: {
        total: totalCourses,
        accepted: acceptedCourses,
        pending: pendingCourses
      },
      classes: {
        total: totalClasses,
        upcoming: upcomingClasses,
        today: todayClasses
      },
      todaySchedule
    };

    successResponse(res, stats, 'Instructor dashboard retrieved successfully');
  } catch (error) {
    console.error('Instructor dashboard error:', error);
    errorResponse(res, 'Failed to fetch dashboard data', 500);
  }
});

// Get course requests for instructor
router.get('/course-requests', async (req, res) => {
  try {
    const instructorId = req.user.id;
    const { status } = req.query;

    let whereClause = 'cr.instructor_id = ?';
    let whereParams = [instructorId];

    if (status) {
      whereClause += ' AND cr.status = ?';
      whereParams.push(status);
    }

    const requests = await Database.query(`
      SELECT 
        cr.id, cr.status, cr.preferences, cr.accepted_at, cr.can_undo, cr.undo_expires_at, cr.created_at,
        c.name as course_name, c.code as course_code, c.credit_hours, c.semester,
        s.name as section_name, s.student_strength, s.shift,
        m.name as major_name, m.code as major_code,
        p.name as program_name, p.code as program_code
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE ${whereClause}
      ORDER BY cr.created_at DESC
    `, whereParams);

    successResponse(res, requests, 'Course requests retrieved successfully');
  } catch (error) {
    console.error('Course requests fetch error:', error);
    errorResponse(res, 'Failed to fetch course requests', 500);
  }
});

// Accept course request
router.post('/accept-course/:requestId', [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  body('preferences.days').isArray().withMessage('Days must be an array'),
  body('preferences.time_slots').isArray().withMessage('Time slots must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { requestId } = req.params;
    const { preferences } = sanitizeObject(req.body);
    const instructorId = req.user.id;

    // Get course request
    const request = await Database.queryOne(`
      SELECT cr.*, c.credit_hours, c.is_lab
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      WHERE cr.id = ? AND cr.instructor_id = ?
    `, [requestId, instructorId]);

    if (!request) {
      return errorResponse(res, 'Course request not found', 404);
    }

    if (request.status !== 'pending') {
      return errorResponse(res, 'Course request already processed', 400);
    }

    // Validate preferences
    if (!preferences.days || !preferences.time_slots || 
        preferences.days.length === 0 || preferences.time_slots.length === 0) {
      return errorResponse(res, 'Please select at least one day and time slot', 400);
    }

    // Check for conflicts
    const conflicts = await Database.query(`
      SELECT b.day, ts.slot_name, ts.start_time, ts.end_time
      FROM blocks b
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.teacher_id = ? AND b.is_active = 1 
      AND b.day IN (${preferences.days.map(() => '?').join(',')})
      AND b.time_slot_id IN (${preferences.time_slots.map(() => '?').join(',')})
    `, [instructorId, ...preferences.days, ...preferences.time_slots]);

    if (conflicts.length > 0) {
      return errorResponse(res, 'Time slot conflicts detected', 409, {
        conflicts: conflicts.map(c => `${c.day} ${c.slot_name}`)
      });
    }

    // Update request status
    const acceptedAt = getCurrentDateTime();
    const undoExpiresAt = addMinutes(acceptedAt, 10); // 10 minutes to undo

    await Database.update('course_requests', {
      status: 'accepted',
      preferences: JSON.stringify(preferences),
      accepted_at: acceptedAt,
      can_undo: true,
      undo_expires_at: undoExpiresAt
    }, 'id = ?', [requestId]);

    // Log action
    await logAction(Database, instructorId, 'COURSE_ACCEPT', 'course_requests', requestId, 
      { status: 'pending' }, { status: 'accepted', preferences }, req);

    successResponse(res, {
      requestId,
      status: 'accepted',
      canUndo: true,
      undoExpiresAt
    }, 'Course accepted successfully. You have 10 minutes to undo this action.');

  } catch (error) {
    console.error('Course acceptance error:', error);
    errorResponse(res, 'Failed to accept course', 500);
  }
});

// Undo course acceptance (within 10 minutes)
router.post('/undo-course/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const instructorId = req.user.id;

    // Get course request
    const request = await Database.queryOne(`
      SELECT * FROM course_requests 
      WHERE id = ? AND instructor_id = ?
    `, [requestId, instructorId]);

    if (!request) {
      return errorResponse(res, 'Course request not found', 404);
    }

    if (request.status !== 'accepted') {
      return errorResponse(res, 'Course request is not accepted', 400);
    }

    if (!request.can_undo) {
      return errorResponse(res, 'Undo not allowed for this request', 400);
    }

    // Check if undo period has expired
    const now = new Date();
    const undoExpires = new Date(request.undo_expires_at);
    
    if (now > undoExpires) {
      // Update can_undo to false
      await Database.update('course_requests', { can_undo: false }, 'id = ?', [requestId]);
      return errorResponse(res, 'Undo period has expired', 400);
    }

    // Undo the acceptance
    await Database.update('course_requests', {
      status: 'pending',
      preferences: null,
      accepted_at: null,
      can_undo: false,
      undo_expires_at: null
    }, 'id = ?', [requestId]);

    // Remove any blocks that might have been created
    await Database.delete('blocks', 'teacher_id = ? AND course_id = ? AND section_id = ?', 
      [instructorId, request.course_id, request.section_id]);

    // Log action
    await logAction(Database, instructorId, 'COURSE_UNDO', 'course_requests', requestId, 
      { status: 'accepted' }, { status: 'pending' }, req);

    successResponse(res, {
      requestId,
      status: 'pending'
    }, 'Course acceptance undone successfully');

  } catch (error) {
    console.error('Course undo error:', error);
    errorResponse(res, 'Failed to undo course acceptance', 500);
  }
});

// Get instructor's timetable
router.get('/timetable', async (req, res) => {
  try {
    const instructorId = req.user.id;

    const timetable = await Database.query(`
      SELECT 
        b.id, b.day, b.block_type,
        c.name as course_name, c.code as course_code, c.credit_hours,
        s.name as section_name, s.student_strength,
        r.name as room_name, r.type as room_type,
        ts.slot_name, ts.start_time, ts.end_time, ts.duration_minutes,
        m.name as major_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      JOIN majors m ON c.major_id = m.id
      WHERE b.teacher_id = ? AND b.is_active = 1
      ORDER BY 
        FIELD(b.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        ts.start_time
    `, [instructorId]);

    // Group by days
    const groupedTimetable = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    days.forEach(day => {
      groupedTimetable[day] = timetable.filter(block => block.day === day);
    });

    successResponse(res, {
      timetable: groupedTimetable,
      totalClasses: timetable.length
    }, 'Timetable retrieved successfully');

  } catch (error) {
    console.error('Timetable fetch error:', error);
    errorResponse(res, 'Failed to fetch timetable', 500);
  }
});

// Reschedule a class
router.post('/reschedule/:blockId', [
  body('new_day').isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).withMessage('Invalid day'),
  body('new_time_slot_id').isInt({ min: 1 }).withMessage('Valid time slot ID is required'),
  body('new_room_id').optional().isInt({ min: 1 }).withMessage('Valid room ID is required'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { blockId } = req.params;
    const { new_day, new_time_slot_id, new_room_id, reason } = sanitizeObject(req.body);
    const instructorId = req.user.id;

    // Get current block
    const block = await Database.queryOne(`
      SELECT b.*, c.name as course_name, s.name as section_name, r.name as room_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ? AND b.teacher_id = ?
    `, [blockId, instructorId]);

    if (!block) {
      return errorResponse(res, 'Class not found', 404);
    }

    // Check for conflicts with new schedule
    const conflicts = await Database.query(`
      SELECT 'teacher' as type, u.name as name
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      WHERE b.teacher_id = ? AND b.day = ? AND b.time_slot_id = ? AND b.id != ? AND b.is_active = 1
      
      UNION ALL
      
      SELECT 'room' as type, r.name as name
      FROM blocks b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.room_id = ? AND b.day = ? AND b.time_slot_id = ? AND b.id != ? AND b.is_active = 1
      
      UNION ALL
      
      SELECT 'section' as type, s.name as name
      FROM blocks b
      JOIN sections s ON b.section_id = s.id
      WHERE b.section_id = ? AND b.day = ? AND b.time_slot_id = ? AND b.id != ? AND b.is_active = 1
    `, [
      instructorId, new_day, new_time_slot_id, blockId,
      new_room_id || block.room_id, new_day, new_time_slot_id, blockId,
      block.section_id, new_day, new_time_slot_id, blockId
    ]);

    if (conflicts.length > 0) {
      return errorResponse(res, 'Schedule conflicts detected', 409, {
        conflicts: conflicts.map(c => `${c.type}: ${c.name}`)
      });
    }

    // Update block
    const updateData = {
      day: new_day,
      time_slot_id: new_time_slot_id
    };

    if (new_room_id) {
      updateData.room_id = new_room_id;
    }

    await Database.update('blocks', updateData, 'id = ?', [blockId]);

    // Get updated block details
    const updatedBlock = await Database.queryOne(`
      SELECT 
        b.*, 
        c.name as course_name, c.code as course_code,
        s.name as section_name,
        r.name as room_name,
        ts.slot_name, ts.start_time, ts.end_time
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.id = ?
    `, [blockId]);

    // Log action
    await logAction(Database, instructorId, 'CLASS_RESCHEDULE', 'blocks', blockId, 
      block, updatedBlock, req);

    // TODO: Send notifications to students about the reschedule

    successResponse(res, updatedBlock, 'Class rescheduled successfully');

  } catch (error) {
    console.error('Class reschedule error:', error);
    errorResponse(res, 'Failed to reschedule class', 500);
  }
});

// Get instructor preferences
router.get('/preferences', async (req, res) => {
  try {
    const instructorId = req.user.id;

    const preferences = await Database.queryOne(`
      SELECT * FROM instructor_preferences WHERE instructor_id = ?
    `, [instructorId]);

    if (!preferences) {
      // Return default preferences
      return successResponse(res, {
        instructor_id: instructorId,
        preferred_days: [],
        preferred_time_slots: [],
        max_daily_hours: 8,
        specialization: '',
        availability_notes: ''
      }, 'Default preferences retrieved');
    }

    successResponse(res, preferences, 'Preferences retrieved successfully');
  } catch (error) {
    console.error('Preferences fetch error:', error);
    errorResponse(res, 'Failed to fetch preferences', 500);
  }
});

// Update instructor preferences
router.put('/preferences', [
  body('preferred_days').optional().isArray().withMessage('Preferred days must be an array'),
  body('preferred_time_slots').optional().isArray().withMessage('Preferred time slots must be an array'),
  body('max_daily_hours').optional().isInt({ min: 1, max: 12 }).withMessage('Max daily hours must be 1-12'),
  body('specialization').optional().trim().isLength({ max: 500 }).withMessage('Specialization too long'),
  body('availability_notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const instructorId = req.user.id;
    const { preferred_days, preferred_time_slots, max_daily_hours, specialization, availability_notes } = sanitizeObject(req.body);

    // Check if preferences exist
    const existingPreferences = await Database.queryOne(`
      SELECT id FROM instructor_preferences WHERE instructor_id = ?
    `, [instructorId]);

    const preferencesData = {
      instructor_id: instructorId,
      preferred_days: preferred_days ? JSON.stringify(preferred_days) : null,
      preferred_time_slots: preferred_time_slots ? JSON.stringify(preferred_time_slots) : null,
      max_daily_hours: max_daily_hours || 8,
      specialization: specialization || '',
      availability_notes: availability_notes || ''
    };

    if (existingPreferences) {
      // Update existing preferences
      delete preferencesData.instructor_id; // Don't update the instructor_id
      await Database.update('instructor_preferences', preferencesData, 'instructor_id = ?', [instructorId]);
    } else {
      // Create new preferences
      await Database.insert('instructor_preferences', preferencesData);
    }

    // Log action
    await logAction(Database, instructorId, 'PREFERENCES_UPDATE', 'instructor_preferences', instructorId, 
      existingPreferences, preferencesData, req);

    successResponse(res, preferencesData, 'Preferences updated successfully');

  } catch (error) {
    console.error('Preferences update error:', error);
    errorResponse(res, 'Failed to update preferences', 500);
  }
});

module.exports = router;