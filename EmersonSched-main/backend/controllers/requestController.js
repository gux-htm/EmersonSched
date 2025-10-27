const db = require('../config/db');

// ==========================
// POST /api/course-requests
// ==========================
exports.createCourseRequest = async (req, res) => {
  const { courses } = req.body; // Array of { course_id, section_id, major_id, semester, shift, time_slot }
  const adminId = req.user?.id || null;

  if (!courses || !Array.isArray(courses) || courses.length === 0) {
    return res.status(400).json({ message: 'No course data provided.' });
  }

  try {
    const values = courses.map(c => [
      c.course_id,
      c.section_id,
      c.major_id,
      c.semester,
      c.shift || 'morning',
      c.time_slot,
      adminId,
      'pending',
      JSON.stringify({ sent_by: 'admin_bulk' })
    ]);

    const query = `
      INSERT INTO course_requests 
      (course_id, section_id, major_id, semester, shift, time_slot, requested_by, status, preferences)
      VALUES ?
    `;

    await db.query(query, [values]);
    res.status(201).json({ message: 'Course requests sent successfully.' });
  } catch (err) {
    console.error('Error creating course requests:', err);
    res.status(500).json({ message: 'Server error while creating requests.' });
  }
};

// ==========================
// GET /api/course-requests
// ==========================
exports.getAllRequests = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT cr.*, 
             c.name AS course_name,
             s.name AS section_name,
             u.name AS instructor_name,
             m.name AS major_name
      FROM course_requests cr
      LEFT JOIN courses c ON cr.course_id = c.id
      LEFT JOIN sections s ON cr.section_id = s.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      LEFT JOIN majors m ON cr.major_id = m.id
      ORDER BY cr.created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ message: 'Server error while fetching requests.' });
  }
};

// ==========================
// GET /api/course-requests/instructor
// ==========================
exports.getInstructorRequests = async (req, res) => {
  const instructorId = req.user?.id;
  if (!instructorId) return res.status(403).json({ message: 'Unauthorized.' });

  try {
    const [rows] = await db.query(`
      SELECT cr.*, 
             c.name AS course_name, 
             s.name AS section_name,
             m.name AS major_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      LEFT JOIN majors m ON cr.major_id = m.id
      WHERE cr.status = 'pending'
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching instructor requests:', err);
    res.status(500).json({ message: 'Server error while fetching requests.' });
  }
};

// ==========================
// POST /api/course-requests/accept
// ==========================
exports.acceptCourseRequest = async (req, res) => {
  const instructorId = req.user?.id;
  const { request_id } = req.body;

  if (!instructorId) return res.status(403).json({ message: 'Unauthorized.' });
  if (!request_id) return res.status(400).json({ message: 'Request ID required.' });

  try {
    const [[request]] = await db.query('SELECT * FROM course_requests WHERE id = ?', [request_id]);
    if (!request) return res.status(404).json({ message: 'Request not found.' });

    const [[conflict]] = await db.query(`
      SELECT id FROM course_requests 
      WHERE course_id = ? AND section_id = ? 
      AND shift = ? AND time_slot = ? AND status = 'accepted'
    `, [request.course_id, request.section_id, request.shift, request.time_slot]);

    if (conflict) {
      return res.status(409).json({ message: 'This course and slot already assigned.' });
    }

    await db.query(`
      UPDATE course_requests 
      SET status = 'accepted', instructor_id = ?, accepted_at = NOW()
      WHERE id = ?
    `, [instructorId, request_id]);

    res.json({ message: 'Course request accepted successfully.' });
  } catch (err) {
    console.error('Error accepting course request:', err);
    res.status(500).json({ message: 'Server error while accepting request.' });
  }
};
