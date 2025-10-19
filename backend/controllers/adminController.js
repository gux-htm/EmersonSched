const db = require('../config/db');

// Programs
const createProgram = async (req, res) => {
  try {
    const { name, code, system_type, total_semesters, shift } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO programs (name, code, system_type, total_semesters, shift) VALUES (?, ?, ?, ?, ?)',
      [name, code, system_type, total_semesters, shift]
    );
    
    res.status(201).json({ message: 'Program created', programId: result.insertId });
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Failed to create program' });
  }
};

const getPrograms = async (req, res) => {
  try {
    const [programs] = await db.query('SELECT * FROM programs ORDER BY name');
    res.json({ programs });
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Failed to get programs' });
  }
};

// Majors
const createMajor = async (req, res) => {
  try {
    const { program_id, name, code } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO majors (program_id, name, code) VALUES (?, ?, ?)',
      [program_id, name, code]
    );
    
    res.status(201).json({ message: 'Major created', majorId: result.insertId });
  } catch (error) {
    console.error('Create major error:', error);
    res.status(500).json({ error: 'Failed to create major' });
  }
};

const getMajors = async (req, res) => {
  try {
    const { program_id } = req.query;
    
    let query = `
      SELECT m.*, p.name as program_name 
      FROM majors m 
      JOIN programs p ON m.program_id = p.id
    `;
    const params = [];
    
    if (program_id) {
      query += ' WHERE m.program_id = ?';
      params.push(program_id);
    }
    
    query += ' ORDER BY m.name';
    
    const [majors] = await db.query(query, params);
    res.json({ majors });
  } catch (error) {
    console.error('Get majors error:', error);
    res.status(500).json({ error: 'Failed to get majors' });
  }
};

// Courses
const createCourse = async (req, res) => {
  try {
    const { major_id, name, code, credit_hours, semester, type } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO courses (major_id, name, code, credit_hours, semester, type) VALUES (?, ?, ?, ?, ?, ?)',
      [major_id, name, code, credit_hours, semester, type || 'theory']
    );
    
    res.status(201).json({ message: 'Course created', courseId: result.insertId });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

const getCourses = async (req, res) => {
  try {
    const { major_id, semester } = req.query;
    
    let query = `
      SELECT c.*, m.name as major_name, p.name as program_name 
      FROM courses c
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (major_id) {
      query += ' AND c.major_id = ?';
      params.push(major_id);
    }
    
    if (semester) {
      query += ' AND c.semester = ?';
      params.push(semester);
    }
    
    query += ' ORDER BY c.semester, c.name';
    
    const [courses] = await db.query(query, params);
    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// Sections
const createSection = async (req, res) => {
  try {
    const { major_id, name, semester, student_strength, shift } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO sections (major_id, name, semester, student_strength, shift) VALUES (?, ?, ?, ?, ?)',
      [major_id, name, semester, student_strength, shift]
    );
    
    res.status(201).json({ message: 'Section created', sectionId: result.insertId });
  } catch (error) {
    console.error('Create section error:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
};

const getSections = async (req, res) => {
  try {
    const { major_id, semester, shift } = req.query;
    
    let query = `
      SELECT s.*, m.name as major_name, p.name as program_name 
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE 1=1
    `;
    const params = [];
    
    if (major_id) {
      query += ' AND s.major_id = ?';
      params.push(major_id);
    }
    
    if (semester) {
      query += ' AND s.semester = ?';
      params.push(semester);
    }
    
    if (shift) {
      query += ' AND s.shift = ?';
      params.push(shift);
    }
    
    query += ' ORDER BY s.name';
    
    const [sections] = await db.query(query, params);
    res.json({ sections });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ error: 'Failed to get sections' });
  }
};

// Rooms
const createRoom = async (req, res) => {
  try {
    const { name, type, capacity, building, resources } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO rooms (name, type, capacity, building, resources) VALUES (?, ?, ?, ?, ?)',
      [name, type, capacity, building, JSON.stringify(resources || {})]
    );
    
    res.status(201).json({ message: 'Room created', roomId: result.insertId });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

const getRooms = async (req, res) => {
  try {
    const { type } = req.query;
    
    let query = 'SELECT * FROM rooms';
    const params = [];
    
    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }
    
    query += ' ORDER BY name';
    
    const [rooms] = await db.query(query, params);
    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
};

// Get all instructors
const getInstructors = async (req, res) => {
  try {
    const [instructors] = await db.query(
      "SELECT id, name, email, department, metadata FROM users WHERE role = 'instructor' AND status = 'approved' ORDER BY name"
    );
    
    res.json({ instructors });
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({ error: 'Failed to get instructors' });
  }
};

// Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const [instructorCount] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'instructor' AND status = 'approved'"
    );
    const [studentCount] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE role = 'student' AND status = 'approved'"
    );
    const [courseCount] = await db.query('SELECT COUNT(*) as count FROM courses');
    const [roomCount] = await db.query('SELECT COUNT(*) as count FROM rooms');
    const [pendingCount] = await db.query(
      "SELECT COUNT(*) as count FROM users WHERE status = 'pending'"
    );
    const [blockCount] = await db.query('SELECT COUNT(*) as count FROM blocks');
    
    res.json({
      stats: {
        instructors: instructorCount[0].count,
        students: studentCount[0].count,
        courses: courseCount[0].count,
        rooms: roomCount[0].count,
        pendingApprovals: pendingCount[0].count,
        scheduledClasses: blockCount[0].count
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
};

module.exports = {
  createProgram,
  getPrograms,
  createMajor,
  getMajors,
  createCourse,
  getCourses,
  createSection,
  getSections,
  createRoom,
  getRooms,
  getInstructors,
  getDashboardStats
};
