const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register user
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'instructor', 'student']).withMessage('Invalid role'),
  body('department').trim().notEmpty().withMessage('Department required'),
  body('id').trim().notEmpty().withMessage('ID required')
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

    const { name, email, password, role, department, id, designation, program, semester, section, specialization, availability } = req.body;

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Check if this is the first admin registration
    const [adminCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    const isFirstAdmin = adminCount[0].count === 0 && role === 'admin';

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Prepare metadata based on role
    let metadata = { department, id };
    if (role === 'student') {
      metadata = { ...metadata, program, semester, section };
    } else if (role === 'instructor') {
      metadata = { ...metadata, specialization, availability };
    } else if (role === 'admin') {
      metadata = { ...metadata, designation };
    }

    const userId = uuidv4();
    const isApproved = isFirstAdmin; // First admin is auto-approved

    // Insert user
    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, role, metadata, is_approved, is_super_admin) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, passwordHash, role, JSON.stringify(metadata), isApproved, isFirstAdmin]
    );

    // If first admin, update system settings
    if (isFirstAdmin) {
      await pool.execute(
        'UPDATE system_settings SET value = "true" WHERE key_name = "first_admin_registered"'
      );
      await pool.execute(
        'UPDATE system_settings SET value = "true" WHERE key_name = "registration_open"'
      );
    }

    res.status(201).json({
      success: true,
      message: isFirstAdmin ? 'Super admin registered successfully' : 'Registration successful, pending approval',
      data: {
        userId,
        role,
        isApproved,
        isSuperAdmin: isFirstAdmin
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
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

    const { email, password } = req.body;

    // Find user
    const [users] = await pool.execute(
      'SELECT id, name, email, password_hash, role, is_approved, is_super_admin, metadata FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is approved
    if (!user.is_approved) {
      return res.status(403).json({
        success: false,
        message: 'Account pending approval'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isSuperAdmin: user.is_super_admin,
          metadata: JSON.parse(user.metadata || '{}')
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isSuperAdmin: req.user.is_super_admin,
        metadata: JSON.parse(req.user.metadata || '{}')
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
});

// Check if first admin exists
router.get('/first-admin-status', async (req, res) => {
  try {
    const [settings] = await pool.execute(
      'SELECT value FROM system_settings WHERE key_name = "first_admin_registered"'
    );
    
    const [adminCount] = await pool.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    
    res.json({
      success: true,
      data: {
        firstAdminRegistered: settings[0]?.value === 'true',
        adminCount: adminCount[0].count
      }
    });
  } catch (error) {
    console.error('First admin status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check first admin status'
    });
  }
});

module.exports = router;