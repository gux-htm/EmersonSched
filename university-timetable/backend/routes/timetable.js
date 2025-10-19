const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { verifyToken, requireAdmin, requireAdminOrInstructor } = require('../middleware/auth');
const {
  sanitizeObject,
  successResponse,
  errorResponse,
  logAction,
  parseCreditHours,
  hasTimeConflict
} = require('../utils/helpers');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Generate course requests (Admin only)
router.post('/generate-requests', requireAdmin, async (req, res) => {
  try {
    // Clear existing pending requests
    await Database.delete('course_requests', 'status = ?', ['pending']);

    // Get all courses with their sections
    const courseSections = await Database.query(`
      SELECT 
        c.id as course_id, c.name as course_name, c.code as course_code, c.credit_hours,
        s.id as section_id, s.name as section_name, s.shift,
        m.name as major_name, p.name as program_name
      FROM courses c
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      JOIN sections s ON s.major_id = m.id AND s.semester = c.semester
      ORDER BY p.name, m.name, c.semester, c.name
    `);

    // Create course requests for each course-section combination
    let requestCount = 0;
    for (const cs of courseSections) {
      await Database.insert('course_requests', {
        course_id: cs.course_id,
        section_id: cs.section_id,
        status: 'pending'
      });
      requestCount++;
    }

    // Log action
    await logAction(Database, req.user.id, 'COURSE_REQUESTS_GENERATE', 'course_requests', 'bulk', 
      null, { requestCount }, req);

    successResponse(res, {
      requestCount,
      courseSections: courseSections.length
    }, 'Course requests generated successfully', 201);

  } catch (error) {
    console.error('Course requests generation error:', error);
    errorResponse(res, 'Failed to generate course requests', 500);
  }
});

// Get course requests with filters (Admin only)
router.get('/course-requests', requireAdmin, async (req, res) => {
  try {
    const { status, instructor_id, major_id } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (status) {
      whereClause = 'WHERE cr.status = ?';
      whereParams.push(status);
    }

    if (instructor_id) {
      whereClause += whereClause ? ' AND cr.instructor_id = ?' : 'WHERE cr.instructor_id = ?';
      whereParams.push(instructor_id);
    }

    if (major_id) {
      whereClause += whereClause ? ' AND m.id = ?' : 'WHERE m.id = ?';
      whereParams.push(major_id);
    }

    const requests = await Database.query(`
      SELECT 
        cr.id, cr.status, cr.preferences, cr.accepted_at, cr.can_undo, cr.undo_expires_at, cr.created_at,
        c.name as course_name, c.code as course_code, c.credit_hours, c.semester,
        s.name as section_name, s.student_strength, s.shift,
        m.name as major_name, m.code as major_code,
        p.name as program_name, p.code as program_code,
        u.name as instructor_name, u.email as instructor_email
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      ${whereClause}
      ORDER BY cr.created_at DESC
    `, whereParams);

    // Group by status for summary
    const summary = {
      pending: requests.filter(r => r.status === 'pending').length,
      accepted: requests.filter(r => r.status === 'accepted').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length
    };

    successResponse(res, {
      requests,
      summary
    }, 'Course requests retrieved successfully');

  } catch (error) {
    console.error('Course requests fetch error:', error);
    errorResponse(res, 'Failed to fetch course requests', 500);
  }
});

// Assign instructor to course request (Admin only)
router.put('/course-requests/:id/assign', requireAdmin, [
  body('instructor_id').isUUID().withMessage('Valid instructor ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { instructor_id } = sanitizeObject(req.body);

    // Verify course request exists
    const request = await Database.queryOne(`
      SELECT cr.*, c.name as course_name, s.name as section_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      WHERE cr.id = ?
    `, [id]);

    if (!request) {
      return errorResponse(res, 'Course request not found', 404);
    }

    // Verify instructor exists and is approved
    const instructor = await Database.queryOne(`
      SELECT id, name, email FROM users 
      WHERE id = ? AND role = 'instructor' AND status = 'approved'
    `, [instructor_id]);

    if (!instructor) {
      return errorResponse(res, 'Instructor not found or not approved', 404);
    }

    // Update course request
    await Database.update('course_requests', {
      instructor_id,
      status: 'pending' // Reset to pending for instructor to accept
    }, 'id = ?', [id]);

    // Log action
    await logAction(Database, req.user.id, 'COURSE_REQUEST_ASSIGN', 'course_requests', id, 
      { instructor_id: request.instructor_id }, { instructor_id }, req);

    successResponse(res, {
      requestId: id,
      instructorName: instructor.name,
      courseName: request.course_name,
      sectionName: request.section_name
    }, 'Instructor assigned to course request successfully');

  } catch (error) {
    console.error('Course request assignment error:', error);
    errorResponse(res, 'Failed to assign instructor', 500);
  }
});

// Generate timetable using Block Theory algorithm (Admin only)
router.post('/generate', requireAdmin, async (req, res) => {
  try {
    // Get all accepted course requests with preferences
    const acceptedRequests = await Database.query(`
      SELECT 
        cr.id, cr.course_id, cr.section_id, cr.instructor_id, cr.preferences,
        c.credit_hours, c.is_lab, c.name as course_name,
        s.shift, s.name as section_name,
        u.name as instructor_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN users u ON cr.instructor_id = u.id
      WHERE cr.status = 'accepted' AND cr.preferences IS NOT NULL
    `);

    if (acceptedRequests.length === 0) {
      return errorResponse(res, 'No accepted course requests with preferences found', 400);
    }

    // Clear existing active blocks
    await Database.update('blocks', { is_active: false }, 'is_active = ?', [true]);

    let blocksCreated = 0;
    let conflicts = [];

    // Process each accepted request
    for (const request of acceptedRequests) {
      try {
        const preferences = JSON.parse(request.preferences);
        const creditInfo = parseCreditHours(request.credit_hours);
        
        // Get available rooms for this shift and course type
        const availableRooms = await Database.query(`
          SELECT id, name, type, capacity FROM rooms 
          WHERE is_available = 1 AND type = ?
          ORDER BY capacity DESC
        `, [request.is_lab ? 'lab' : 'lecture']);

        if (availableRooms.length === 0) {
          conflicts.push({
            course: request.course_name,
            section: request.section_name,
            instructor: request.instructor_name,
            issue: 'No available rooms'
          });
          continue;
        }

        // Get time slots for this shift
        const timeSlots = await Database.query(`
          SELECT id, start_time, end_time FROM time_slots 
          WHERE shift = ? AND id IN (${preferences.time_slots.map(() => '?').join(',')})
          ORDER BY start_time
        `, [request.shift, ...preferences.time_slots]);

        // Calculate required slots based on credit hours
        let theorySlots = creditInfo.theory;
        let labSlots = creditInfo.lab;

        // Assign theory slots
        let slotsAssigned = 0;
        for (const day of preferences.days) {
          if (slotsAssigned >= theorySlots) break;

          for (const timeSlot of timeSlots) {
            if (slotsAssigned >= theorySlots) break;

            // Check for conflicts
            const conflictCheck = await Database.query(`
              SELECT COUNT(*) as count FROM blocks 
              WHERE (teacher_id = ? OR section_id = ? OR room_id = ?) 
              AND day = ? AND time_slot_id = ? AND is_active = 1
            `, [request.instructor_id, request.section_id, availableRooms[0].id, day, timeSlot.id]);

            if (conflictCheck[0].count === 0) {
              // No conflict, create block
              await Database.insert('blocks', {
                teacher_id: request.instructor_id,
                course_id: request.course_id,
                section_id: request.section_id,
                room_id: availableRooms[0].id,
                day: day,
                time_slot_id: timeSlot.id,
                shift: request.shift,
                block_type: 'theory',
                is_active: true
              });

              blocksCreated++;
              slotsAssigned++;
            }
          }
        }

        // Assign lab slots if needed
        if (labSlots > 0) {
          const labRooms = await Database.query(`
            SELECT id, name, type, capacity FROM rooms 
            WHERE is_available = 1 AND type = 'lab'
            ORDER BY capacity DESC
          `);

          if (labRooms.length > 0) {
            let labSlotsAssigned = 0;
            for (const day of preferences.days) {
              if (labSlotsAssigned >= labSlots) break;

              for (const timeSlot of timeSlots) {
                if (labSlotsAssigned >= labSlots) break;

                const conflictCheck = await Database.query(`
                  SELECT COUNT(*) as count FROM blocks 
                  WHERE (teacher_id = ? OR section_id = ? OR room_id = ?) 
                  AND day = ? AND time_slot_id = ? AND is_active = 1
                `, [request.instructor_id, request.section_id, labRooms[0].id, day, timeSlot.id]);

                if (conflictCheck[0].count === 0) {
                  await Database.insert('blocks', {
                    teacher_id: request.instructor_id,
                    course_id: request.course_id,
                    section_id: request.section_id,
                    room_id: labRooms[0].id,
                    day: day,
                    time_slot_id: timeSlot.id,
                    shift: request.shift,
                    block_type: 'lab',
                    is_active: true
                  });

                  blocksCreated++;
                  labSlotsAssigned++;
                }
              }
            }
          }
        }

      } catch (error) {
        console.error(`Error processing request ${request.id}:`, error);
        conflicts.push({
          course: request.course_name,
          section: request.section_name,
          instructor: request.instructor_name,
          issue: error.message
        });
      }
    }

    // Log action
    await logAction(Database, req.user.id, 'TIMETABLE_GENERATE', 'blocks', 'bulk', 
      null, { blocksCreated, conflicts: conflicts.length }, req);

    successResponse(res, {
      blocksCreated,
      totalRequests: acceptedRequests.length,
      conflicts,
      success: conflicts.length === 0
    }, 'Timetable generation completed');

  } catch (error) {
    console.error('Timetable generation error:', error);
    errorResponse(res, 'Failed to generate timetable', 500);
  }
});

// Get complete timetable
router.get('/view', requireAdminOrInstructor, async (req, res) => {
  try {
    const { section_id, instructor_id, room_id, day, shift } = req.query;

    let whereClause = 'b.is_active = 1';
    let whereParams = [];

    if (section_id) {
      whereClause += ' AND b.section_id = ?';
      whereParams.push(section_id);
    }

    if (instructor_id) {
      whereClause += ' AND b.teacher_id = ?';
      whereParams.push(instructor_id);
    }

    if (room_id) {
      whereClause += ' AND b.room_id = ?';
      whereParams.push(room_id);
    }

    if (day) {
      whereClause += ' AND b.day = ?';
      whereParams.push(day);
    }

    if (shift) {
      whereClause += ' AND b.shift = ?';
      whereParams.push(shift);
    }

    const timetable = await Database.query(`
      SELECT 
        b.id, b.day, b.shift, b.block_type,
        c.name as course_name, c.code as course_code, c.credit_hours,
        s.name as section_name, s.student_strength,
        r.name as room_name, r.type as room_type, r.capacity,
        ts.slot_name, ts.start_time, ts.end_time, ts.duration_minutes,
        u.name as instructor_name, u.email as instructor_email,
        m.name as major_name, p.name as program_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      JOIN users u ON b.teacher_id = u.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE ${whereClause}
      ORDER BY 
        FIELD(b.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        ts.start_time, s.name
    `, whereParams);

    // Group by days and shifts
    const groupedTimetable = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shifts = ['morning', 'evening', 'weekend'];
    
    shifts.forEach(shift => {
      groupedTimetable[shift] = {};
      days.forEach(day => {
        groupedTimetable[shift][day] = timetable.filter(block => 
          block.day === day && block.shift === shift
        );
      });
    });

    // Get statistics
    const stats = {
      totalBlocks: timetable.length,
      byShift: {
        morning: timetable.filter(b => b.shift === 'morning').length,
        evening: timetable.filter(b => b.shift === 'evening').length,
        weekend: timetable.filter(b => b.shift === 'weekend').length
      },
      byType: {
        theory: timetable.filter(b => b.block_type === 'theory').length,
        lab: timetable.filter(b => b.block_type === 'lab').length
      }
    };

    successResponse(res, {
      timetable: groupedTimetable,
      stats
    }, 'Timetable retrieved successfully');

  } catch (error) {
    console.error('Timetable fetch error:', error);
    errorResponse(res, 'Failed to fetch timetable', 500);
  }
});

// Get conflicts in current timetable (Admin only)
router.get('/conflicts', requireAdmin, async (req, res) => {
  try {
    // Find teacher conflicts
    const teacherConflicts = await Database.query(`
      SELECT 
        u.name as instructor_name,
        b.day, ts.slot_name, ts.start_time, ts.end_time,
        GROUP_CONCAT(CONCAT(c.code, ' - ', s.name) SEPARATOR ', ') as conflicting_classes,
        COUNT(*) as conflict_count
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.is_active = 1
      GROUP BY b.teacher_id, b.day, b.time_slot_id
      HAVING COUNT(*) > 1
    `);

    // Find room conflicts
    const roomConflicts = await Database.query(`
      SELECT 
        r.name as room_name,
        b.day, ts.slot_name, ts.start_time, ts.end_time,
        GROUP_CONCAT(CONCAT(c.code, ' - ', s.name, ' (', u.name, ')') SEPARATOR ', ') as conflicting_classes,
        COUNT(*) as conflict_count
      FROM blocks b
      JOIN rooms r ON b.room_id = r.id
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN users u ON b.teacher_id = u.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.is_active = 1
      GROUP BY b.room_id, b.day, b.time_slot_id
      HAVING COUNT(*) > 1
    `);

    // Find section conflicts
    const sectionConflicts = await Database.query(`
      SELECT 
        s.name as section_name,
        b.day, ts.slot_name, ts.start_time, ts.end_time,
        GROUP_CONCAT(CONCAT(c.code, ' (', u.name, ')') SEPARATOR ', ') as conflicting_classes,
        COUNT(*) as conflict_count
      FROM blocks b
      JOIN sections s ON b.section_id = s.id
      JOIN courses c ON b.course_id = c.id
      JOIN users u ON b.teacher_id = u.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.is_active = 1
      GROUP BY b.section_id, b.day, b.time_slot_id
      HAVING COUNT(*) > 1
    `);

    const conflicts = {
      teachers: teacherConflicts,
      rooms: roomConflicts,
      sections: sectionConflicts,
      summary: {
        totalConflicts: teacherConflicts.length + roomConflicts.length + sectionConflicts.length,
        teacherConflicts: teacherConflicts.length,
        roomConflicts: roomConflicts.length,
        sectionConflicts: sectionConflicts.length
      }
    };

    successResponse(res, conflicts, 'Conflicts retrieved successfully');

  } catch (error) {
    console.error('Conflicts fetch error:', error);
    errorResponse(res, 'Failed to fetch conflicts', 500);
  }
});

// Reset timetable (Admin only)
router.post('/reset', requireAdmin, [
  body('reset_type').isIn(['time_slots', 'assignments', 'full']).withMessage('Invalid reset type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { reset_type } = sanitizeObject(req.body);
    let resetActions = [];

    switch (reset_type) {
      case 'time_slots':
        // Clear time slots only
        await Database.delete('time_slots', '1=1');
        resetActions.push('Time slots cleared');
        break;

      case 'assignments':
        // Clear blocks and course request assignments
        await Database.update('blocks', { is_active: false }, 'is_active = ?', [true]);
        await Database.update('course_requests', 
          { instructor_id: null, status: 'pending', preferences: null, accepted_at: null, can_undo: false, undo_expires_at: null },
          'status IN (?, ?)', ['accepted', 'rejected']);
        resetActions.push('Course assignments cleared', 'Timetable blocks deactivated');
        break;

      case 'full':
        // Full reset - everything
        await Database.delete('time_slots', '1=1');
        await Database.delete('blocks', '1=1');
        await Database.delete('course_requests', '1=1');
        await Database.delete('exams', '1=1');
        resetActions.push('Complete system reset performed');
        break;
    }

    // Log action
    await logAction(Database, req.user.id, 'TIMETABLE_RESET', 'system', reset_type, 
      null, { reset_type, actions: resetActions }, req);

    successResponse(res, {
      resetType: reset_type,
      actions: resetActions
    }, 'Reset completed successfully');

  } catch (error) {
    console.error('Timetable reset error:', error);
    errorResponse(res, 'Failed to reset timetable', 500);
  }
});

module.exports = router;