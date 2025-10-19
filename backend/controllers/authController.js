const db = require('../config/db');
const { generateUUID, hashPassword, comparePassword, generateToken } = require('../utils/helpers');

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

module.exports = {
  checkFirstAdmin,
  register,
  login,
  getProfile,
  getPendingRegistrations,
  updateRegistrationStatus
};
