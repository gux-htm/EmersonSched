const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { verifyToken, requireStudent } = require('../middleware/auth');
const {
  sanitizeObject,
  successResponse,
  errorResponse,
  logAction
} = require('../utils/helpers');

const router = express.Router();

// Apply student authentication to all routes
router.use(verifyToken, requireStudent);

// Get student dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student enrollment info
    const enrollment = await Database.queryOne(`
      SELECT 
        se.roll_number, se.semester, se.enrollment_date,
        s.name as section_name, s.student_strength, s.shift,
        m.name as major_name, m.code as major_code,
        p.name as program_name, p.code as program_code, p.total_semesters
      FROM student_enrollments se
      JOIN sections s ON se.section_id = s.id
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE se.student_id = ?
    `, [studentId]);

    if (!enrollment) {
      return errorResponse(res, 'Student enrollment not found. Please contact administration.', 404);
    }

    const [
      totalCourses,
      totalClasses,
      todayClasses,
      upcomingExams,
      notifications
    ] = await Promise.all([
      Database.count(`courses c 
        JOIN majors m ON c.major_id = m.id 
        JOIN student_enrollments se ON se.section_id IN (
          SELECT s.id FROM sections s WHERE s.major_id = m.id AND s.semester = se.semester
        )`, 
        'se.student_id = ?', [studentId]),
      Database.count(`blocks b 
        JOIN student_enrollments se ON b.section_id = se.section_id`, 
        'se.student_id = ? AND b.is_active = 1', [studentId]),
      Database.count(`blocks b 
        JOIN student_enrollments se ON b.section_id = se.section_id`, 
        'se.student_id = ? AND b.is_active = 1 AND b.day = DAYNAME(CURDATE())', [studentId]),
      Database.count(`exams e 
        JOIN student_enrollments se ON e.section_id = se.section_id`, 
        'se.student_id = ? AND e.exam_date >= CURDATE()', [studentId]),
      Database.count('notifications', 'user_id = ? AND is_read = 0', [studentId])
    ]);

    // Get today's schedule
    const todaySchedule = await Database.query(`
      SELECT 
        b.id, b.day, b.block_type,
        c.name as course_name, c.code as course_code,
        r.name as room_name, r.type as room_type,
        ts.slot_name, ts.start_time, ts.end_time,
        u.name as instructor_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      JOIN users u ON b.teacher_id = u.id
      JOIN student_enrollments se ON b.section_id = se.section_id
      WHERE se.student_id = ? AND b.is_active = 1 AND b.day = DAYNAME(CURDATE())
      ORDER BY ts.start_time
    `, [studentId]);

    const stats = {
      enrollment,
      courses: totalCourses,
      classes: {
        total: totalClasses,
        today: todayClasses
      },
      upcomingExams,
      unreadNotifications: notifications,
      todaySchedule
    };

    successResponse(res, stats, 'Student dashboard retrieved successfully');
  } catch (error) {
    console.error('Student dashboard error:', error);
    errorResponse(res, 'Failed to fetch dashboard data', 500);
  }
});

// Enroll student in section
router.post('/enroll', [
  body('section_id').isInt({ min: 1 }).withMessage('Valid section ID is required'),
  body('program_id').isInt({ min: 1 }).withMessage('Valid program ID is required'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be 1-12'),
  body('roll_number').trim().isLength({ min: 1, max: 50 }).withMessage('Roll number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const studentId = req.user.id;
    const { section_id, program_id, semester, roll_number } = sanitizeObject(req.body);

    // Check if student is already enrolled
    const existingEnrollment = await Database.queryOne(`
      SELECT id FROM student_enrollments WHERE student_id = ?
    `, [studentId]);

    if (existingEnrollment) {
      return errorResponse(res, 'Student is already enrolled', 409);
    }

    // Verify section exists and belongs to the program
    const section = await Database.queryOne(`
      SELECT s.*, m.program_id, p.name as program_name
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE s.id = ? AND m.program_id = ?
    `, [section_id, program_id]);

    if (!section) {
      return errorResponse(res, 'Section not found or does not belong to the specified program', 404);
    }

    // Check if roll number is unique
    const existingRoll = await Database.queryOne(`
      SELECT id FROM student_enrollments WHERE roll_number = ?
    `, [roll_number]);

    if (existingRoll) {
      return errorResponse(res, 'Roll number already exists', 409);
    }

    // Create enrollment
    const enrollmentData = {
      student_id: studentId,
      section_id,
      program_id,
      semester,
      roll_number: roll_number.toUpperCase()
    };

    const result = await Database.insert('student_enrollments', enrollmentData);

    // Log action
    await logAction(Database, studentId, 'STUDENT_ENROLL', 'student_enrollments', result.insertId, 
      null, enrollmentData, req);

    successResponse(res, {
      enrollmentId: result.insertId,
      ...enrollmentData,
      sectionName: section.name,
      programName: section.program_name
    }, 'Student enrolled successfully', 201);

  } catch (error) {
    console.error('Student enrollment error:', error);
    errorResponse(res, 'Failed to enroll student', 500);
  }
});

// Get student's timetable
router.get('/timetable', async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get student's section
    const enrollment = await Database.queryOne(`
      SELECT section_id FROM student_enrollments WHERE student_id = ?
    `, [studentId]);

    if (!enrollment) {
      return errorResponse(res, 'Student enrollment not found', 404);
    }

    const timetable = await Database.query(`
      SELECT 
        b.id, b.day, b.block_type,
        c.name as course_name, c.code as course_code, c.credit_hours,
        r.name as room_name, r.type as room_type, r.capacity,
        ts.slot_name, ts.start_time, ts.end_time, ts.duration_minutes,
        u.name as instructor_name, u.email as instructor_email
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      JOIN users u ON b.teacher_id = u.id
      WHERE b.section_id = ? AND b.is_active = 1
      ORDER BY 
        FIELD(b.day, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'),
        ts.start_time
    `, [enrollment.section_id]);

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
    console.error('Student timetable fetch error:', error);
    errorResponse(res, 'Failed to fetch timetable', 500);
  }
});

// Get student's exams
router.get('/exams', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { upcoming } = req.query;

    // Get student's section
    const enrollment = await Database.queryOne(`
      SELECT section_id FROM student_enrollments WHERE student_id = ?
    `, [studentId]);

    if (!enrollment) {
      return errorResponse(res, 'Student enrollment not found', 404);
    }

    let whereClause = 'e.section_id = ?';
    let whereParams = [enrollment.section_id];

    if (upcoming === 'true') {
      whereClause += ' AND e.exam_date >= CURDATE()';
    }

    const exams = await Database.query(`
      SELECT 
        e.id, e.exam_type, e.exam_date, e.start_time, e.end_time, e.duration_minutes,
        c.name as course_name, c.code as course_code,
        r.name as room_name, r.capacity,
        u.name as invigilator_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      WHERE ${whereClause}
      ORDER BY e.exam_date, e.start_time
    `, whereParams);

    successResponse(res, exams, 'Exams retrieved successfully');
  } catch (error) {
    console.error('Student exams fetch error:', error);
    errorResponse(res, 'Failed to fetch exams', 500);
  }
});

// Get student notifications
router.get('/notifications', async (req, res) => {
  try {
    const studentId = req.user.id;
    const { unread_only } = req.query;

    let whereClause = 'user_id = ?';
    let whereParams = [studentId];

    if (unread_only === 'true') {
      whereClause += ' AND is_read = 0';
    }

    const notifications = await Database.query(`
      SELECT id, title, message, type, is_read, created_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50
    `, whereParams);

    const unreadCount = await Database.count('notifications', 'user_id = ? AND is_read = 0', [studentId]);

    successResponse(res, {
      notifications,
      unreadCount
    }, 'Notifications retrieved successfully');
  } catch (error) {
    console.error('Notifications fetch error:', error);
    errorResponse(res, 'Failed to fetch notifications', 500);
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // Verify notification belongs to student
    const notification = await Database.queryOne(`
      SELECT id FROM notifications WHERE id = ? AND user_id = ?
    `, [id, studentId]);

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    await Database.update('notifications', { is_read: true }, 'id = ?', [id]);

    successResponse(res, null, 'Notification marked as read');
  } catch (error) {
    console.error('Notification update error:', error);
    errorResponse(res, 'Failed to update notification', 500);
  }
});

// Mark all notifications as read
router.put('/notifications/mark-all-read', async (req, res) => {
  try {
    const studentId = req.user.id;

    await Database.update('notifications', { is_read: true }, 'user_id = ? AND is_read = 0', [studentId]);

    successResponse(res, null, 'All notifications marked as read');
  } catch (error) {
    console.error('Notifications update error:', error);
    errorResponse(res, 'Failed to update notifications', 500);
  }
});

// Get available sections for enrollment
router.get('/available-sections', async (req, res) => {
  try {
    const { program_id, semester } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (program_id) {
      whereClause = 'WHERE m.program_id = ?';
      whereParams.push(program_id);
    }

    if (semester) {
      whereClause += whereClause ? ' AND s.semester = ?' : 'WHERE s.semester = ?';
      whereParams.push(semester);
    }

    const sections = await Database.query(`
      SELECT 
        s.id, s.name, s.student_strength, s.semester, s.shift,
        m.name as major_name, m.code as major_code,
        p.name as program_name, p.code as program_code,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.section_id = s.id) as enrolled_count
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY p.name, m.name, s.name
    `, whereParams);

    successResponse(res, sections, 'Available sections retrieved successfully');
  } catch (error) {
    console.error('Available sections fetch error:', error);
    errorResponse(res, 'Failed to fetch available sections', 500);
  }
});

// Get programs for enrollment
router.get('/programs', async (req, res) => {
  try {
    const programs = await Database.query(`
      SELECT 
        p.id, p.name, p.code, p.system_type, p.total_semesters, p.shift,
        COUNT(m.id) as major_count
      FROM programs p
      LEFT JOIN majors m ON p.id = m.program_id
      GROUP BY p.id
      ORDER BY p.name
    `);

    successResponse(res, programs, 'Programs retrieved successfully');
  } catch (error) {
    console.error('Programs fetch error:', error);
    errorResponse(res, 'Failed to fetch programs', 500);
  }
});

module.exports = router;