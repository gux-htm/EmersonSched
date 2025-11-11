const db = require('../config/db');

// ===================== PROGRAMS =====================
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

// ===================== MAJORS =====================
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

// ===================== COURSES & OFFERINGS =====================
const createCourse = async (req, res) => {
  try {
    const { name, code, credit_hours, type, major_id, semester } = req.body;

    // 1. Insert or reuse course
    let [existingCourse] = await db.query('SELECT id FROM courses WHERE code = ?', [code]);
    let courseId;

    if (existingCourse.length > 0) {
      courseId = existingCourse[0].id;
    } else {
      const [insertCourse] = await db.query(
        'INSERT INTO courses (name, code, credit_hours, type) VALUES (?, ?, ?, ?)',
        [name, code, credit_hours, type || 'theory']
      );
      courseId = insertCourse.insertId;
    }

    // 2. Link to major + semester
    await db.query(
      'INSERT INTO course_offerings (course_id, major_id, semester) VALUES (?, ?, ?)',
      [courseId, major_id, semester]
    );

    res.status(201).json({ message: 'Course created and offered', courseId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'This course already exists for the selected major and semester' });
    }
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

const getCourses = async (req, res) => {
  try {
    const { program, major, semester, major_id, shift } = req.query;

    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    let baseWhere = 'WHERE 1=1';
    const filterParams = [];

    // Filter by program name
    if (program) {
      baseWhere += ' AND p.name = ?';
      filterParams.push(program);
    }

    // Filter by major name
    if (major) {
      baseWhere += ' AND m.name = ?';
      filterParams.push(major);
    }

    // Filter by semester
    if (semester) {
      baseWhere += ' AND co.semester = ?';
      filterParams.push(semester);
    }

    // Legacy support for major_id parameter
    if (major_id) {
      baseWhere += ' AND co.major_id = ?';
      filterParams.push(major_id);
    }

    // Filter by program shift (e.g., morning/evening)
    if (shift) {
      baseWhere += ' AND p.shift = ?';
      filterParams.push(shift);
    }

    // Count total distinct courses for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) AS total
      FROM courses c
      LEFT JOIN course_offerings co ON c.id = co.course_id
      LEFT JOIN majors m ON co.major_id = m.id
      LEFT JOIN programs p ON m.program_id = p.id
      ${baseWhere}
    `;
    const [countRows] = await db.query(countQuery, filterParams);
    const totalRecords = countRows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

    // Fetch paginated data
    const dataQuery = `
      SELECT c.id, c.name, c.code, c.credit_hours, c.type,
             GROUP_CONCAT(DISTINCT co.semester SEPARATOR ', ') as semesters,
             GROUP_CONCAT(DISTINCT m.name SEPARATOR ', ') as major_names,
             GROUP_CONCAT(DISTINCT p.name SEPARATOR ', ') as program_names
      FROM courses c
      LEFT JOIN course_offerings co ON c.id = co.course_id
      LEFT JOIN majors m ON co.major_id = m.id
      LEFT JOIN programs p ON m.program_id = p.id
      ${baseWhere}
      GROUP BY c.id
      ORDER BY c.name
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...filterParams, limit, offset];
    const [rows] = await db.query(dataQuery, dataParams);

    res.json({
      data: rows,
      totalPages,
      currentPage: page,
      totalRecords
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
};

// Update Course (name, code, credit_hours, type) and optionally offering (major_id, semester)
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, credit_hours, type } = req.body;
    await db.query(
      'UPDATE courses SET name = ?, code = ?, credit_hours = ?, type = ? WHERE id = ?',
      [name, code, credit_hours, type, id]
    );
    res.json({ message: 'Course updated' });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM courses WHERE id = ?', [id]);
    res.json({ message: 'Course deleted' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

// ===================== SECTIONS =====================
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
    const { major_id, semester, shift, program, major } = req.query;

    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    let baseWhere = 'WHERE 1=1';
    const filterParams = [];

    if (major_id) {
      baseWhere += ' AND s.major_id = ?';
      filterParams.push(major_id);
    }

    // Filter by program name
    if (program) {
      baseWhere += ' AND p.name = ?';
      filterParams.push(program);
    }

    // Filter by major name
    if (major) {
      baseWhere += ' AND m.name = ?';
      filterParams.push(major);
    }

    if (semester) {
      baseWhere += ' AND s.semester = ?';
      filterParams.push(semester);
    }

    if (shift) {
      baseWhere += ' AND s.shift = ?';
      filterParams.push(shift);
    }

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${baseWhere}
    `;
    const [countRows] = await db.query(countQuery, filterParams);
    const totalRecords = countRows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

    const dataQuery = `
      SELECT s.*, m.name as major_name, p.name as program_name 
      FROM sections s
      JOIN majors m ON s.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${baseWhere}
      ORDER BY s.name
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...filterParams, limit, offset];
    const [rows] = await db.query(dataQuery, dataParams);

    res.json({
      data: rows,
      totalPages,
      currentPage: page,
      totalRecords
    });
  } catch (error) {
    console.error('Get sections error:', error);
    res.status(500).json({ error: 'Failed to get sections' });
  }
};

const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { major_id, name, semester, student_strength, shift } = req.body;

    // Defensive checks
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Section id is required and must be a number' });
    }

    const [result] = await db.query(
      'UPDATE sections SET major_id = ?, name = ?, semester = ?, student_strength = ?, shift = ? WHERE id = ? LIMIT 1',
      [major_id, name, semester, student_strength, shift, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ message: 'Section updated', id });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
};

const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    // Defensive checks
    if (!id || isNaN(Number(id))) {
      return res.status(400).json({ error: 'Section id is required and must be a number' });
    }

    const [result] = await db.query('DELETE FROM sections WHERE id = ? LIMIT 1', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json({ message: 'Section deleted', id });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
};

// ===================== ROOMS =====================
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

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, building, resources } = req.body;
    await db.query(
      'UPDATE rooms SET name = ?, type = ?, capacity = ?, building = ?, resources = ? WHERE id = ?',
      [name, type, capacity, building, JSON.stringify(resources || {}), id]
    );
    res.json({ message: 'Room updated' });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM rooms WHERE id = ?', [id]);
    res.json({ message: 'Room deleted' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

// ===================== INSTRUCTORS =====================
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

// ===================== DASHBOARD =====================
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
  updateCourse,
  deleteCourse,
  createSection,
  getSections,
  updateSection,
  deleteSection,
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  getInstructors,
  getDashboardStats
};
