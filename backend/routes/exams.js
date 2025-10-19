const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all exam routes
router.use(authenticateToken);

// Create exam session (Admin only)
router.post('/sessions', requireRole(['admin']), [
  body('name').trim().notEmpty().withMessage('Session name required'),
  body('exam_type').isIn(['midterm', 'final', 'supplementary']).withMessage('Invalid exam type'),
  body('duration').isInt({ min: 30, max: 480 }).withMessage('Duration must be 30-480 minutes'),
  body('start_date').isISO8601().withMessage('Valid start date required'),
  body('end_date').isISO8601().withMessage('Valid end date required'),
  body('working_hours').isObject().withMessage('Working hours required'),
  body('mode').isIn(['match', 'shuffle']).withMessage('Invalid mode')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, exam_type, duration, start_date, end_date, working_hours, mode } = req.body;

    // Deactivate existing sessions
    await pool.execute('UPDATE exam_sessions SET is_active = 0');

    const [result] = await pool.execute(
      'INSERT INTO exam_sessions (name, exam_type, duration, start_date, end_date, working_hours, mode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, exam_type, duration, start_date, end_date, JSON.stringify(working_hours), mode]
    );

    res.status(201).json({
      success: true,
      message: 'Exam session created successfully',
      data: { id: result.insertId, name, exam_type, mode }
    });
  } catch (error) {
    console.error('Create exam session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create exam session'
    });
  }
});

// Get exam sessions
router.get('/sessions', async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      'SELECT * FROM exam_sessions WHERE is_active = 1 ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: sessions.map(session => ({
        ...session,
        working_hours: JSON.parse(session.working_hours || '{}')
      }))
    });
  } catch (error) {
    console.error('Get exam sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam sessions'
    });
  }
});

// Generate exam schedule (Admin only)
router.post('/generate', requireRole(['admin']), async (req, res) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required'
      });
    }

    // Get exam session
    const [sessions] = await pool.execute(
      'SELECT * FROM exam_sessions WHERE id = ? AND is_active = 1',
      [session_id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam session not found'
      });
    }

    const session = sessions[0];
    const workingHours = JSON.parse(session.working_hours);

    // Clear existing exams for this session
    await pool.execute('DELETE FROM exams WHERE exam_session_id = ?', [session_id]);

    // Get all courses
    const [courses] = await pool.execute(
      'SELECT * FROM courses WHERE is_active = 1 ORDER BY semester, name'
    );

    // Get available rooms
    const [rooms] = await pool.execute(
      'SELECT * FROM rooms WHERE is_active = 1 ORDER BY capacity'
    );

    // Get instructors
    const [instructors] = await pool.execute(
      'SELECT * FROM users WHERE role = "instructor" AND is_approved = 1'
    );

    // Generate exam schedule
    const exams = await generateExamSchedule(session, courses, rooms, instructors, workingHours);

    if (exams.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate exam schedule - no suitable slots found'
      });
    }

    // Insert exams
    for (const exam of exams) {
      await pool.execute(
        'INSERT INTO exams (exam_session_id, course_id, room_id, invigilator_id, exam_date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [exam.exam_session_id, exam.course_id, exam.room_id, exam.invigilator_id, exam.exam_date, exam.start_time, exam.end_time]
      );
    }

    res.json({
      success: true,
      message: `Exam schedule generated successfully with ${exams.length} exams`,
      data: { examCount: exams.length }
    });
  } catch (error) {
    console.error('Generate exam schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate exam schedule'
    });
  }
});

// Get exams
router.get('/', async (req, res) => {
  try {
    const { session_id, course_id, date } = req.query;
    let query = `
      SELECT e.*, c.name as course_name, c.code as course_code,
             r.name as room_name, r.type as room_type, r.capacity,
             u.name as invigilator_name, es.name as session_name, es.exam_type
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      JOIN rooms r ON e.room_id = r.id
      JOIN users u ON e.invigilator_id = u.id
      JOIN exam_sessions es ON e.exam_session_id = es.id
      WHERE 1=1
    `;
    const params = [];

    if (session_id) {
      query += ' AND e.exam_session_id = ?';
      params.push(session_id);
    }

    if (course_id) {
      query += ' AND e.course_id = ?';
      params.push(course_id);
    }

    if (date) {
      query += ' AND e.exam_date = ?';
      params.push(date);
    }

    query += ' ORDER BY e.exam_date, e.start_time';

    const [exams] = await pool.execute(query, params);

    res.json({
      success: true,
      data: exams
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exams'
    });
  }
});

// Reset exam schedule (Admin only)
router.post('/reset', requireRole(['admin']), [
  body('reset_type').isIn(['slots', 'invigilators', 'full']).withMessage('Invalid reset type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { reset_type, session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: 'Session ID required'
      });
    }

    let message = '';

    switch (reset_type) {
      case 'slots':
        // Reset only time slots - keep invigilators but reassign times
        await pool.execute(
          'UPDATE exams SET exam_date = NULL, start_time = NULL, end_time = NULL WHERE exam_session_id = ?',
          [session_id]
        );
        message = 'Exam time slots reset successfully';
        break;

      case 'invigilators':
        // Reset invigilators - keep times but reassign invigilators
        await pool.execute(
          'UPDATE exams SET invigilator_id = NULL WHERE exam_session_id = ?',
          [session_id]
        );
        message = 'Exam invigilators reset successfully';
        break;

      case 'full':
        // Full reset - remove all exams
        await pool.execute('DELETE FROM exams WHERE exam_session_id = ?', [session_id]);
        message = 'Exam schedule fully reset successfully';
        break;
    }

    // Log the reset action
    await pool.execute(
      'INSERT INTO audit_logs (admin_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'reset_exam_schedule', JSON.stringify({
        reset_type,
        session_id,
        timestamp: new Date().toISOString()
      })]
    );

    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Reset exam schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset exam schedule'
    });
  }
});

// Helper function to generate exam schedule
async function generateExamSchedule(session, courses, rooms, instructors, workingHours) {
  const exams = [];
  const usedSlots = new Set();
  const invigilatorWorkload = new Map();

  // Initialize invigilator workload
  instructors.forEach(instructor => {
    invigilatorWorkload.set(instructor.id, 0);
  });

  // Generate available time slots based on working hours
  const availableSlots = generateTimeSlots(session.start_date, session.end_date, workingHours, session.duration);

  // Sort courses by priority (lower semester first, then by name)
  courses.sort((a, b) => {
    if (a.semester !== b.semester) {
      return a.semester - b.semester;
    }
    return a.name.localeCompare(b.name);
  });

  // Assign exams
  for (const course of courses) {
    let assigned = false;

    for (const slot of availableSlots) {
      const slotKey = `${slot.date}-${slot.start_time}`;

      if (usedSlots.has(slotKey)) {
        continue;
      }

      // Find suitable room
      const suitableRooms = rooms.filter(room => 
        room.capacity >= 30 // Minimum capacity for exams
      );

      if (suitableRooms.length === 0) {
        continue;
      }

      // Select invigilator based on mode
      let invigilator = null;

      if (session.mode === 'match') {
        // Match mode: find course instructor
        // This would require a course-instructor mapping table
        // For now, assign randomly
        invigilator = instructors[Math.floor(Math.random() * instructors.length)];
      } else {
        // Shuffle mode: assign least loaded invigilator
        const sortedInstructors = Array.from(invigilatorWorkload.entries())
          .sort((a, b) => a[1] - b[1]);
        invigilator = instructors.find(i => i.id === sortedInstructors[0][0]);
      }

      if (!invigilator) {
        continue;
      }

      // Check invigilator availability (simplified - no double booking check)
      const invigilatorKey = `${invigilator.id}-${slot.date}-${slot.start_time}`;
      if (usedSlots.has(invigilatorKey)) {
        continue;
      }

      // Assign the exam
      const endTime = addMinutes(slot.start_time, session.duration);
      
      exams.push({
        exam_session_id: session.id,
        course_id: course.id,
        room_id: suitableRooms[0].id,
        invigilator_id: invigilator.id,
        exam_date: slot.date,
        start_time: slot.start_time,
        end_time: endTime
      });

      usedSlots.add(slotKey);
      usedSlots.add(invigilatorKey);
      invigilatorWorkload.set(invigilator.id, invigilatorWorkload.get(invigilator.id) + 1);
      assigned = true;
      break;
    }

    if (!assigned) {
      console.warn(`Could not assign exam for course: ${course.name}`);
    }
  }

  return exams;
}

// Helper function to generate time slots
function generateTimeSlots(startDate, endDate, workingHours, duration) {
  const slots = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    
    if (workingHours[dayOfWeek]) {
      const { start_time, end_time } = workingHours[dayOfWeek];
      const startTime = new Date(`${date.toISOString().split('T')[0]}T${start_time}`);
      const endTime = new Date(`${date.toISOString().split('T')[0]}T${end_time}`);

      let currentTime = new Date(startTime);
      while (currentTime < endTime) {
        const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
        
        if (slotEndTime <= endTime) {
          slots.push({
            date: date.toISOString().split('T')[0],
            start_time: currentTime.toTimeString().slice(0, 5),
            end_time: slotEndTime.toTimeString().slice(0, 5)
          });
        }

        currentTime = new Date(slotEndTime.getTime() + 30 * 60000); // 30 min break
      }
    }
  }

  return slots;
}

// Helper function to add minutes to time string
function addMinutes(timeString, minutes) {
  const [hours, mins] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);
  return date.toTimeString().slice(0, 5);
}

module.exports = router;