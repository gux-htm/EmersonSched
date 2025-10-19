const express = require('express');
const { 
  validateUserRegistration, 
  validateUserLogin, 
  validate 
} = require('../utils/validation');
const { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  generateId,
  isValidEmail,
  validatePassword 
} = require('../utils/auth');
const { executeQuery } = require('../config/database');
const { 
  sendRegistrationApprovalEmail,
  sendRegistrationRejectionEmail 
} = require('../utils/email');
const { authenticateToken, checkFirstAdmin } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', checkFirstAdmin, validate(validateUserRegistration), async (req, res) => {
  try {
    const { name, email, password, role, department, designation, program, semester, section, specialization, availability } = req.body;

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Check if user already exists
    const existingUser = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser.success && existingUser.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = generateId();

    // Prepare metadata based on role
    let metadata = {};
    if (role === 'student') {
      metadata = { program, semester, section };
    } else if (role === 'instructor') {
      metadata = { department, specialization, availability };
    } else if (role === 'admin') {
      metadata = { department, designation };
    }

    // Determine status - first admin is auto-approved
    const status = req.isFirstAdmin ? 'approved' : 'pending';

    // Insert user
    const insertResult = await executeQuery(
      `INSERT INTO users (id, name, email, password_hash, role, status, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, email, hashedPassword, role, status, JSON.stringify(metadata)]
    );

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create user account'
      });
    }

    // If first admin, send welcome email
    if (req.isFirstAdmin) {
      await sendRegistrationApprovalEmail(email, name, role);
    }

    res.status(201).json({
      success: true,
      message: req.isFirstAdmin 
        ? 'Super Admin account created successfully' 
        : 'Registration request submitted. Awaiting admin approval.',
      data: {
        userId,
        name,
        email,
        role,
        status
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', validate(validateUserLogin), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userResult = await executeQuery(
      'SELECT id, name, email, password_hash, role, status, metadata FROM users WHERE email = ?',
      [email]
    );

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = userResult.data[0];

    // Check if account is approved
    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: `Account ${user.status}. Please wait for admin approval.`
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Log login activity
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [user.id, 'LOGIN', 'users', user.id]
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
          metadata: JSON.parse(user.metadata || '{}')
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
        status: req.user.status
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet requirements',
        errors: passwordValidation.errors
      });
    }

    // Get current user data
    const userResult = await executeQuery(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, userResult.data[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    const updateResult = await executeQuery(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update password'
      });
    }

    // Log password change
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'PASSWORD_CHANGE', 'users', req.user.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout activity
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'LOGOUT', 'users', req.user.id]
    );

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;