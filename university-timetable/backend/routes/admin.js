const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  sanitizeObject,
  successResponse,
  errorResponse,
  getPaginationParams,
  getPaginationMeta,
  logAction,
  generateTimeSlots,
  parseCreditHours
} = require('../utils/helpers');

const router = express.Router();

// Apply admin authentication to all routes
router.use(verifyToken, requireAdmin);

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPrograms,
      totalCourses,
      totalRooms,
      totalSections,
      pendingRequests,
      activeBlocks,
      upcomingExams
    ] = await Promise.all([
      Database.count('users', 'status = ?', ['approved']),
      Database.count('programs'),
      Database.count('courses'),
      Database.count('rooms', 'is_available = ?', [true]),
      Database.count('sections'),
      Database.count('registration_requests', 'status = ?', ['pending']),
      Database.count('blocks', 'is_active = ?', [true]),
      Database.count('exams', 'exam_date >= CURDATE()')
    ]);

    const stats = {
      users: {
        total: totalUsers,
        breakdown: await Database.query(`
          SELECT role, COUNT(*) as count 
          FROM users 
          WHERE status = 'approved' 
          GROUP BY role
        `)
      },
      programs: totalPrograms,
      courses: totalCourses,
      rooms: totalRooms,
      sections: totalSections,
      pendingRequests,
      activeBlocks,
      upcomingExams
    };

    successResponse(res, stats, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    console.error('Dashboard error:', error);
    errorResponse(res, 'Failed to fetch dashboard data', 500);
  }
});

// PROGRAMS MANAGEMENT

// Get all programs
router.get('/programs', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { search, shift } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (search) {
      whereClause += 'WHERE (name LIKE ? OR code LIKE ?)';
      whereParams.push(`%${search}%`, `%${search}%`);
    }

    if (shift) {
      whereClause += whereClause ? ' AND shift = ?' : 'WHERE shift = ?';
      whereParams.push(shift);
    }

    const programs = await Database.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM majors m WHERE m.program_id = p.id) as major_count
      FROM programs p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...whereParams, limit, offset]);

    const total = await Database.count('programs', whereClause.replace('WHERE ', ''), whereParams);

    successResponse(res, {
      programs,
      pagination: getPaginationMeta(total, page, limit)
    }, 'Programs retrieved successfully');
  } catch (error) {
    console.error('Programs fetch error:', error);
    errorResponse(res, 'Failed to fetch programs', 500);
  }
});

// Create program
router.post('/programs', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Program name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 20 }).withMessage('Program code must be 2-20 characters'),
  body('system_type').isIn(['semester', 'annual']).withMessage('Invalid system type'),
  body('total_semesters').isInt({ min: 1, max: 12 }).withMessage('Total semesters must be 1-12'),
  body('shift').isIn(['morning', 'evening', 'weekend']).withMessage('Invalid shift')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { name, code, system_type, total_semesters, shift } = sanitizeObject(req.body);

    // Check if code already exists
    const existingProgram = await Database.queryOne('SELECT id FROM programs WHERE code = ?', [code]);
    if (existingProgram) {
      return errorResponse(res, 'Program code already exists', 409);
    }

    const programData = {
      name,
      code: code.toUpperCase(),
      system_type,
      total_semesters,
      shift
    };

    const result = await Database.insert('programs', programData);
    const programId = result.insertId;

    // Log action
    await logAction(Database, req.user.id, 'PROGRAM_CREATE', 'programs', programId, null, programData, req);

    successResponse(res, { id: programId, ...programData }, 'Program created successfully', 201);
  } catch (error) {
    console.error('Program creation error:', error);
    errorResponse(res, 'Failed to create program', 500);
  }
});

// Update program
router.put('/programs/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Program name must be 2-100 characters'),
  body('code').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Program code must be 2-20 characters'),
  body('system_type').optional().isIn(['semester', 'annual']).withMessage('Invalid system type'),
  body('total_semesters').optional().isInt({ min: 1, max: 12 }).withMessage('Total semesters must be 1-12'),
  body('shift').optional().isIn(['morning', 'evening', 'weekend']).withMessage('Invalid shift')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = sanitizeObject(req.body);

    // Get current program for logging
    const oldProgram = await Database.findById('programs', id);
    if (!oldProgram) {
      return errorResponse(res, 'Program not found', 404);
    }

    // Check if new code conflicts (if code is being updated)
    if (updateData.code && updateData.code !== oldProgram.code) {
      const existingProgram = await Database.queryOne('SELECT id FROM programs WHERE code = ? AND id != ?', [updateData.code, id]);
      if (existingProgram) {
        return errorResponse(res, 'Program code already exists', 409);
      }
      updateData.code = updateData.code.toUpperCase();
    }

    await Database.update('programs', updateData, 'id = ?', [id]);

    // Get updated program
    const updatedProgram = await Database.findById('programs', id);

    // Log action
    await logAction(Database, req.user.id, 'PROGRAM_UPDATE', 'programs', id, oldProgram, updatedProgram, req);

    successResponse(res, updatedProgram, 'Program updated successfully');
  } catch (error) {
    console.error('Program update error:', error);
    errorResponse(res, 'Failed to update program', 500);
  }
});

// Delete program
router.delete('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if program exists
    const program = await Database.findById('programs', id);
    if (!program) {
      return errorResponse(res, 'Program not found', 404);
    }

    // Check if program has majors
    const majorCount = await Database.count('majors', 'program_id = ?', [id]);
    if (majorCount > 0) {
      return errorResponse(res, 'Cannot delete program with existing majors', 400);
    }

    await Database.delete('programs', 'id = ?', [id]);

    // Log action
    await logAction(Database, req.user.id, 'PROGRAM_DELETE', 'programs', id, program, null, req);

    successResponse(res, null, 'Program deleted successfully');
  } catch (error) {
    console.error('Program deletion error:', error);
    errorResponse(res, 'Failed to delete program', 500);
  }
});

// MAJORS MANAGEMENT

// Get majors by program
router.get('/programs/:programId/majors', async (req, res) => {
  try {
    const { programId } = req.params;
    
    const majors = await Database.query(`
      SELECT m.*, p.name as program_name, p.code as program_code,
        (SELECT COUNT(*) FROM courses c WHERE c.major_id = m.id) as course_count
      FROM majors m
      JOIN programs p ON m.program_id = p.id
      WHERE m.program_id = ?
      ORDER BY m.name
    `, [programId]);

    successResponse(res, majors, 'Majors retrieved successfully');
  } catch (error) {
    console.error('Majors fetch error:', error);
    errorResponse(res, 'Failed to fetch majors', 500);
  }
});

// Create major
router.post('/majors', [
  body('program_id').isInt({ min: 1 }).withMessage('Valid program ID is required'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Major name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 20 }).withMessage('Major code must be 2-20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { program_id, name, code } = sanitizeObject(req.body);

    // Check if program exists
    const program = await Database.findById('programs', program_id);
    if (!program) {
      return errorResponse(res, 'Program not found', 404);
    }

    // Check if code already exists
    const existingMajor = await Database.queryOne('SELECT id FROM majors WHERE code = ?', [code]);
    if (existingMajor) {
      return errorResponse(res, 'Major code already exists', 409);
    }

    const majorData = {
      program_id,
      name,
      code: code.toUpperCase()
    };

    const result = await Database.insert('majors', majorData);
    const majorId = result.insertId;

    // Log action
    await logAction(Database, req.user.id, 'MAJOR_CREATE', 'majors', majorId, null, majorData, req);

    successResponse(res, { id: majorId, ...majorData }, 'Major created successfully', 201);
  } catch (error) {
    console.error('Major creation error:', error);
    errorResponse(res, 'Failed to create major', 500);
  }
});

// COURSES MANAGEMENT

// Get courses
router.get('/courses', async (req, res) => {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { search, major_id, semester } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (search) {
      whereClause += 'WHERE (c.name LIKE ? OR c.code LIKE ?)';
      whereParams.push(`%${search}%`, `%${search}%`);
    }

    if (major_id) {
      whereClause += whereClause ? ' AND c.major_id = ?' : 'WHERE c.major_id = ?';
      whereParams.push(major_id);
    }

    if (semester) {
      whereClause += whereClause ? ' AND c.semester = ?' : 'WHERE c.semester = ?';
      whereParams.push(semester);
    }

    const courses = await Database.query(`
      SELECT c.*, m.name as major_name, m.code as major_code,
        p.name as program_name, p.code as program_code
      FROM courses c
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `, [...whereParams, limit, offset]);

    const total = await Database.count('courses c JOIN majors m ON c.major_id = m.id', 
      whereClause.replace('WHERE ', ''), whereParams);

    successResponse(res, {
      courses,
      pagination: getPaginationMeta(total, page, limit)
    }, 'Courses retrieved successfully');
  } catch (error) {
    console.error('Courses fetch error:', error);
    errorResponse(res, 'Failed to fetch courses', 500);
  }
});

// Create course
router.post('/courses', [
  body('major_id').isInt({ min: 1 }).withMessage('Valid major ID is required'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Course name must be 2-100 characters'),
  body('code').trim().isLength({ min: 2, max: 20 }).withMessage('Course code must be 2-20 characters'),
  body('credit_hours').matches(/^\d+(\+\d+)?$/).withMessage('Credit hours format: "3" or "3+1"'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be 1-12'),
  body('is_lab').optional().isBoolean().withMessage('is_lab must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { major_id, name, code, credit_hours, semester, is_lab } = sanitizeObject(req.body);

    // Check if major exists
    const major = await Database.findById('majors', major_id);
    if (!major) {
      return errorResponse(res, 'Major not found', 404);
    }

    // Check if code already exists
    const existingCourse = await Database.queryOne('SELECT id FROM courses WHERE code = ?', [code]);
    if (existingCourse) {
      return errorResponse(res, 'Course code already exists', 409);
    }

    // Validate credit hours format
    const creditInfo = parseCreditHours(credit_hours);
    if (creditInfo.total === 0) {
      return errorResponse(res, 'Invalid credit hours format', 400);
    }

    const courseData = {
      major_id,
      name,
      code: code.toUpperCase(),
      credit_hours,
      semester,
      is_lab: is_lab || (creditInfo.lab > 0)
    };

    const result = await Database.insert('courses', courseData);
    const courseId = result.insertId;

    // Log action
    await logAction(Database, req.user.id, 'COURSE_CREATE', 'courses', courseId, null, courseData, req);

    successResponse(res, { id: courseId, ...courseData }, 'Course created successfully', 201);
  } catch (error) {
    console.error('Course creation error:', error);
    errorResponse(res, 'Failed to create course', 500);
  }
});

// SECTIONS MANAGEMENT

// Get sections
router.get('/sections', async (req, res) => {
  try {
    const { major_id, semester, shift } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (major_id) {
      whereClause += 'WHERE s.major_id = ?';
      whereParams.push(major_id);
    }

    if (semester) {
      whereClause += whereClause ? ' AND s.semester = ?' : 'WHERE s.semester = ?';
      whereParams.push(semester);
    }

    if (shift) {
      whereClause += whereClause ? ' AND s.shift = ?' : 'WHERE s.shift = ?';
      whereParams.push(shift);
    }

    const sections = await Database.query(`
      SELECT s.*, m.name as major_name, m.code as major_code,
        p.name as program_name, p.code as program_code,
        (SELECT COUNT(*) FROM student_enrollments se WHERE se.section_id = s.id) as enrolled_students
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY s.name
    `, whereParams);

    successResponse(res, sections, 'Sections retrieved successfully');
  } catch (error) {
    console.error('Sections fetch error:', error);
    errorResponse(res, 'Failed to fetch sections', 500);
  }
});

// Create section
router.post('/sections', [
  body('major_id').isInt({ min: 1 }).withMessage('Valid major ID is required'),
  body('name').trim().isLength({ min: 1, max: 10 }).withMessage('Section name must be 1-10 characters'),
  body('student_strength').isInt({ min: 0, max: 200 }).withMessage('Student strength must be 0-200'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be 1-12'),
  body('shift').isIn(['morning', 'evening', 'weekend']).withMessage('Invalid shift')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { major_id, name, student_strength, semester, shift } = sanitizeObject(req.body);

    // Check if major exists
    const major = await Database.findById('majors', major_id);
    if (!major) {
      return errorResponse(res, 'Major not found', 404);
    }

    // Check if section name already exists for this major and semester
    const existingSection = await Database.queryOne(
      'SELECT id FROM sections WHERE major_id = ? AND name = ? AND semester = ?',
      [major_id, name, semester]
    );
    if (existingSection) {
      return errorResponse(res, 'Section name already exists for this major and semester', 409);
    }

    const sectionData = {
      major_id,
      name: name.toUpperCase(),
      student_strength,
      semester,
      shift
    };

    const result = await Database.insert('sections', sectionData);
    const sectionId = result.insertId;

    // Log action
    await logAction(Database, req.user.id, 'SECTION_CREATE', 'sections', sectionId, null, sectionData, req);

    successResponse(res, { id: sectionId, ...sectionData }, 'Section created successfully', 201);
  } catch (error) {
    console.error('Section creation error:', error);
    errorResponse(res, 'Failed to create section', 500);
  }
});

// ROOMS MANAGEMENT

// Get rooms
router.get('/rooms', async (req, res) => {
  try {
    const { type, available } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (type) {
      whereClause += 'WHERE type = ?';
      whereParams.push(type);
    }

    if (available !== undefined) {
      whereClause += whereClause ? ' AND is_available = ?' : 'WHERE is_available = ?';
      whereParams.push(available === 'true');
    }

    const rooms = await Database.query(`
      SELECT r.*,
        (SELECT COUNT(*) FROM blocks b WHERE b.room_id = r.id AND b.is_active = 1) as allocated_slots
      FROM rooms r
      ${whereClause}
      ORDER BY r.name
    `, whereParams);

    successResponse(res, rooms, 'Rooms retrieved successfully');
  } catch (error) {
    console.error('Rooms fetch error:', error);
    errorResponse(res, 'Failed to fetch rooms', 500);
  }
});

// Create room
router.post('/rooms', [
  body('name').trim().isLength({ min: 1, max: 20 }).withMessage('Room name must be 1-20 characters'),
  body('type').isIn(['lecture', 'lab', 'seminar']).withMessage('Invalid room type'),
  body('capacity').isInt({ min: 1, max: 500 }).withMessage('Capacity must be 1-500'),
  body('resources').optional().isObject().withMessage('Resources must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { name, type, capacity, resources } = sanitizeObject(req.body);

    // Check if room name already exists
    const existingRoom = await Database.queryOne('SELECT id FROM rooms WHERE name = ?', [name]);
    if (existingRoom) {
      return errorResponse(res, 'Room name already exists', 409);
    }

    const roomData = {
      name: name.toUpperCase(),
      type,
      capacity,
      resources: resources ? JSON.stringify(resources) : null,
      is_available: true
    };

    const result = await Database.insert('rooms', roomData);
    const roomId = result.insertId;

    // Log action
    await logAction(Database, req.user.id, 'ROOM_CREATE', 'rooms', roomId, null, roomData, req);

    successResponse(res, { id: roomId, ...roomData }, 'Room created successfully', 201);
  } catch (error) {
    console.error('Room creation error:', error);
    errorResponse(res, 'Failed to create room', 500);
  }
});

// Update room
router.put('/rooms/:id', [
  body('name').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Room name must be 1-20 characters'),
  body('type').optional().isIn(['lecture', 'lab', 'seminar']).withMessage('Invalid room type'),
  body('capacity').optional().isInt({ min: 1, max: 500 }).withMessage('Capacity must be 1-500'),
  body('resources').optional().isObject().withMessage('Resources must be an object'),
  body('is_available').optional().isBoolean().withMessage('is_available must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = sanitizeObject(req.body);

    // Get current room for logging
    const oldRoom = await Database.findById('rooms', id);
    if (!oldRoom) {
      return errorResponse(res, 'Room not found', 404);
    }

    // Check if new name conflicts (if name is being updated)
    if (updateData.name && updateData.name !== oldRoom.name) {
      const existingRoom = await Database.queryOne('SELECT id FROM rooms WHERE name = ? AND id != ?', [updateData.name, id]);
      if (existingRoom) {
        return errorResponse(res, 'Room name already exists', 409);
      }
      updateData.name = updateData.name.toUpperCase();
    }

    if (updateData.resources) {
      updateData.resources = JSON.stringify(updateData.resources);
    }

    await Database.update('rooms', updateData, 'id = ?', [id]);

    // Get updated room
    const updatedRoom = await Database.findById('rooms', id);

    // Log action
    await logAction(Database, req.user.id, 'ROOM_UPDATE', 'rooms', id, oldRoom, updatedRoom, req);

    successResponse(res, updatedRoom, 'Room updated successfully');
  } catch (error) {
    console.error('Room update error:', error);
    errorResponse(res, 'Failed to update room', 500);
  }
});

// TIME SLOTS MANAGEMENT

// Get time slots
router.get('/time-slots', async (req, res) => {
  try {
    const { shift } = req.query;

    let whereClause = '';
    let whereParams = [];

    if (shift) {
      whereClause = 'WHERE shift = ?';
      whereParams.push(shift);
    }

    const timeSlots = await Database.query(`
      SELECT * FROM time_slots
      ${whereClause}
      ORDER BY shift, start_time
    `, whereParams);

    successResponse(res, timeSlots, 'Time slots retrieved successfully');
  } catch (error) {
    console.error('Time slots fetch error:', error);
    errorResponse(res, 'Failed to fetch time slots', 500);
  }
});

// Generate time slots based on university settings
router.post('/generate-time-slots', [
  body('morning_start').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid morning start time'),
  body('morning_end').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid morning end time'),
  body('evening_start').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid evening start time'),
  body('evening_end').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid evening end time'),
  body('slot_duration').isInt({ min: 30, max: 180 }).withMessage('Slot duration must be 30-180 minutes'),
  body('break_duration').isInt({ min: 0, max: 60 }).withMessage('Break duration must be 0-60 minutes')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const {
      morning_start,
      morning_end,
      evening_start,
      evening_end,
      slot_duration,
      break_duration
    } = sanitizeObject(req.body);

    // Clear existing time slots
    await Database.delete('time_slots', '1=1');

    // Generate morning slots
    const morningSlots = generateTimeSlots(morning_start, morning_end, slot_duration, break_duration);
    for (let i = 0; i < morningSlots.length; i++) {
      const slot = morningSlots[i];
      await Database.insert('time_slots', {
        slot_name: `Morning Slot ${i + 1}`,
        start_time: slot.start,
        end_time: slot.end,
        shift: 'morning',
        duration_minutes: slot.duration
      });
    }

    // Generate evening slots
    const eveningSlots = generateTimeSlots(evening_start, evening_end, slot_duration, break_duration);
    for (let i = 0; i < eveningSlots.length; i++) {
      const slot = eveningSlots[i];
      await Database.insert('time_slots', {
        slot_name: `Evening Slot ${i + 1}`,
        start_time: slot.start,
        end_time: slot.end,
        shift: 'evening',
        duration_minutes: slot.duration
      });
    }

    // Update university settings
    const settings = {
      morning_shift_start: morning_start,
      morning_shift_end: morning_end,
      evening_shift_start: evening_start,
      evening_shift_end: evening_end,
      slot_duration,
      break_duration
    };

    for (const [key, value] of Object.entries(settings)) {
      await Database.query(`
        INSERT INTO university_settings (setting_key, setting_value, updated_by)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        setting_value = VALUES(setting_value),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP
      `, [key, JSON.stringify(value), req.user.id]);
    }

    // Log action
    await logAction(Database, req.user.id, 'TIME_SLOTS_GENERATE', 'time_slots', 'all', null, settings, req);

    const totalSlots = morningSlots.length + eveningSlots.length;
    successResponse(res, {
      morningSlots: morningSlots.length,
      eveningSlots: eveningSlots.length,
      totalSlots
    }, 'Time slots generated successfully', 201);

  } catch (error) {
    console.error('Time slots generation error:', error);
    errorResponse(res, 'Failed to generate time slots', 500);
  }
});

module.exports = router;