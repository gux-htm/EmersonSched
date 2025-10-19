const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { verifyToken, requireAdmin, requireAdminOrInstructor } = require('../middleware/auth');
const {
  sanitizeObject,
  successResponse,
  errorResponse,
  logAction,
  formatDate,
  formatTime
} = require('../utils/helpers');

const router = express.Router();

// Apply authentication to all routes
router.use(verifyToken);

// Create exam session (Admin only)
router.post('/sessions', requireAdmin, [
  body('exam_type').isIn(['midterm', 'final', 'supplementary', 'quiz']).withMessage('Invalid exam type'),
  body('start_date').isISO8601().withMessage('Valid start date is required'),
  body('end_date').isISO8601().withMessage('Valid end date is required'),
  body('start_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
  body('end_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time is required'),
  body('duration_minutes').isInt({ min: 30, max: 300 }).withMessage('Duration must be 30-300 minutes'),
  body('mode').isIn(['match', 'shuffle']).withMessage('Mode must be match or shuffle')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const {
      exam_type,
      start_date,
      end_date,
      start_time,
      end_time,
      duration_minutes,
      mode,
      courses // Array of course IDs to schedule exams for
    } = sanitizeObject(req.body);

    // Validate date range
    if (new Date(start_date) > new Date(end_date)) {
      return errorResponse(res, 'Start date must be before end date', 400);
    }

    // Get courses to schedule exams for
    let coursesToSchedule = [];
    if (courses && courses.length > 0) {
      coursesToSchedule = await Database.query(`
        SELECT 
          c.id as course_id, c.name as course_name, c.code as course_code,
          s.id as section_id, s.name as section_name,
          b.teacher_id as instructor_id
        FROM courses c
        JOIN sections s ON s.major_id = c.major_id AND s.semester = c.semester
        LEFT JOIN blocks b ON b.course_id = c.id AND b.section_id = s.id AND b.is_active = 1
        WHERE c.id IN (${courses.map(() => '?').join(',')})
        GROUP BY c.id, s.id
      `, courses);
    } else {
      // Get all active courses with their sections and assigned instructors
      coursesToSchedule = await Database.query(`
        SELECT 
          c.id as course_id, c.name as course_name, c.code as course_code,
          s.id as section_id, s.name as section_name,
          b.teacher_id as instructor_id
        FROM courses c
        JOIN sections s ON s.major_id = c.major_id AND s.semester = c.semester
        JOIN blocks b ON b.course_id = c.id AND b.section_id = s.id AND b.is_active = 1
        GROUP BY c.id, s.id
      `);
    }

    if (coursesToSchedule.length === 0) {
      return errorResponse(res, 'No courses found to schedule exams for', 400);
    }

    // Get available rooms
    const availableRooms = await Database.query(`
      SELECT id, name, capacity FROM rooms 
      WHERE is_available = 1 AND type IN ('lecture', 'seminar')
      ORDER BY capacity DESC
    `);

    if (availableRooms.length === 0) {
      return errorResponse(res, 'No available rooms for exams', 400);
    }

    // Get available instructors for shuffle mode
    let availableInstructors = [];
    if (mode === 'shuffle') {
      availableInstructors = await Database.query(`
        SELECT DISTINCT u.id, u.name 
        FROM users u
        JOIN blocks b ON u.id = b.teacher_id
        WHERE u.role = 'instructor' AND u.status = 'approved' AND b.is_active = 1
      `);
    }

    // Generate exam schedule
    let examsCreated = 0;
    let conflicts = [];
    let currentDate = new Date(start_date);
    const endDateObj = new Date(end_date);

    // Create time slots for exam period
    const examTimeSlots = [];
    let currentTime = start_time;
    while (currentTime < end_time) {
      examTimeSlots.push(currentTime);
      // Add duration + 30 minutes break
      const [hours, minutes] = currentTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + duration_minutes + 30;
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      currentTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
      
      if (currentTime >= end_time) break;
    }

    let courseIndex = 0;
    let instructorIndex = 0;

    while (currentDate <= endDateObj && courseIndex < coursesToSchedule.length) {
      // Skip weekends for regular exams
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      for (const timeSlot of examTimeSlots) {
        if (courseIndex >= coursesToSchedule.length) break;

        const course = coursesToSchedule[courseIndex];
        
        // Determine invigilator
        let invigilatorId;
        if (mode === 'match' && course.instructor_id) {
          invigilatorId = course.instructor_id;
        } else if (mode === 'shuffle' && availableInstructors.length > 0) {
          invigilatorId = availableInstructors[instructorIndex % availableInstructors.length].id;
          instructorIndex++;
        } else {
          conflicts.push({
            course: course.course_name,
            section: course.section_name,
            issue: 'No invigilator available'
          });
          courseIndex++;
          continue;
        }

        // Find available room
        let assignedRoom = null;
        for (const room of availableRooms) {
          // Check if room is available at this time
          const roomConflict = await Database.queryOne(`
            SELECT id FROM exams 
            WHERE room_id = ? AND exam_date = ? AND start_time = ?
          `, [room.id, formatDate(currentDate), timeSlot]);

          if (!roomConflict) {
            assignedRoom = room;
            break;
          }
        }

        if (!assignedRoom) {
          conflicts.push({
            course: course.course_name,
            section: course.section_name,
            issue: 'No available room'
          });
          courseIndex++;
          continue;
        }

        // Check invigilator availability
        const invigilatorConflict = await Database.queryOne(`
          SELECT id FROM exams 
          WHERE invigilator_id = ? AND exam_date = ? AND start_time = ?
        `, [invigilatorId, formatDate(currentDate), timeSlot]);

        if (invigilatorConflict) {
          conflicts.push({
            course: course.course_name,
            section: course.section_name,
            issue: 'Invigilator not available'
          });
          courseIndex++;
          continue;
        }

        // Calculate end time
        const [startHours, startMinutes] = timeSlot.split(':').map(Number);
        const endTotalMinutes = startHours * 60 + startMinutes + duration_minutes;
        const endHours = Math.floor(endTotalMinutes / 60);
        const endMinutesCalc = endTotalMinutes % 60;
        const examEndTime = `${endHours.toString().padStart(2, '0')}:${endMinutesCalc.toString().padStart(2, '0')}:00`;

        // Create exam
        try {
          await Database.insert('exams', {
            course_id: course.course_id,
            section_id: course.section_id,
            room_id: assignedRoom.id,
            invigilator_id: invigilatorId,
            exam_type,
            exam_date: formatDate(currentDate),
            start_time: timeSlot + ':00',
            end_time: examEndTime,
            duration_minutes,
            mode
          });

          examsCreated++;
          courseIndex++;

        } catch (error) {
          console.error('Error creating exam:', error);
          conflicts.push({
            course: course.course_name,
            section: course.section_name,
            issue: error.message
          });
          courseIndex++;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Log action
    await logAction(Database, req.user.id, 'EXAM_SESSION_CREATE', 'exams', 'bulk', 
      null, { exam_type, examsCreated, conflicts: conflicts.length }, req);

    successResponse(res, {
      examsCreated,
      totalCourses: coursesToSchedule.length,
      conflicts,
      success: conflicts.length === 0
    }, 'Exam session created successfully', 201);

  } catch (error) {
    console.error('Exam session creation error:', error);
    errorResponse(res, 'Failed to create exam session', 500);
  }
});

// Get exams
router.get('/', requireAdminOrInstructor, async (req, res) => {
  try {
    const { exam_type, exam_date, section_id, instructor_id, upcoming } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (exam_type) {
      whereClause = 'WHERE e.exam_type = ?';
      whereParams.push(exam_type);
    }

    if (exam_date) {
      whereClause += whereClause ? ' AND e.exam_date = ?' : 'WHERE e.exam_date = ?';
      whereParams.push(exam_date);
    }

    if (section_id) {
      whereClause += whereClause ? ' AND e.section_id = ?' : 'WHERE e.section_id = ?';
      whereParams.push(section_id);
    }

    if (instructor_id) {
      whereClause += whereClause ? ' AND e.invigilator_id = ?' : 'WHERE e.invigilator_id = ?';
      whereParams.push(instructor_id);
    }

    if (upcoming === 'true') {
      whereClause += whereClause ? ' AND e.exam_date >= CURDATE()' : 'WHERE e.exam_date >= CURDATE()';
    }

    const exams = await Database.query(`
      SELECT 
        e.id, e.exam_type, e.exam_date, e.start_time, e.end_time, e.duration_minutes, e.mode,
        c.name as course_name, c.code as course_code,
        s.name as section_name, s.student_strength,
        r.name as room_name, r.capacity,
        u.name as invigilator_name, u.email as invigilator_email,
        m.name as major_name, p.name as program_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON e.section_id = s.id
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY e.exam_date, e.start_time
    `, whereParams);

    // Group by date for better organization
    const groupedExams = {};
    exams.forEach(exam => {
      const date = exam.exam_date;
      if (!groupedExams[date]) {
        groupedExams[date] = [];
      }
      groupedExams[date].push(exam);
    });

    successResponse(res, {
      exams: groupedExams,
      totalExams: exams.length
    }, 'Exams retrieved successfully');

  } catch (error) {
    console.error('Exams fetch error:', error);
    errorResponse(res, 'Failed to fetch exams', 500);
  }
});

// Update exam (Admin only)
router.put('/:id', requireAdmin, [
  body('exam_date').optional().isISO8601().withMessage('Valid exam date is required'),
  body('start_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time is required'),
  body('room_id').optional().isInt({ min: 1 }).withMessage('Valid room ID is required'),
  body('invigilator_id').optional().isUUID().withMessage('Valid invigilator ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = sanitizeObject(req.body);

    // Get current exam
    const currentExam = await Database.findById('exams', id);
    if (!currentExam) {
      return errorResponse(res, 'Exam not found', 404);
    }

    // Validate conflicts if updating date, time, room, or invigilator
    if (updateData.exam_date || updateData.start_time || updateData.room_id || updateData.invigilator_id) {
      const checkDate = updateData.exam_date || currentExam.exam_date;
      const checkTime = updateData.start_time ? updateData.start_time + ':00' : currentExam.start_time;
      const checkRoom = updateData.room_id || currentExam.room_id;
      const checkInvigilator = updateData.invigilator_id || currentExam.invigilator_id;

      // Check room conflict
      if (updateData.room_id || updateData.exam_date || updateData.start_time) {
        const roomConflict = await Database.queryOne(`
          SELECT id FROM exams 
          WHERE room_id = ? AND exam_date = ? AND start_time = ? AND id != ?
        `, [checkRoom, checkDate, checkTime, id]);

        if (roomConflict) {
          return errorResponse(res, 'Room is not available at the specified time', 409);
        }
      }

      // Check invigilator conflict
      if (updateData.invigilator_id || updateData.exam_date || updateData.start_time) {
        const invigilatorConflict = await Database.queryOne(`
          SELECT id FROM exams 
          WHERE invigilator_id = ? AND exam_date = ? AND start_time = ? AND id != ?
        `, [checkInvigilator, checkDate, checkTime, id]);

        if (invigilatorConflict) {
          return errorResponse(res, 'Invigilator is not available at the specified time', 409);
        }
      }
    }

    // Update end time if start time or duration is changed
    if (updateData.start_time || updateData.duration_minutes) {
      const startTime = updateData.start_time || formatTime(currentExam.start_time);
      const duration = updateData.duration_minutes || currentExam.duration_minutes;
      
      const [hours, minutes] = startTime.split(':').map(Number);
      const endTotalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      updateData.end_time = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;
    }

    // Convert start_time to proper format if provided
    if (updateData.start_time) {
      updateData.start_time = updateData.start_time + ':00';
    }

    await Database.update('exams', updateData, 'id = ?', [id]);

    // Get updated exam
    const updatedExam = await Database.queryOne(`
      SELECT 
        e.*, 
        c.name as course_name, c.code as course_code,
        s.name as section_name,
        r.name as room_name,
        u.name as invigilator_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON e.section_id = s.id
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      WHERE e.id = ?
    `, [id]);

    // Log action
    await logAction(Database, req.user.id, 'EXAM_UPDATE', 'exams', id, currentExam, updatedExam, req);

    successResponse(res, updatedExam, 'Exam updated successfully');

  } catch (error) {
    console.error('Exam update error:', error);
    errorResponse(res, 'Failed to update exam', 500);
  }
});

// Delete exam (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get exam details for logging
    const exam = await Database.queryOne(`
      SELECT e.*, c.name as course_name, s.name as section_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON e.section_id = s.id
      WHERE e.id = ?
    `, [id]);

    if (!exam) {
      return errorResponse(res, 'Exam not found', 404);
    }

    await Database.delete('exams', 'id = ?', [id]);

    // Log action
    await logAction(Database, req.user.id, 'EXAM_DELETE', 'exams', id, exam, null, req);

    successResponse(res, null, 'Exam deleted successfully');

  } catch (error) {
    console.error('Exam deletion error:', error);
    errorResponse(res, 'Failed to delete exam', 500);
  }
});

// Get exam conflicts (Admin only)
router.get('/conflicts', requireAdmin, async (req, res) => {
  try {
    // Find room conflicts
    const roomConflicts = await Database.query(`
      SELECT 
        r.name as room_name,
        e.exam_date, e.start_time, e.end_time,
        GROUP_CONCAT(CONCAT(c.code, ' - ', s.name) SEPARATOR ', ') as conflicting_exams,
        COUNT(*) as conflict_count
      FROM exams e
      JOIN rooms r ON e.room_id = r.id
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON e.section_id = s.id
      GROUP BY e.room_id, e.exam_date, e.start_time
      HAVING COUNT(*) > 1
    `);

    // Find invigilator conflicts
    const invigilatorConflicts = await Database.query(`
      SELECT 
        u.name as invigilator_name,
        e.exam_date, e.start_time, e.end_time,
        GROUP_CONCAT(CONCAT(c.code, ' - ', s.name) SEPARATOR ', ') as conflicting_exams,
        COUNT(*) as conflict_count
      FROM exams e
      JOIN users u ON e.invigilator_id = u.id
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON e.section_id = s.id
      GROUP BY e.invigilator_id, e.exam_date, e.start_time
      HAVING COUNT(*) > 1
    `);

    const conflicts = {
      rooms: roomConflicts,
      invigilators: invigilatorConflicts,
      summary: {
        totalConflicts: roomConflicts.length + invigilatorConflicts.length,
        roomConflicts: roomConflicts.length,
        invigilatorConflicts: invigilatorConflicts.length
      }
    };

    successResponse(res, conflicts, 'Exam conflicts retrieved successfully');

  } catch (error) {
    console.error('Exam conflicts fetch error:', error);
    errorResponse(res, 'Failed to fetch exam conflicts', 500);
  }
});

// Reset exams (Admin only)
router.post('/reset', requireAdmin, [
  body('reset_type').isIn(['all', 'type']).withMessage('Invalid reset type'),
  body('exam_type').optional().isIn(['midterm', 'final', 'supplementary', 'quiz']).withMessage('Invalid exam type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { reset_type, exam_type } = sanitizeObject(req.body);
    let deletedCount = 0;

    if (reset_type === 'all') {
      // Delete all exams
      const result = await Database.delete('exams', '1=1');
      deletedCount = result.affectedRows;
    } else if (reset_type === 'type' && exam_type) {
      // Delete exams of specific type
      const result = await Database.delete('exams', 'exam_type = ?', [exam_type]);
      deletedCount = result.affectedRows;
    }

    // Log action
    await logAction(Database, req.user.id, 'EXAM_RESET', 'exams', reset_type, 
      null, { reset_type, exam_type, deletedCount }, req);

    successResponse(res, {
      resetType: reset_type,
      examType: exam_type,
      deletedCount
    }, 'Exam reset completed successfully');

  } catch (error) {
    console.error('Exam reset error:', error);
    errorResponse(res, 'Failed to reset exams', 500);
  }
});

module.exports = router;