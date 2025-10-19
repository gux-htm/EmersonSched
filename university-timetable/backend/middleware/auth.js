const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is approved
    const userResult = await executeQuery(
      'SELECT id, name, email, role, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const user = userResult.data[0];
    
    if (user.status !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: 'Account not approved yet' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

// Check if user is instructor
const requireInstructor = (req, res, next) => {
  if (req.user.role !== 'instructor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Instructor access required' 
    });
  }
  next();
};

// Check if user is student
const requireStudent = (req, res, next) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ 
      success: false, 
      message: 'Student access required' 
    });
  }
  next();
};

// Check if user is admin or instructor
const requireAdminOrInstructor = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin or Instructor access required' 
    });
  }
  next();
};

// Check if first admin registration is needed
const checkFirstAdmin = async (req, res, next) => {
  try {
    const result = await executeQuery(
      'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND status = "approved"'
    );

    if (result.success && result.data[0].count === 0) {
      // First admin registration - auto-approve
      req.isFirstAdmin = true;
    } else {
      req.isFirstAdmin = false;
    }
    
    next();
  } catch (error) {
    console.error('First admin check error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireInstructor,
  requireStudent,
  requireAdminOrInstructor,
  checkFirstAdmin
};