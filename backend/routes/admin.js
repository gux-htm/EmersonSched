const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE role = 'instructor' AND is_approved = 1) as instructors,
        (SELECT COUNT(*) FROM users WHERE role = 'student' AND is_approved = 1) as students,
        (SELECT COUNT(*) FROM courses WHERE is_active = 1) as courses,
        (SELECT COUNT(*) FROM rooms WHERE is_active = 1) as rooms,
        (SELECT COUNT(*) FROM course_requests WHERE status = 'pending') as pending_requests,
        (SELECT COUNT(*) FROM blocks) as scheduled_blocks
    `);

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// User management routes
router.get('/users', async (req, res) => {
  try {
    const { role, status } = req.query;
    let query = 'SELECT id, name, email, role, is_approved, is_super_admin, metadata, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (status === 'pending') {
      query += ' AND is_approved = 0';
    } else if (status === 'approved') {
      query += ' AND is_approved = 1';
    }

    query += ' ORDER BY created_at DESC';

    const [users] = await pool.execute(query, params);
    
    res.json({
      success: true,
      data: users.map(user => ({
        ...user,
        metadata: JSON.parse(user.metadata || '{}')
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Approve/reject user
router.patch('/users/:userId/approve', [
  body('approved').isBoolean().withMessage('Approved status required')
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

    const { userId } = req.params;
    const { approved } = req.body;

    await pool.execute(
      'UPDATE users SET is_approved = ? WHERE id = ?',
      [approved, userId]
    );

    res.json({
      success: true,
      message: `User ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// Programs management
router.post('/programs', [
  body('name').trim().notEmpty().withMessage('Program name required'),
  body('system_type').isIn(['semester', 'annual']).withMessage('Invalid system type'),
  body('total_semesters').isInt({ min: 1 }).withMessage('Total semesters must be positive'),
  body('shift').isIn(['morning', 'evening', 'weekend']).withMessage('Invalid shift')
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

    const { name, system_type, total_semesters, shift } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO programs (name, system_type, total_semesters, shift) VALUES (?, ?, ?, ?)',
      [name, system_type, total_semesters, shift]
    );

    res.status(201).json({
      success: true,
      message: 'Program created successfully',
      data: { id: result.insertId, name, system_type, total_semesters, shift }
    });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create program'
    });
  }
});

router.get('/programs', async (req, res) => {
  try {
    const [programs] = await pool.execute(
      'SELECT * FROM programs WHERE is_active = 1 ORDER BY name'
    );

    res.json({
      success: true,
      data: programs
    });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs'
    });
  }
});

// Majors management
router.post('/majors', [
  body('program_id').isInt().withMessage('Program ID required'),
  body('name').trim().notEmpty().withMessage('Major name required')
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

    const { program_id, name } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO majors (program_id, name) VALUES (?, ?)',
      [program_id, name]
    );

    res.status(201).json({
      success: true,
      message: 'Major created successfully',
      data: { id: result.insertId, program_id, name }
    });
  } catch (error) {
    console.error('Create major error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create major'
    });
  }
});

router.get('/majors', async (req, res) => {
  try {
    const [majors] = await pool.execute(`
      SELECT m.*, p.name as program_name 
      FROM majors m 
      JOIN programs p ON m.program_id = p.id 
      WHERE m.is_active = 1 
      ORDER BY p.name, m.name
    `);

    res.json({
      success: true,
      data: majors
    });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch majors'
    });
  }
});

// Courses management
router.post('/courses', [
  body('major_id').isInt().withMessage('Major ID required'),
  body('name').trim().notEmpty().withMessage('Course name required'),
  body('code').trim().notEmpty().withMessage('Course code required'),
  body('credit_hours').trim().notEmpty().withMessage('Credit hours required'),
  body('semester').isInt({ min: 1 }).withMessage('Semester must be positive'),
  body('shift').isIn(['morning', 'evening', 'weekend']).withMessage('Invalid shift')
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

    const { major_id, name, code, credit_hours, semester, shift } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO courses (major_id, name, code, credit_hours, semester, shift) VALUES (?, ?, ?, ?, ?, ?)',
      [major_id, name, code, credit_hours, semester, shift]
    );

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { id: result.insertId, major_id, name, code, credit_hours, semester, shift }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create course'
    });
  }
});

router.get('/courses', async (req, res) => {
  try {
    const [courses] = await pool.execute(`
      SELECT c.*, m.name as major_name, p.name as program_name 
      FROM courses c 
      JOIN majors m ON c.major_id = m.id 
      JOIN programs p ON m.program_id = p.id 
      WHERE c.is_active = 1 
      ORDER BY p.name, m.name, c.semester, c.name
    `);

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
});

// Sections management
router.post('/sections', [
  body('major_id').isInt().withMessage('Major ID required'),
  body('name').trim().notEmpty().withMessage('Section name required'),
  body('student_strength').isInt({ min: 1 }).withMessage('Student strength must be positive'),
  body('shift').isIn(['morning', 'evening', 'weekend']).withMessage('Invalid shift')
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

    const { major_id, name, student_strength, shift } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO sections (major_id, name, student_strength, shift) VALUES (?, ?, ?, ?)',
      [major_id, name, student_strength, shift]
    );

    res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: { id: result.insertId, major_id, name, student_strength, shift }
    });
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create section'
    });
  }
});

router.get('/sections', async (req, res) => {
  try {
    const [sections] = await pool.execute(`
      SELECT s.*, m.name as major_name, p.name as program_name 
      FROM sections s 
      JOIN majors m ON s.major_id = m.id 
      JOIN programs p ON m.program_id = p.id 
      WHERE s.is_active = 1 
      ORDER BY p.name, m.name, s.name
    `);

    res.json({
      success: true,
      data: sections
    });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sections'
    });
  }
});

// Rooms management
router.post('/rooms', [
  body('name').trim().notEmpty().withMessage('Room name required'),
  body('type').isIn(['lecture', 'lab', 'seminar']).withMessage('Invalid room type'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be positive'),
  body('resources').optional().isObject().withMessage('Resources must be an object')
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

    const { name, type, capacity, resources } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO rooms (name, type, capacity, resources) VALUES (?, ?, ?, ?)',
      [name, type, capacity, JSON.stringify(resources || {})]
    );

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { id: result.insertId, name, type, capacity, resources }
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room'
    });
  }
});

router.get('/rooms', async (req, res) => {
  try {
    const [rooms] = await pool.execute(
      'SELECT * FROM rooms WHERE is_active = 1 ORDER BY name'
    );

    res.json({
      success: true,
      data: rooms.map(room => ({
        ...room,
        resources: JSON.parse(room.resources || '{}')
      }))
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms'
    });
  }
});

// Course requests management
router.get('/course-requests', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT cr.*, u.name as instructor_name, c.name as course_name, c.code as course_code,
             s.name as section_name, m.name as major_name, p.name as program_name
      FROM course_requests cr
      JOIN users u ON cr.instructor_id = u.id
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE 1=1
    `;
    const params = [];

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

module.exports = router;