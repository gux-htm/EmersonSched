const express = require('express');
const { body, validationResult } = require('express-validator');
const { Database } = require('../models/database');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const {
  hashPassword,
  comparePassword,
  generateToken,
  generateUUID,
  isValidEmail,
  isValidPassword,
  sanitizeObject,
  successResponse,
  errorResponse,
  logAction
} = require('../utils/helpers');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['admin', 'instructor', 'student']).withMessage('Invalid role'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department too long')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Check if system is initialized (has super admin)
router.get('/system-status', async (req, res) => {
  try {
    const adminCount = await Database.count('users', 'role = ? AND status = ?', ['admin', 'approved']);
    
    res.json({
      initialized: adminCount > 0,
      requiresSetup: adminCount === 0,
      message: adminCount === 0 ? 'System requires first admin setup' : 'System is initialized'
    });
  } catch (error) {
    console.error('System status check error:', error);
    errorResponse(res, 'Failed to check system status', 500);
  }
});

// First admin registration (only when no admin exists)
router.post('/setup-admin', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    // Check if system already has an admin
    const adminCount = await Database.count('users', 'role = ? AND status = ?', ['admin', 'approved']);
    if (adminCount > 0) {
      return errorResponse(res, 'System already initialized', 400);
    }

    const { name, email, password, department, designation } = sanitizeObject(req.body);

    // Check if email already exists
    const existingUser = await Database.queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 409);
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return errorResponse(res, 'Password must contain at least 8 characters with uppercase, lowercase, and number', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create first admin (auto-approved)
    const userId = generateUUID();
    const userData = {
      id: userId,
      name,
      email,
      password_hash: passwordHash,
      role: 'admin',
      status: 'approved',
      department: department || 'Administration',
      designation: designation || 'System Administrator',
      metadata: JSON.stringify({
        isFirstAdmin: true,
        setupDate: new Date().toISOString()
      })
    };

    await Database.insert('users', userData);

    // Generate token
    const token = generateToken({
      id: userId,
      email,
      role: 'admin'
    });

    // Log action
    await logAction(Database, userId, 'FIRST_ADMIN_SETUP', 'users', userId, null, userData, req);

    successResponse(res, {
      user: {
        id: userId,
        name,
        email,
        role: 'admin',
        department: userData.department,
        designation: userData.designation
      },
      token
    }, 'First admin created successfully', 201);

  } catch (error) {
    console.error('First admin setup error:', error);
    errorResponse(res, 'Failed to create first admin', 500);
  }
});

// User registration
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    // Check if system is initialized
    const adminCount = await Database.count('users', 'role = ? AND status = ?', ['admin', 'approved']);
    if (adminCount === 0) {
      return errorResponse(res, 'System not initialized. Please setup first admin.', 400);
    }

    const { name, email, password, role, department, designation, metadata } = sanitizeObject(req.body);

    // Check if email already exists
    const existingUser = await Database.queryOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return errorResponse(res, 'Email already registered', 409);
    }

    // Validate password strength
    if (!isValidPassword(password)) {
      return errorResponse(res, 'Password must contain at least 8 characters with uppercase, lowercase, and number', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (pending approval)
    const userId = generateUUID();
    const userData = {
      id: userId,
      name,
      email,
      password_hash: passwordHash,
      role,
      status: 'pending', // All new users need approval
      department,
      designation,
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    await Database.insert('users', userData);

    // Create registration request
    await Database.insert('registration_requests', {
      user_id: userId,
      status: 'pending'
    });

    // Log action
    await logAction(Database, userId, 'USER_REGISTRATION', 'users', userId, null, userData, req);

    successResponse(res, {
      user: {
        id: userId,
        name,
        email,
        role,
        status: 'pending'
      }
    }, 'Registration successful. Please wait for admin approval.', 201);

  } catch (error) {
    console.error('Registration error:', error);
    errorResponse(res, 'Registration failed', 500);
  }
});

// User login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = sanitizeObject(req.body);

    // Find user by email
    const user = await Database.queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Check if user is approved
    if (user.status !== 'approved') {
      let message = 'Account not approved';
      if (user.status === 'pending') {
        message = 'Account pending approval. Please contact administrator.';
      } else if (user.status === 'rejected') {
        message = 'Account has been rejected. Please contact administrator.';
      }
      return errorResponse(res, message, 403);
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log action
    await logAction(Database, user.id, 'USER_LOGIN', 'users', user.id, null, { loginTime: new Date() }, req);

    successResponse(res, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation,
        metadata: user.metadata
      },
      token
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
});

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await Database.queryOne(`
      SELECT id, name, email, role, department, designation, metadata, created_at, updated_at
      FROM users 
      WHERE id = ?
    `, [req.user.id]);

    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    successResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Profile fetch error:', error);
    errorResponse(res, 'Failed to fetch profile', 500);
  }
});

// Update user profile
router.put('/profile', verifyToken, [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('department').optional().trim().isLength({ max: 100 }).withMessage('Department too long'),
  body('designation').optional().trim().isLength({ max: 100 }).withMessage('Designation too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { name, department, designation, metadata } = sanitizeObject(req.body);
    
    // Get current user data for logging
    const oldUser = await Database.findById('users', req.user.id);

    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (designation) updateData.designation = designation;
    if (metadata) updateData.metadata = JSON.stringify(metadata);

    if (Object.keys(updateData).length === 0) {
      return errorResponse(res, 'No fields to update', 400);
    }

    await Database.update('users', updateData, 'id = ?', [req.user.id]);

    // Get updated user
    const updatedUser = await Database.findById('users', req.user.id);

    // Log action
    await logAction(Database, req.user.id, 'PROFILE_UPDATE', 'users', req.user.id, oldUser, updatedUser, req);

    successResponse(res, {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      designation: updatedUser.designation,
      metadata: updatedUser.metadata
    }, 'Profile updated successfully');

  } catch (error) {
    console.error('Profile update error:', error);
    errorResponse(res, 'Failed to update profile', 500);
  }
});

// Change password
router.put('/change-password', verifyToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { currentPassword, newPassword } = sanitizeObject(req.body);

    // Get current user
    const user = await Database.queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Validate new password strength
    if (!isValidPassword(newPassword)) {
      return errorResponse(res, 'New password must contain at least 8 characters with uppercase, lowercase, and number', 400);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await Database.update('users', { password_hash: newPasswordHash }, 'id = ?', [req.user.id]);

    // Log action
    await logAction(Database, req.user.id, 'PASSWORD_CHANGE', 'users', req.user.id, null, { passwordChanged: true }, req);

    successResponse(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Password change error:', error);
    errorResponse(res, 'Failed to change password', 500);
  }
});

// Get pending registration requests (Admin only)
router.get('/pending-requests', verifyToken, requireAdmin, async (req, res) => {
  try {
    const requests = await Database.query(`
      SELECT 
        rr.id as request_id,
        rr.status as request_status,
        rr.created_at as request_date,
        u.id, u.name, u.email, u.role, u.department, u.designation, u.metadata
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.status = 'pending'
      ORDER BY rr.created_at ASC
    `);

    successResponse(res, requests, 'Pending requests retrieved successfully');
  } catch (error) {
    console.error('Pending requests fetch error:', error);
    errorResponse(res, 'Failed to fetch pending requests', 500);
  }
});

// Approve/Reject registration request (Admin only)
router.put('/approve-request/:requestId', verifyToken, requireAdmin, [
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 'Validation failed', 400, errors.array());
    }

    const { requestId } = req.params;
    const { action, notes } = sanitizeObject(req.body);

    // Get registration request
    const request = await Database.queryOne(`
      SELECT rr.*, u.name, u.email, u.role 
      FROM registration_requests rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.id = ?
    `, [requestId]);

    if (!request) {
      return errorResponse(res, 'Registration request not found', 404);
    }

    if (request.status !== 'pending') {
      return errorResponse(res, 'Request already processed', 400);
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update user status
    await Database.update('users', { status: newStatus }, 'id = ?', [request.user_id]);

    // Update request
    await Database.update('registration_requests', {
      status: newStatus,
      approved_by: req.user.id,
      notes: notes || null
    }, 'id = ?', [requestId]);

    // Log action
    await logAction(Database, req.user.id, `USER_${action.toUpperCase()}`, 'users', request.user_id, 
      { status: 'pending' }, { status: newStatus }, req);

    successResponse(res, {
      requestId,
      userId: request.user_id,
      action,
      status: newStatus
    }, `User ${action}d successfully`);

  } catch (error) {
    console.error('Request approval error:', error);
    errorResponse(res, 'Failed to process request', 500);
  }
});

// Logout (client-side token removal, but log the action)
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Log action
    await logAction(Database, req.user.id, 'USER_LOGOUT', 'users', req.user.id, null, { logoutTime: new Date() }, req);

    successResponse(res, null, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    errorResponse(res, 'Logout failed', 500);
  }
});

module.exports = router;