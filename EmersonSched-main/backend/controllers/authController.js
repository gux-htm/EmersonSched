const db = require('../config/db');
const { generateUUID, hashPassword, comparePassword, generateToken } = require('../utils/helpers');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

// Check if system has any admin
const checkFirstAdmin = async (req, res) => {
  try {
    const [admins] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'"
    );
    
    res.json({ isFirstAdmin: admins[0].count === 0 });
  } catch (error) {
    console.error('Check first admin error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Register user
const register = async (req, res) => {
  try {
    const { name, email, password, role, department, metadata } = req.body;
    
    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Check if email exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check if this is the first admin
    const [admins] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'approved'"
    );
    const isFirstAdmin = admins[0].count === 0;
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    const userId = generateUUID();
    
    // Set status - first admin is auto-approved
    const status = isFirstAdmin && role === 'admin' ? 'approved' : 'pending';
    
    // Insert user
    await db.query(
      'INSERT INTO users (id, name, email, password_hash, role, status, department, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, name, email, hashedPassword, role || 'student', status, department, JSON.stringify(metadata || {})]
    );
    
    // If first admin, auto-login
    if (status === 'approved') {
      const token = generateToken({ id: userId, email, role: role || 'student', name });
      return res.status(201).json({
        message: 'Registration successful',
        token,
        user: { id: userId, name, email, role: role || 'student', status: 'approved' }
      });
    }
    
    res.status(201).json({
      message: 'Registration successful. Awaiting admin approval.',
      user: { id: userId, name, email, role: role || 'student', status: 'pending' }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    
    // Check if approved
    if (user.status !== 'approved') {
      return res.status(403).json({ error: 'Account pending approval' });
    }
    
    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = generateToken(user);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, name, email, role, department, status, metadata, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: users[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

// Get pending registrations (admin only)
const getPendingRegistrations = async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, name, email, role, department, metadata, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC"
    );
    
    res.json({ users });
  } catch (error) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({ error: 'Failed to get pending registrations' });
  }
};

// Approve/Reject registration
const updateRegistrationStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    
    res.json({ message: `User ${status} successfully` });
  } catch (error) {
    console.error('Update registration status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email, name } = req.body;

    // 1) Get user based on POSTed email and name
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND name = ?', [email, name]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    // 2) Generate the random reset token
    const resetToken = crypto.randomInt(100000, 1000000).toString();
    const hashedToken = await hashPassword(resetToken);

    // 3) Set token and expiry on user
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    await db.query('UPDATE users SET resetOTP = ?, resetOTPExpiry = ?, otpAttempts = 0 WHERE id = ?', [
      hashedToken,
      new Date(expiry),
      user.id,
    ]);

    // 4) Send it to user's email
    const message = `Forgot your password? Submit this OTP to reset your password: ${resetToken}. This OTP is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({ message: 'Token sent to email!' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Error sending email' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    if (user.otpAttempts >= 3) {
      return res.status(401).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    const isValid = await comparePassword(otp, user.resetOTP);

    if (!isValid) {
      await db.query('UPDATE users SET otpAttempts = otpAttempts + 1 WHERE id = ?', [user.id]);
      return res.status(401).json({ error: 'Invalid OTP' });
    }

    if (user.resetOTPExpiry < new Date()) {
      return res.status(401).json({ error: 'OTP has expired' });
    }

    res.status(200).json({ message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'OTP verification failed' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];


    const hashedPassword = await hashPassword(password);
    await db.query('UPDATE users SET password_hash = ?, resetOTP = NULL, resetOTPExpiry = NULL, otpAttempts = 0 WHERE id = ?', [
      hashedPassword,
      user.id,
    ]);

    const token = generateToken(user);
    res.status(200).json({ token, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // 1) Get user from the collection
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];

    // 2) Check if posted current password is correct
    const isValid = await comparePassword(oldPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect old password' });
    }

    // 3) If so, update password
    const hashedPassword = await hashPassword(newPassword);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, userId]);

    // 4) Log the user in, send JWT
    const token = generateToken(user);
    res.status(200).json({ token, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Password update failed' });
  }
};

module.exports = {
  checkFirstAdmin,
  register,
  login,
  getProfile,
  getPendingRegistrations,
  updateRegistrationStatus,
  forgotPassword,
  verifyOtp,
  resetPassword,
  updatePassword,
};
