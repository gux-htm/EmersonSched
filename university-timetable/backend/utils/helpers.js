const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Password utilities
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT utilities
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// UUID utilities
const generateUUID = () => {
  return uuidv4();
};

// Date and time utilities
const formatDate = (date, format = 'YYYY-MM-DD') => {
  return moment(date).format(format);
};

const formatTime = (time, format = 'HH:mm') => {
  return moment(time, 'HH:mm:ss').format(format);
};

const formatDateTime = (dateTime, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(dateTime).format(format);
};

const getCurrentDateTime = () => {
  return moment().format('YYYY-MM-DD HH:mm:ss');
};

const addMinutes = (time, minutes) => {
  return moment(time, 'HH:mm:ss').add(minutes, 'minutes').format('HH:mm:ss');
};

const getTimeDifference = (startTime, endTime) => {
  const start = moment(startTime, 'HH:mm:ss');
  const end = moment(endTime, 'HH:mm:ss');
  return end.diff(start, 'minutes');
};

// Validation utilities
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
};

// Data sanitization
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// Response utilities
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: getCurrentDateTime()
  });
};

const errorResponse = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: getCurrentDateTime()
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

// Pagination utilities
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev
  };
};

// Array utilities
const removeDuplicates = (array, key = null) => {
  if (key) {
    return array.filter((item, index, self) => 
      index === self.findIndex(t => t[key] === item[key])
    );
  }
  return [...new Set(array)];
};

const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {});
};

// Time slot utilities
const generateTimeSlots = (startTime, endTime, duration, breakDuration = 0) => {
  const slots = [];
  let current = moment(startTime, 'HH:mm');
  const end = moment(endTime, 'HH:mm');
  
  while (current.isBefore(end)) {
    const slotEnd = moment(current).add(duration, 'minutes');
    
    if (slotEnd.isAfter(end)) break;
    
    slots.push({
      start: current.format('HH:mm:ss'),
      end: slotEnd.format('HH:mm:ss'),
      duration: duration
    });
    
    current = slotEnd.add(breakDuration, 'minutes');
  }
  
  return slots;
};

// Credit hours parsing
const parseCreditHours = (creditHours) => {
  const parts = creditHours.split('+');
  const theory = parseInt(parts[0]) || 0;
  const lab = parseInt(parts[1]) || 0;
  
  return { theory, lab, total: theory + lab };
};

// Conflict detection utilities
const hasTimeConflict = (slot1, slot2) => {
  const start1 = moment(slot1.start, 'HH:mm:ss');
  const end1 = moment(slot1.end, 'HH:mm:ss');
  const start2 = moment(slot2.start, 'HH:mm:ss');
  const end2 = moment(slot2.end, 'HH:mm:ss');
  
  return start1.isBefore(end2) && start2.isBefore(end1);
};

// File utilities
const getFileExtension = (filename) => {
  return filename.split('.').pop().toLowerCase();
};

const isValidImageFile = (filename) => {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  return validExtensions.includes(getFileExtension(filename));
};

const isValidDocumentFile = (filename) => {
  const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  return validExtensions.includes(getFileExtension(filename));
};

// Logging utilities
const logAction = async (Database, userId, action, tableName, recordId, oldValues = null, newValues = null, req = null) => {
  try {
    const logData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId.toString(),
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: req ? req.ip : null,
      user_agent: req ? req.get('User-Agent') : null
    };
    
    await Database.insert('audit_logs', logData);
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};

module.exports = {
  // Password utilities
  hashPassword,
  comparePassword,
  
  // JWT utilities
  generateToken,
  verifyToken,
  
  // UUID utilities
  generateUUID,
  
  // Date and time utilities
  formatDate,
  formatTime,
  formatDateTime,
  getCurrentDateTime,
  addMinutes,
  getTimeDifference,
  
  // Validation utilities
  isValidEmail,
  isValidPassword,
  isValidPhoneNumber,
  
  // Data sanitization
  sanitizeInput,
  sanitizeObject,
  
  // Response utilities
  successResponse,
  errorResponse,
  
  // Pagination utilities
  getPaginationParams,
  getPaginationMeta,
  
  // Array utilities
  removeDuplicates,
  groupBy,
  
  // Time slot utilities
  generateTimeSlots,
  
  // Credit hours parsing
  parseCreditHours,
  
  // Conflict detection
  hasTimeConflict,
  
  // File utilities
  getFileExtension,
  isValidImageFile,
  isValidDocumentFile,
  
  // Logging utilities
  logAction
};