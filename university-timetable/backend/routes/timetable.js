const express = require('express');
const { executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin, requireInstructor } = require('../middleware/auth');
const { validateCourseRequest, validateReschedule, validate } = require('../utils/validation');
const { sendTimetableUpdateEmail, sendRescheduleEmail } = require('../utils/email');

const router = express.Router();

// Get university timings
router.get('/timings', authenticateToken, async (req, res) => {
  try {
    const result = await executeQuery(
      'SELECT * FROM university_timings ORDER BY created_at DESC LIMIT 1'
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch university timings'
      });
    }
    
    res.json({
      success: true,
      data: result.data[0] || null
    });
    
  } catch (error) {
    console.error('Get timings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Set university timings
router.post('/timings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { opening_time, closing_time, break_duration, slot_length, working_days } = req.body;
    
    // Validate timings
    if (!opening_time || !closing_time || !break_duration || !slot_length || !working_days) {
      return res.status(400).json({
        success: false,
        message: 'All timing fields are required'
      });
    }
    
    // Insert new timings
    const result = await executeQuery(
      'INSERT INTO university_timings (opening_time, closing_time, break_duration, slot_length, working_days) VALUES (?, ?, ?, ?, ?)',
      [opening_time, closing_time, break_duration, slot_length, JSON.stringify(working_days)]
    );
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to save university timings'
      });
    }
    
    // Generate time slots
    await generateTimeSlots(result.data.insertId, opening_time, closing_time, break_duration, slot_length, working_days);
    
    // Log creation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'CREATE_TIMINGS', 'university_timings', result.data.insertId, JSON.stringify(req.body)]
    );
    
    res.status(201).json({
      success: true,
      message: 'University timings saved and time slots generated successfully'
    });
    
  } catch (error) {
    console.error('Set timings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Generate time slots based on university timings
const generateTimeSlots = async (timingId, openingTime, closingTime, breakDuration, slotLength, workingDays) => {
  try {
    // Clear existing time slots
    await executeQuery('DELETE FROM time_slots');
    
    const slots = [];
    const startTime = new Date(`2000-01-01 ${openingTime}`);
    const endTime = new Date(`2000-01-01 ${closingTime}`);
    
    // Calculate total working minutes
    const totalMinutes = (endTime - startTime) / (1000 * 60);
    const workingMinutes = totalMinutes - breakDuration;
    const numSlots = Math.floor(workingMinutes / slotLength);
    
    // Generate slots for each working day
    workingDays.forEach(day => {
      let currentTime = new Date(startTime);
      let slotNumber = 1;
      
      for (let i = 0; i < numSlots; i++) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + slotLength * 60000);
        
        // Determine shift based on time
        const shift = slotStart.getHours() < 12 ? 'morning' : 'evening';
        
        slots.push([
          slotStart.toTimeString().slice(0, 5),
          slotEnd.toTimeString().slice(0, 5),
          day,
          shift,
          slotNumber
        ]);
        
        currentTime = new Date(slotEnd);
        slotNumber++;
      }
    });
    
    // Insert all slots
    if (slots.length > 0) {
      const values = slots.map(slot => `(?, ?, ?, ?, ?)`).join(', ');
      const params = slots.flat();
      
      await executeQuery(
        `INSERT INTO time_slots (start_time, end_time, day, shift, slot_number) VALUES ${values}`,
        params
      );
    }
    
  } catch (error) {
    console.error('Generate time slots error:', error);
    throw error;
  }
};

// Get time slots
router.get('/slots', authenticateToken, async (req, res) => {
  try {
    const { day, shift } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (day) {
      whereClause += ' AND day = ?';
      params.push(day);
    }
    
    if (shift) {
      whereClause += ' AND shift = ?';
      params.push(shift);
    }
    
    const result = await executeQuery(`
      SELECT * FROM time_slots 
      ${whereClause}
      ORDER BY day, slot_number
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch time slots'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Generate course requests
router.post('/generate-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get all courses with their sections
    const coursesResult = await executeQuery(`
      SELECT c.id as course_id, c.name as course_name, c.code, c.credit_hours, c.semester, c.shift,
             s.id as section_id, s.name as section_name, s.student_strength,
             m.name as major_name, p.name as program_name
      FROM courses c
      JOIN sections s ON c.major_id = s.major_id AND c.shift = s.shift
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ORDER BY p.name, m.name, c.semester, c.code, s.name
    `);
    
    if (!coursesResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch courses and sections'
      });
    }
    
    // Clear existing requests
    await executeQuery('DELETE FROM course_requests');
    
    // Group courses by program and major for hierarchical display
    const groupedCourses = {};
    coursesResult.data.forEach(course => {
      const key = `${course.program_name}-${course.major_name}`;
      if (!groupedCourses[key]) {
        groupedCourses[key] = {
          program: course.program_name,
          major: course.major_name,
          courses: []
        };
      }
      groupedCourses[key].courses.push(course);
    });
    
    // Log generation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'GENERATE_REQUESTS', 'course_requests', 'bulk']
    );
    
    res.json({
      success: true,
      message: 'Course requests generated successfully',
      data: {
        totalCourses: coursesResult.data.length,
        groupedCourses: Object.values(groupedCourses)
      }
    });
    
  } catch (error) {
    console.error('Generate requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get course requests for instructor
router.get('/requests', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { status } = req.query;
    
    let whereClause = 'WHERE cr.instructor_id = ?';
    const params = [req.user.id];
    
    if (status) {
      whereClause += ' AND cr.status = ?';
      params.push(status);
    }
    
    const result = await executeQuery(`
      SELECT cr.*, c.name as course_name, c.code, c.credit_hours, c.semester,
             s.name as section_name, s.student_strength,
             m.name as major_name, p.name as program_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      ${whereClause}
      ORDER BY cr.created_at DESC
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch course requests'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get course requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Accept course request
router.post('/requests/:id/accept', authenticateToken, requireInstructor, validate(validateCourseRequest), async (req, res) => {
  try {
    const { id } = req.params;
    const { preferences } = req.body;
    
    // Get course request
    const requestResult = await executeQuery(`
      SELECT cr.*, c.name as course_name, c.code, c.credit_hours, c.semester, c.shift,
             s.name as section_name, s.student_strength
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      WHERE cr.id = ? AND cr.instructor_id = ?
    `, [id, req.user.id]);
    
    if (!requestResult.success || requestResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Course request not found'
      });
    }
    
    const request = requestResult.data[0];
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Course request is not pending'
      });
    }
    
    // Update request with preferences
    const updateResult = await executeQuery(
      'UPDATE course_requests SET status = ?, preferences = ? WHERE id = ?',
      ['accepted', JSON.stringify(preferences), id]
    );
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to accept course request'
      });
    }
    
    // Log acceptance
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'ACCEPT_COURSE_REQUEST', 'course_requests', id, JSON.stringify({ status: 'accepted', preferences })]
    );
    
    res.json({
      success: true,
      message: 'Course request accepted successfully'
    });
    
  } catch (error) {
    console.error('Accept course request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Generate timetable using Block Theory
router.post('/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Clear existing blocks
    await executeQuery('DELETE FROM blocks');
    
    // Get all accepted course requests
    const requestsResult = await executeQuery(`
      SELECT cr.*, c.name as course_name, c.code, c.credit_hours, c.semester, c.shift,
             s.name as section_name, s.student_strength,
             m.name as major_name, p.name as program_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      WHERE cr.status = 'accepted'
    `);
    
    if (!requestsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch accepted course requests'
      });
    }
    
    // Get available time slots
    const slotsResult = await executeQuery('SELECT * FROM time_slots ORDER BY day, slot_number');
    
    if (!slotsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch time slots'
      });
    }
    
    // Get available rooms
    const roomsResult = await executeQuery('SELECT * FROM rooms ORDER BY capacity ASC');
    
    if (!roomsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch rooms'
      });
    }
    
    // Generate timetable using Block Theory algorithm
    const blocks = await generateTimetableBlocks(
      requestsResult.data,
      slotsResult.data,
      roomsResult.data
    );
    
    // Insert blocks into database
    if (blocks.length > 0) {
      const values = blocks.map(block => 
        `(?, ?, ?, ?, ?, ?, ?, ?)`
      ).join(', ');
      const params = blocks.flat();
      
      await executeQuery(
        `INSERT INTO blocks (teacher_id, course_id, section_id, room_id, day, time_slot_id, shift, status) VALUES ${values}`,
        params
      );
    }
    
    // Log generation
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'GENERATE_TIMETABLE', 'blocks', 'bulk']
    );
    
    res.json({
      success: true,
      message: 'Timetable generated successfully',
      data: {
        totalBlocks: blocks.length,
        conflicts: blocks.filter(block => block.conflict).length
      }
    });
    
  } catch (error) {
    console.error('Generate timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Block Theory Algorithm for Timetable Generation
const generateTimetableBlocks = async (requests, slots, rooms) => {
  const blocks = [];
  const usedSlots = new Set();
  const usedRooms = new Set();
  
  // Sort requests by priority (credit hours, student strength)
  requests.sort((a, b) => {
    const aCredits = parseInt(a.credit_hours.split('+')[0]);
    const bCredits = parseInt(b.credit_hours.split('+')[0]);
    if (aCredits !== bCredits) return bCredits - aCredits;
    return b.student_strength - a.student_strength;
  });
  
  for (const request of requests) {
    const preferences = JSON.parse(request.preferences || '{}');
    const preferredDays = preferences.days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const preferredSlots = preferences.time_slots || [];
    
    // Find available slots for this course
    const availableSlots = slots.filter(slot => 
      slot.shift === request.shift &&
      preferredDays.includes(slot.day) &&
      (preferredSlots.length === 0 || preferredSlots.includes(slot.id))
    );
    
    // Find suitable room
    const suitableRooms = rooms.filter(room => 
      room.capacity >= request.student_strength &&
      (room.type === 'lecture' || (room.type === 'lab' && request.credit_hours.includes('+')))
    );
    
    let assigned = false;
    
    for (const slot of availableSlots) {
      if (assigned) break;
      
      for (const room of suitableRooms) {
        const slotKey = `${slot.day}-${slot.id}-${room.id}`;
        
        // Check for conflicts
        if (!usedSlots.has(slotKey)) {
          // Check teacher conflict
          const teacherConflict = blocks.some(block => 
            block.teacher_id === request.instructor_id &&
            block.day === slot.day &&
            block.time_slot_id === slot.id
          );
          
          if (!teacherConflict) {
            // Check section conflict
            const sectionConflict = blocks.some(block => 
              block.section_id === request.section_id &&
              block.day === slot.day &&
              block.time_slot_id === slot.id
            );
            
            if (!sectionConflict) {
              // Create block
              blocks.push({
                teacher_id: request.instructor_id,
                course_id: request.course_id,
                section_id: request.section_id,
                room_id: room.id,
                day: slot.day,
                time_slot_id: slot.id,
                shift: request.shift,
                status: 'active',
                conflict: false
              });
              
              usedSlots.add(slotKey);
              assigned = true;
              break;
            }
          }
        }
      }
    }
    
    // If not assigned, mark as conflict
    if (!assigned) {
      blocks.push({
        teacher_id: request.instructor_id,
        course_id: request.course_id,
        section_id: request.section_id,
        room_id: null,
        day: null,
        time_slot_id: null,
        shift: request.shift,
        status: 'conflict',
        conflict: true
      });
    }
  }
  
  return blocks;
};

// Get timetable
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { day, shift, teacher_id, section_id } = req.query;
    
    let whereClause = 'WHERE b.status = "active"';
    const params = [];
    
    if (day) {
      whereClause += ' AND b.day = ?';
      params.push(day);
    }
    
    if (shift) {
      whereClause += ' AND b.shift = ?';
      params.push(shift);
    }
    
    if (teacher_id) {
      whereClause += ' AND b.teacher_id = ?';
      params.push(teacher_id);
    }
    
    if (section_id) {
      whereClause += ' AND b.section_id = ?';
      params.push(section_id);
    }
    
    const result = await executeQuery(`
      SELECT b.*, 
             c.name as course_name, c.code, c.credit_hours,
             s.name as section_name, s.student_strength,
             r.name as room_name, r.type as room_type, r.capacity,
             u.name as teacher_name,
             ts.start_time, ts.end_time, ts.slot_number
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN users u ON b.teacher_id = u.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      ${whereClause}
      ORDER BY b.day, ts.slot_number, b.room_id
    `, params);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch timetable'
      });
    }
    
    res.json({
      success: true,
      data: result.data
    });
    
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reschedule class
router.post('/reschedule', authenticateToken, requireInstructor, validate(validateReschedule), async (req, res) => {
  try {
    const { block_id, new_room_id, new_time_slot_id, reason } = req.body;
    
    // Get current block
    const blockResult = await executeQuery(`
      SELECT b.*, c.name as course_name, s.name as section_name, r.name as room_name,
             ts.start_time, ts.end_time
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE b.id = ? AND b.teacher_id = ?
    `, [block_id, req.user.id]);
    
    if (!blockResult.success || blockResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Block not found or not authorized'
      });
    }
    
    const currentBlock = blockResult.data[0];
    
    // Get new time slot
    const newSlotResult = await executeQuery(
      'SELECT * FROM time_slots WHERE id = ?',
      [new_time_slot_id]
    );
    
    if (!newSlotResult.success || newSlotResult.data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'New time slot not found'
      });
    }
    
    const newSlot = newSlotResult.data[0];
    
    // Check for conflicts
    const conflictCheck = await executeQuery(`
      SELECT b.id, c.name as course_name, s.name as section_name, u.name as teacher_name
      FROM blocks b
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN users u ON b.teacher_id = u.id
      WHERE b.room_id = ? AND b.day = ? AND b.time_slot_id = ? AND b.shift = ? AND b.status = 'active' AND b.id != ?
    `, [new_room_id, newSlot.day, new_time_slot_id, newSlot.shift, block_id]);
    
    if (conflictCheck.success && conflictCheck.data.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Time slot conflict detected',
        conflicts: conflictCheck.data
      });
    }
    
    // Update block
    const updateResult = await executeQuery(
      'UPDATE blocks SET room_id = ?, time_slot_id = ?, day = ? WHERE id = ?',
      [new_room_id, new_time_slot_id, newSlot.day, block_id]
    );
    
    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to reschedule class'
      });
    }
    
    // Get new room name
    const newRoomResult = await executeQuery(
      'SELECT name FROM rooms WHERE id = ?',
      [new_room_id]
    );
    
    // Send notification to students
    const studentsResult = await executeQuery(`
      SELECT u.email, u.name
      FROM users u
      WHERE u.role = 'student' AND JSON_EXTRACT(u.metadata, '$.section') = ?
    `, [currentBlock.section_name]);
    
    if (studentsResult.success) {
      for (const student of studentsResult.data) {
        await sendRescheduleEmail(student.email, student.name, {
          courseName: currentBlock.course_name,
          oldTime: `${currentBlock.start_time} - ${currentBlock.end_time}`,
          newTime: `${newSlot.start_time} - ${newSlot.end_time}`,
          roomName: newRoomResult.data[0].name
        });
      }
    }
    
    // Log reschedule
    await executeQuery(
      'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'RESCHEDULE_CLASS', 'blocks', block_id, 
       JSON.stringify({ room_id: currentBlock.room_id, time_slot_id: currentBlock.time_slot_id }),
       JSON.stringify({ room_id: new_room_id, time_slot_id: new_time_slot_id, reason })]
    );
    
    res.json({
      success: true,
      message: 'Class rescheduled successfully'
    });
    
  } catch (error) {
    console.error('Reschedule class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Reset operations
router.post('/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { operation_type, description } = req.body;
    
    if (!['time_slots', 'teachers_rooms', 'full_reset'].includes(operation_type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid operation type'
      });
    }
    
    let queries = [];
    
    switch (operation_type) {
      case 'time_slots':
        queries.push({ query: 'DELETE FROM time_slots', params: [] });
        break;
      case 'teachers_rooms':
        queries.push({ query: 'DELETE FROM blocks', params: [] });
        queries.push({ query: 'DELETE FROM course_requests', params: [] });
        break;
      case 'full_reset':
        queries.push({ query: 'DELETE FROM blocks', params: [] });
        queries.push({ query: 'DELETE FROM course_requests', params: [] });
        queries.push({ query: 'DELETE FROM time_slots', params: [] });
        queries.push({ query: 'DELETE FROM university_timings', params: [] });
        break;
    }
    
    // Execute reset operations
    for (const { query, params } of queries) {
      await executeQuery(query, params);
    }
    
    // Log reset operation
    await executeQuery(
      'INSERT INTO reset_operations (admin_id, operation_type, description) VALUES (?, ?, ?)',
      [req.user.id, operation_type, description || '']
    );
    
    res.json({
      success: true,
      message: `${operation_type.replace('_', ' ')} reset completed successfully`
    });
    
  } catch (error) {
    console.error('Reset operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;