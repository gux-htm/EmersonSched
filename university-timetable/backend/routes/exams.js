const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { validateExam, validate } = require('../utils/validation');
const { sendExamScheduleEmail } = require('../utils/email');

const router = express.Router();

// Get all exams
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { exam_type, date_from, date_to } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (exam_type) {
      whereClause += ' AND e.exam_type = ?';
      params.push(exam_type);
    }
    
    if (date_from) {
      whereClause += ' AND e.exam_date >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      whereClause += ' AND e.exam_date <= ?';
      params.push(date_to);
    }
    
    const result = await executeQuery(`
      SELECT e.*, 
             c.name as course_name, c.code, c.credit_hours,
             s.name as section_name, s.student_strength,
             r.name as room_name, r.type as room_type, r.capacity,
             u.name as invigilator_name, u.email as invigilator_email
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON c.major_id = s.major_id AND c.shift = s.shift
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      ${whereClause}
      ORDER BY e.exam_date, e.start_time
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch exams'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create exam session
router.post('/session', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      exam_type, 
      duration, 
      date_range, 
      working_hours, 
      mode,
      courses = [],
      rooms = []
    } = req.body;
    
    if (!exam_type || !duration || !date_range || !working_hours || !mode) {
      return res.status(400).json({
        success: false,
        message: 'All exam session fields are required'
      });
    }
    
    if (!['match', 'shuffle'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Mode must be either "match" or "shuffle"'
      });
    }
    
    // Generate exam schedule
    const examSchedule = await generateExamSchedule(
      exam_type,
      duration,
      date_range,
      working_hours,
      mode,
      courses,
      rooms
    );
    
    if (examSchedule.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid exam schedule could be generated'
      });
    }
    
    // Insert exams
    const values = examSchedule.map(exam => 
      `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).join(', ');
    const params = examSchedule.flat();
    
    const result = await executeQuery(
      `INSERT INTO exams (course_id, room_id, invigilator_id, exam_type, exam_date, start_time, end_time, duration, mode) VALUES ${values}`,
      params
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create exam schedule'
      });
    }
    
    // Send notifications to students
    await sendExamNotifications(examSchedule);
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_EXAM_SESSION', 'exams', 'bulk', JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      success: true,
      message: 'Exam session created successfully',
      data: {
        totalExams: examSchedule.length,
        examType: exam_type,
        mode: mode
      }
    });
    
  } catch (error) {
    console.error('Create exam session error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Generate exam schedule
const generateExamSchedule = async (examType, duration, dateRange, workingHours, mode, courses, rooms) => {
  const exams = [];
  const { start_date, end_date } = dateRange;
  const { start_time, end_time } = workingHours;
  
  // Get all courses if not specified
  let coursesToSchedule = courses;
  if (courses.length === 0) {
    const coursesResult = await executeQuery(`
      SELECT c.*, s.id as section_id, s.name as section_name, s.student_strength
      FROM courses c
      JOIN sections s ON c.major_id = s.major_id AND c.shift = s.shift
    `);
    coursesToSchedule = coursesResult.data;
  }
  
  // Get available rooms if not specified
  let availableRooms = rooms;
  if (rooms.length === 0) {
    const roomsResult = await executeQuery('SELECT * FROM rooms ORDER BY capacity ASC');
    availableRooms = roomsResult.data;
  }
  
  // Get available instructors
  const instructorsResult = await executeQuery(`
    SELECT u.id, u.name, u.email, u.metadata
    FROM users u
    WHERE u.role = 'instructor' AND u.status = 'approved'
  `);
  
  if (!instructorsResult.success) {
    return [];
  }
  
  const instructors = instructorsResult.data;
  
  // Generate exam dates
  const examDates = generateExamDates(start_date, end_date, duration);
  
  let currentDateIndex = 0;
  let currentTime = new Date(`2000-01-01 ${start_time}`);
  const endTime = new Date(`2000-01-01 ${end_time}`);
  
  for (const course of coursesToSchedule) {
    if (currentDateIndex >= examDates.length) break;
    
    const examDate = examDates[currentDateIndex];
    const examStartTime = currentTime.toTimeString().slice(0, 5);
    const examEndTime = new Date(currentTime.getTime() + duration * 60000).toTimeString().slice(0, 5);
    
    // Find suitable room
    const suitableRoom = availableRooms.find(room => 
      room.capacity >= course.student_strength
    );
    
    if (!suitableRoom) continue;
    
    // Assign invigilator based on mode
    let invigilatorId;
    if (mode === 'match') {
      // Find course instructor
      const courseInstructor = await findCourseInstructor(course.id);
      invigilatorId = courseInstructor || instructors[0].id;
    } else {
      // Shuffle mode - random assignment
      invigilatorId = instructors[Math.floor(Math.random() * instructors.length)].id;
    }
    
    exams.push({
      course_id: course.id,
      room_id: suitableRoom.id,
      invigilator_id: invigilatorId,
      exam_type: examType,
      exam_date: examDate,
      start_time: examStartTime,
      end_time: examEndTime,
      duration: duration,
      mode: mode
    });
    
    // Move to next time slot
    currentTime = new Date(currentTime.getTime() + duration * 60000);
    
    // Check if we need to move to next day
    if (currentTime >= endTime) {
      currentTime = new Date(`2000-01-01 ${start_time}`);
      currentDateIndex++;
    }
  }
  
  return exams;
};

// Find course instructor
const findCourseInstructor = async (courseId) => {
  const result = await executeQuery(`
    SELECT u.id
    FROM users u
    JOIN course_requests cr ON u.id = cr.instructor_id
    WHERE cr.course_id = ? AND cr.status = 'accepted'
    LIMIT 1
  `, [courseId]);
  
  return result.success && result.data.length > 0 ? result.data[0].id : null;
};

// Generate exam dates
const generateExamDates = (startDate, endDate, duration) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }
  
  return dates;
};

// Send exam notifications
const sendExamNotifications = async (exams) => {
  for (const exam of exams) {
    // Get course and section details
    const courseResult = await executeQuery(`
      SELECT c.name as course_name, s.name as section_name
      FROM courses c
      JOIN sections s ON c.major_id = s.major_id AND c.shift = s.shift
      WHERE c.id = ?
    `, [exam.course_id]);
    
    if (!courseResult.success) continue;
    
    const course = courseResult.data[0];
    
    // Get room details
    const roomResult = await executeQuery(
      'SELECT name FROM rooms WHERE id = ?',
      [exam.room_id]
    );
    
    if (!roomResult.success) continue;
    
    // Get invigilator details
    const invigilatorResult = await executeQuery(
      'SELECT name FROM users WHERE id = ?',
      [exam.invigilator_id]
    );
    
    if (!invigilatorResult.success) continue;
    
    // Get students for this section
    const studentsResult = await executeQuery(`
      SELECT u.email, u.name
      FROM users u
      WHERE u.role = 'student' AND JSON_EXTRACT(u.metadata, '$.section') = ?
    `, [course.section_name]);
    
    if (studentsResult.success) {
      for (const student of studentsResult.data) {
        await sendExamScheduleEmail(student.email, student.name, {
          courseName: course.course_name,
          examDate: exam.exam_date,
          startTime: exam.start_time,
          endTime: exam.end_time,
          roomName: roomResult.data[0].name,
          invigilatorName: invigilatorResult.data[0].name
        });
      }
    }
  }
};

// Get exam by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await executeQuery(`
      SELECT e.*, 
             c.name as course_name, c.code, c.credit_hours,
             s.name as section_name, s.student_strength,
             r.name as room_name, r.type as room_type, r.capacity,
             u.name as invigilator_name, u.email as invigilator_email
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN sections s ON c.major_id = s.major_id AND c.shift = s.shift
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      WHERE e.id = ?
    `, [id]);
    
    if (!result.success || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    res.json({
      success: true,
      data: result.data[0]
    });
    
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update exam
router.put('/:id', authenticateToken, requireAdmin, validate(validateExam), async (req, res) => {
  try {
    const { id } = req.params;
    const { course_id, room_id, invigilator_id, exam_type, exam_date, start_time, end_time, duration, mode } = req.body;
    
    // Check if exam exists
    const existingResult = await executeQuery(
      'SELECT * FROM exams WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    // Check for conflicts
    const conflictCheck = await executeQuery(`
      SELECT e.id, c.name as course_name, r.name as room_name, u.name as invigilator_name
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      WHERE e.room_id = ? AND e.exam_date = ? AND e.id != ?
      AND (
        (e.start_time <= ? AND e.end_time > ?) OR
        (e.start_time < ? AND e.end_time >= ?) OR
        (e.start_time >= ? AND e.end_time <= ?)
      )
    `, [room_id, exam_date, id, start_time, start_time, end_time, end_time, start_time, end_time]);
    
    if (conflictCheck.success && conflictCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Exam time conflict detected',
        conflicts: conflictCheck.data
      });
    }
    
    const result = await executeQuery(
      'UPDATE exams SET course_id = ?, room_id = ?, invigilator_id = ?, exam_type = ?, exam_date = ?, start_time = ?, end_time = ?, duration = ?, mode = ? WHERE id = ?',
      [course_id, room_id, invigilator_id, exam_type, exam_date, start_time, end_time, duration, mode, id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update exam'
      });
    }
    
    // Log update
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'UPDATE_EXAM', 'exams', id, JSON.stringify(existingResult.data[0]), JSON.stringify(req.body)]
    );
    
    res.json({
      success: true,
      message: 'Exam updated successfully'
    });
    
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete exam
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if exam exists
    const existingResult = await executeQuery(
      'SELECT * FROM exams WHERE id = ?',
      [id]
    );
    
    if (!existingResult.success || existingResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }
    
    const result = await executeQuery(
      'DELETE FROM exams WHERE id = ?',
      [id]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete exam'
      });
    }
    
    // Log deletion
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'DELETE_EXAM', 'exams', id, JSON.stringify(existingResult.data[0])]
    );
    
    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset exam operations
router.post('/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { operation_type, description } = req.body;
    
    if (!['exam_slots', 'invigilators', 'full_reset'].includes(operation_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation type'
      });
    }
    
    let queries = [];
    
    switch (operation_type) {
      case 'exam_slots':
        queries.push({ query: 'UPDATE exams SET exam_date = NULL, start_time = NULL, end_time = NULL', params: [] });
        break;
      case 'invigilators':
        queries.push({ query: 'UPDATE exams SET invigilator_id = NULL', params: [] });
        break;
      case 'full_reset':
        queries.push({ query: 'DELETE FROM exams', params: [] });
        break;
    }
    
    // Execute reset operations
    for (const { query, params } of queries) {
      await executeQuery(query, params);
    }
    
    // Log reset operation
    await executeQuery(
      'INSERT INTO reset_operations (admin_id, operation_type, description) VALUES (?, ?, ?)',
      [req.user.id, `EXAM_${operation_type.toUpperCase()}`, description || '']
    );
    
    res.json({
      success: true,
      message: `Exam ${operation_type.replace('_', ' ')} reset completed successfully`
    });
    
  } catch (error) {
    console.error('Reset exam operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get exam statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const statsResult = await executeQuery(`
      SELECT 
        exam_type,
        COUNT(*) as count,
        COUNT(CASE WHEN exam_date >= CURDATE() THEN 1 END) as upcoming,
        COUNT(CASE WHEN exam_date < CURDATE() THEN 1 END) as completed
      FROM exams 
      GROUP BY exam_type
    `);
    
    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch exam statistics'
      });
    }
    
    // Get total exams
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM exams');
    
    res.json({
      success: true,
      data: {
        total: totalResult.data[0].total,
        byType: statsResult.data
      }
    });
    
  } catch (error) {
    console.error('Get exam stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;