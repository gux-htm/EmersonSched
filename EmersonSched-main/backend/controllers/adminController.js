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
  const connection = await db.getConnection();
  try {
    const { name, code, credit_hours, type, major_ids, applies_to_all_programs } = req.body;

    await connection.beginTransaction();

    // 1. Insert course
    const [insertCourse] = await connection.query(
      'INSERT INTO courses (name, code, credit_hours, type) VALUES (?, ?, ?, ?)',
      [name, code, credit_hours, type || 'theory']
    );
    const courseId = insertCourse.insertId;

    // 2. Link to majors
    if (applies_to_all_programs) {
        const [bsMajors] = await connection.query(`
            SELECT m.id FROM majors m
            JOIN programs p ON m.program_id = p.id
            WHERE p.name LIKE 'BS-%'
        `);
        if (bsMajors.length > 0) {
            const majorMappings = bsMajors.map(major => [courseId, major.id, 1]);
            await connection.query(
                'INSERT INTO course_major_map (course_id, major_id, applies_to_all_programs) VALUES ?',
                [majorMappings]
            );
        }
    } else if (major_ids && major_ids.length > 0) {
      const majorMappings = major_ids.map(majorId => [courseId, majorId, 0]);
      await connection.query(
        'INSERT INTO course_major_map (course_id, major_id, applies_to_all_programs) VALUES ?',
        [majorMappings]
      );
    }

    await connection.commit();

    res.status(201).json({ message: 'Course created successfully', courseId });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  } finally {
    if (connection) connection.release();
  }
};

const getCourses = async (req, res) => {
  try {
    const { program, major, search } = req.query;

    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const offset = (page - 1) * limit;

    let whereClauses = [];
    const params = [];

    if (program) {
      whereClauses.push('p.id = ?');
      params.push(program);
    }

    if (major) {
      whereClauses.push('m.id = ?');
      params.push(major);
    }

    if (search) {
      whereClauses.push('(c.name LIKE ? OR c.code LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(DISTINCT c.id) AS total
      FROM courses c
      LEFT JOIN course_major_map cmm ON c.id = cmm.course_id
      LEFT JOIN majors m ON cmm.major_id = m.id
      LEFT JOIN programs p ON m.program_id = p.id
      ${whereString}
    `;
    const [countRows] = await db.query(countQuery, params);
    const totalRecords = countRows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

    const dataQuery = `
      SELECT c.id, c.name, c.code, c.credit_hours, c.type,
             GROUP_CONCAT(DISTINCT m.name SEPARATOR ', ') as major_names,
             GROUP_CONCAT(DISTINCT p.name SEPARATOR ', ') as program_names
      FROM courses c
      LEFT JOIN course_major_map cmm ON c.id = cmm.course_id
      LEFT JOIN majors m ON cmm.major_id = m.id
      LEFT JOIN programs p ON m.program_id = p.id
      ${whereString}
      GROUP BY c.id
      ORDER BY c.name
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...params, limit, offset];
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

const assignCoursesToSection = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id: section_id } = req.params;
        const { course_ids, semester, intake, shift, academic_year } = req.body;
        const created_by = req.user.id;

        await connection.beginTransaction();

        const newOfferingIds = [];
        for (const course_id of course_ids) {
            // Check for duplicates
            const [existing] = await connection.query(
                'SELECT id FROM course_offerings WHERE section_id = ? AND course_id = ? AND semester = ?',
                [section_id, course_id, semester]
            );

            if (existing.length > 0) {
                continue; // Skip duplicate
            }

            const [offeringResult] = await connection.query(
                'INSERT INTO course_offerings (course_id, section_id, semester, intake, shift, academic_year, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [course_id, section_id, semester, intake, shift, academic_year, created_by]
            );
            const offering_id = offeringResult.insertId;
            newOfferingIds.push(offering_id);

            await connection.query(
                'INSERT INTO section_course_history (section_id, offering_id, status) VALUES (?, ?, ?)',
                [section_id, offering_id, 'pending']
            );
        }

        await connection.commit();

        res.status(201).json({ message: 'Courses assigned successfully', offeringIds: newOfferingIds });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Assign courses to section error:', error);
        res.status(500).json({ error: 'Failed to assign courses' });
    } finally {
        if (connection) connection.release();
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

const promoteSection = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { id: section_id } = req.params;
        const { new_semester, promote_courses } = req.body;
        const created_by = req.user.id;

        await connection.beginTransaction();

        // Get current offerings for the section
        const [currentOfferings] = await connection.query(
            'SELECT * FROM course_offerings WHERE section_id = ?',
            [section_id]
        );

        if (promote_courses) {
            for (const offering of currentOfferings) {
                const [newOfferingResult] = await connection.query(
                    'INSERT INTO course_offerings (course_id, section_id, semester, intake, shift, academic_year, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [offering.course_id, section_id, new_semester, offering.intake, offering.shift, offering.academic_year, created_by]
                );
                const new_offering_id = newOfferingResult.insertId;

                await connection.query(
                    'INSERT INTO section_course_history (section_id, offering_id, status) VALUES (?, ?, ?)',
                    [section_id, new_offering_id, 'pending']
                );
            }
        }

        // Update the section's semester
        await connection.query(
            'UPDATE sections SET semester = ? WHERE id = ?',
            [new_semester, section_id]
        );

        await connection.commit();

        res.json({ message: 'Section promoted successfully' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Promote section error:', error);
        res.status(500).json({ error: 'Failed to promote section' });
    } finally {
        if (connection) connection.release();
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
  assignCoursesToSection,
  promoteSection,
  createRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  getInstructors,
  getDashboardStats
};
