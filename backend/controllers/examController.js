const db = require('../config/db');

// Create exam schedule
const createExam = async (req, res) => {
  try {
    const { 
      course_id, 
      section_id, 
      room_id, 
      invigilator_id, 
      exam_type, 
      exam_date, 
      start_time, 
      end_time,
      mode 
    } = req.body;
    
    // Check for conflicts
    const [conflicts] = await db.query(
      `SELECT COUNT(*) as count FROM exams 
       WHERE exam_date = ? 
       AND ((start_time < ? AND end_time > ?) OR (start_time < ? AND end_time > ?))
       AND (room_id = ? OR invigilator_id = ?)`,
      [exam_date, end_time, start_time, start_time, end_time, room_id, invigilator_id]
    );
    
    if (conflicts[0].count > 0) {
      return res.status(400).json({ error: 'Conflict detected with existing exam schedule' });
    }
    
    // Insert exam
    const [result] = await db.query(
      'INSERT INTO exams (course_id, section_id, room_id, invigilator_id, exam_type, exam_date, start_time, end_time, mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [course_id, section_id, room_id, invigilator_id, exam_type, exam_date, start_time, end_time, mode || 'match']
    );
    
    res.status(201).json({ message: 'Exam scheduled successfully', examId: result.insertId });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ error: 'Failed to create exam' });
  }
};

// Generate exam schedule with auto-assignment
const generateExamSchedule = async (req, res) => {
  try {
    const { 
      exam_type, 
      start_date, 
      end_date, 
      working_hours_start, 
      working_hours_end,
      mode, // 'match' or 'shuffle'
      semester 
    } = req.body;
    
    // Get all courses for the semester
    const [courses] = await db.query(
      `SELECT c.*, s.id as section_id, s.shift 
       FROM courses c 
       CROSS JOIN sections s 
       WHERE c.semester = s.semester AND c.semester = ?`,
      [semester]
    );
    
    // Get all available rooms
    const [rooms] = await db.query('SELECT * FROM rooms ORDER BY capacity DESC');
    
    // Get all instructors
    const [instructors] = await db.query(
      "SELECT id FROM users WHERE role = 'instructor' AND status = 'approved'"
    );
    
    if (rooms.length === 0 || instructors.length === 0) {
      return res.status(400).json({ error: 'No rooms or instructors available' });
    }
    
    const exams = [];
    let currentDate = new Date(start_date);
    const endDate = new Date(end_date);
    let roomIndex = 0;
    let instructorIndex = 0;
    
    for (const course of courses) {
      if (currentDate > endDate) break;
      
      // Assign room
      const room = rooms[roomIndex % rooms.length];
      roomIndex++;
      
      // Assign invigilator
      let invigilator;
      if (mode === 'match') {
        // Try to get course instructor from blocks
        const [blocks] = await db.query(
          'SELECT teacher_id FROM blocks WHERE course_id = ? AND section_id = ? LIMIT 1',
          [course.id, course.section_id]
        );
        
        if (blocks.length > 0) {
          invigilator = blocks[0].teacher_id;
        } else {
          invigilator = instructors[instructorIndex % instructors.length].id;
          instructorIndex++;
        }
      } else {
        // Shuffle mode - random assignment
        invigilator = instructors[instructorIndex % instructors.length].id;
        instructorIndex++;
      }
      
      exams.push([
        course.id,
        course.section_id,
        room.id,
        invigilator,
        exam_type,
        currentDate.toISOString().split('T')[0],
        working_hours_start,
        working_hours_end,
        mode
      ]);
      
      // Move to next slot
      if (roomIndex % rooms.length === 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    // Insert exams
    if (exams.length > 0) {
      await db.query(
        'INSERT INTO exams (course_id, section_id, room_id, invigilator_id, exam_type, exam_date, start_time, end_time, mode) VALUES ?',
        [exams]
      );
    }
    
    res.json({ 
      message: 'Exam schedule generated successfully',
      examsCreated: exams.length
    });
  } catch (error) {
    console.error('Generate exam schedule error:', error);
    res.status(500).json({ error: 'Failed to generate exam schedule' });
  }
};

// Get exams
const getExams = async (req, res) => {
  try {
    const { exam_type, section_id, invigilator_id, exam_date } = req.query;
    
    let query = `
      SELECT e.*,
             c.name as course_name, c.code as course_code,
             s.name as section_name,
             r.name as room_name,
             u.name as invigilator_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON e.section_id = s.id
      JOIN rooms r ON e.room_id = r.id
      LEFT JOIN users u ON e.invigilator_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (exam_type) {
      query += ' AND e.exam_type = ?';
      params.push(exam_type);
    }
    
    if (section_id) {
      query += ' AND e.section_id = ?';
      params.push(section_id);
    }
    
    if (invigilator_id) {
      query += ' AND e.invigilator_id = ?';
      params.push(invigilator_id);
    }
    
    if (exam_date) {
      query += ' AND e.exam_date = ?';
      params.push(exam_date);
    }
    
    query += ' ORDER BY e.exam_date, e.start_time';
    
    const [exams] = await db.query(query, params);
    res.json({ exams });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Failed to get exams' });
  }
};

// Reset exam schedule
const resetExams = async (req, res) => {
  try {
    const { type } = req.body; // 'invigilators', 'full'
    
    if (type === 'invigilators') {
      // Reassign invigilators randomly
      const [exams] = await db.query('SELECT id FROM exams');
      const [instructors] = await db.query(
        "SELECT id FROM users WHERE role = 'instructor' AND status = 'approved'"
      );
      
      for (let i = 0; i < exams.length; i++) {
        const instructor = instructors[i % instructors.length];
        await db.query('UPDATE exams SET invigilator_id = ? WHERE id = ?', [instructor.id, exams[i].id]);
      }
      
      res.json({ message: 'Invigilators reassigned successfully' });
    } else if (type === 'full') {
      await db.query('DELETE FROM exams');
      res.json({ message: 'All exams deleted successfully' });
    }
  } catch (error) {
    console.error('Reset exams error:', error);
    res.status(500).json({ error: 'Failed to reset exams' });
  }
};

module.exports = {
  createExam,
  generateExamSchedule,
  getExams,
  resetExams
};
