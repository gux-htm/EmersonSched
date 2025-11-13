const db = require('../config/db');
const { hasConflict } = require('../utils/helpers');

// Generate course requests
const generateCourseRequests = async (req, res) => {
  try {
    const { semester, major_id } = req.body;
    
    // Get all courses for the semester/major
    let query = 'SELECT c.*, s.id as section_id FROM courses c CROSS JOIN sections s WHERE c.semester = s.semester';
    const params = [];
    
    if (semester) {
      query += ' AND c.semester = ?';
      params.push(semester);
    }
    
    if (major_id) {
      query += ' AND c.major_id = ? AND s.major_id = ?';
      params.push(major_id, major_id);
    }
    
    const [courseSections] = await db.query(query, params);
    
    // Create course requests
    const requests = [];
    for (const cs of courseSections) {
      requests.push([cs.id, cs.section_id, null, 'pending', null]);
    }
    
    if (requests.length > 0) {
      await db.query(
        'INSERT INTO course_requests (course_id, section_id, instructor_id, status, preferences) VALUES ?',
        [requests]
      );
    }
    
    res.json({ message: `Generated ${requests.length} course requests` });
  } catch (error) {
    console.error('Generate course requests error:', error);
    res.status(500).json({ error: 'Failed to generate course requests' });
  }
};

// Get course requests (for instructors)
const getCourseRequests = async (req, res) => {
  try {
    const { status, instructor_id, program, major, semester, section } = req.query;
    
    let query = `
      SELECT cr.*, 
             co.id as offering_id, co.intake, co.academic_year,
             c.name as course_name, c.code as course_code, c.credit_hours,
             s.name as section_name, s.shift,
             m.name as major_name,
             p.name as program_name,
             u.name as instructor_name
      FROM course_requests cr
      JOIN course_offerings co ON cr.offering_id = co.id
      JOIN courses c ON co.course_id = c.id
      JOIN sections s ON co.section_id = s.id
      JOIN majors m ON co.major_id = m.id
      JOIN programs p ON co.program_id = p.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND cr.status = ?';
      params.push(status);
    }
    
    if (instructor_id) {
      query += ' AND cr.instructor_id = ?';
      params.push(instructor_id);
    }

    if (program) {
        query += ' AND p.id = ?';
        params.push(program);
    }
    if (major) {
        query += ' AND m.id = ?';
        params.push(major);
    }
    if (semester) {
        query += ' AND co.semester = ?';
        params.push(semester);
    }
    if (section) {
        query += ' AND s.id = ?';
        params.push(section);
    }
    
    query += ' ORDER BY cr.created_at DESC';
    
    const [requests] = await db.query(query, params);
    res.json({ requests });
  } catch (error) {
    console.error('Get course requests error:', error);
    res.status(500).json({ error: 'Failed to get course requests' });
  }
};

// Accept course request
const acceptCourseRequest = async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { request_id, selections } = req.body;
        const instructor_id = req.user.id;

        await connection.beginTransaction();

        const [requests] = await connection.query(
            'SELECT * FROM course_requests WHERE id = ? AND status = ? FOR UPDATE',
            [request_id, 'pending']
        );

        if (requests.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Request not found or already accepted' });
        }
        const request = requests[0];

        for (const selection of selections) {
            const { time_slot_id, optional_room_id } = selection;

            // Check for room availability and lock
            let room_id = optional_room_id;
            if (!room_id) {
                // Find an available room if not specified
                const [availableRooms] = await connection.query(
                    `SELECT r.id FROM rooms r
                     LEFT JOIN room_assignments ra ON r.id = ra.room_id AND ra.time_slot_id = ?
                     WHERE ra.id IS NULL
                     ORDER BY r.capacity DESC
                     LIMIT 1`,
                    [time_slot_id]
                );
                if (availableRooms.length === 0) {
                    await connection.rollback();
                    return res.status(409).json({ error: `No available rooms for time slot ${time_slot_id}` });
                }
                room_id = availableRooms[0].id;
            } else {
                 // Lock the specified room
                const [lockedRoom] = await connection.query(
                    'SELECT id FROM room_assignments WHERE room_id = ? AND time_slot_id = ? FOR UPDATE',
                    [room_id, time_slot_id]
                );
                if (lockedRoom.length > 0) {
                    await connection.rollback();
                    return res.status(409).json({ error: `Room ${room_id} is not available for time slot ${time_slot_id}` });
                }
            }


            // Create room assignment and slot reservation
            const [assignmentResult] = await connection.query(
                'INSERT INTO room_assignments (room_id, section_id, time_slot_id, semester, offering_id) VALUES (?, ?, ?, ?, ?)',
                [room_id, request.section_id, time_slot_id, request.semester, request.offering_id]
            );

            await connection.query(
                'INSERT INTO slot_reservations (course_request_id, instructor_id, time_slot_id, room_assignment_id, offering_id) VALUES (?, ?, ?, ?, ?)',
                [request_id, instructor_id, time_slot_id, assignmentResult.insertId, request.offering_id]
            );
        }

        await connection.query(
            'UPDATE course_requests SET instructor_id = ?, status = ?, accepted_at = NOW() WHERE id = ?',
            [instructor_id, 'accepted', request_id]
        );

        await connection.commit();
        res.json({ message: 'Course request accepted successfully' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Accept course request error:', error);
        res.status(500).json({ error: 'Failed to accept course request' });
    } finally {
        if (connection) connection.release();
    }
};

// Undo course acceptance
const undoCourseAcceptance = async (req, res) => {
  try {
    const { request_id } = req.body;
    const instructor_id = req.user.id;
    
    // Check if request was accepted by this instructor
    const [requests] = await db.query(
      'SELECT * FROM course_requests WHERE id = ? AND instructor_id = ? AND status = ?',
      [request_id, instructor_id, 'accepted']
    );
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Request not found or already processed' });
    }
    
    const request = requests[0];
    const acceptedAt = new Date(request.accepted_at);
    const now = new Date();
    const diffSeconds = (now - acceptedAt) / 1000;
    
    // Check 10-second window
    if (diffSeconds > 10) {
      return res.status(400).json({ error: 'Undo window expired (10 seconds)' });
    }
    
    // Undo acceptance
    await db.query(
      'UPDATE course_requests SET instructor_id = NULL, status = ?, preferences = NULL, accepted_at = NULL WHERE id = ?',
      ['pending', request_id]
    );
    
    res.json({ message: 'Course acceptance undone successfully' });
  } catch (error) {
    console.error('Undo course acceptance error:', error);
    res.status(500).json({ error: 'Failed to undo course acceptance' });
  }
};

// Generate timetable from accepted requests
const generateTimetable = async (req, res) => {
  try {
    // Get all accepted requests
    const [requests] = await db.query(
      `SELECT cr.*, c.type as course_type, s.shift
       FROM course_requests cr
       JOIN courses c ON cr.course_id = c.id
       JOIN sections s ON cr.section_id = s.id
       WHERE cr.status = 'accepted' AND cr.preferences IS NOT NULL`
    );
    
    const blocks = [];
    
    for (const request of requests) {
      const preferences = JSON.parse(request.preferences);
      
      // Get available rooms
      const roomType = request.course_type === 'lab' ? 'lab' : 'lecture';
      const [rooms] = await db.query('SELECT * FROM rooms WHERE type = ? ORDER BY capacity DESC', [roomType]);
      
      if (rooms.length === 0) {
        continue;
      }
      
      // Assign to time slots
      let assignedSlots = 0;
      const requiredSlots = preferences.time_slots.length;
      
      for (const day of preferences.days) {
        for (const timeSlotId of preferences.time_slots) {
          if (assignedSlots >= requiredSlots) break;
          
          // Find available room
          let assignedRoom = null;
          for (const room of rooms) {
            const [conflicts] = await db.query(
              'SELECT COUNT(*) as count FROM blocks WHERE room_id = ? AND day = ? AND time_slot_id = ? AND shift = ?',
              [room.id, day.toLowerCase(), timeSlotId, request.shift]
            );
            
            if (conflicts[0].count === 0) {
              assignedRoom = room;
              break;
            }
          }
          
          if (assignedRoom) {
            blocks.push([
              request.instructor_id,
              request.course_id,
              request.section_id,
              assignedRoom.id,
              day.toLowerCase(),
              timeSlotId,
              request.shift,
              request.course_type === 'lab' ? 'lab' : 'theory'
            ]);
            assignedSlots++;
          }
        }
        
        if (assignedSlots >= requiredSlots) break;
      }
    }
    
    // Insert blocks
    if (blocks.length > 0) {
      await db.query(
        'INSERT INTO blocks (teacher_id, course_id, section_id, room_id, day, time_slot_id, shift, type) VALUES ?',
        [blocks]
      );
    }
    
    res.json({ 
      message: 'Timetable generated successfully',
      blocksCreated: blocks.length
    });
  } catch (error) {
    console.error('Generate timetable error:', error);
    res.status(500).json({ error: 'Failed to generate timetable' });
  }
};

// Get timetable
const getTimetable = async (req, res) => {
  try {
    const { section_id, teacher_id, room_id, shift } = req.query;
    
    let query = `
      SELECT b.*, 
             u.name as teacher_name,
             c.name as course_name, c.code as course_code,
             s.name as section_name,
             r.name as room_name,
             ts.slot_label
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE 1=1
    `;
    const params = [];
    
    if (section_id) {
      query += ' AND b.section_id = ?';
      params.push(section_id);
    }
    
    if (teacher_id) {
      query += ' AND b.teacher_id = ?';
      params.push(teacher_id);
    }
    
    if (room_id) {
      query += ' AND b.room_id = ?';
      params.push(room_id);
    }
    
    if (shift) {
      query += ' AND b.shift = ?';
      params.push(shift);
    }
    
    query += ' ORDER BY b.day, ts.start_time';
    
    const [blocks] = await db.query(query, params);
    res.json({ timetable: blocks });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to get timetable' });
  }
};

// Reschedule class
const rescheduleClass = async (req, res) => {
  try {
    const { block_id, new_day, new_time_slot_id, new_room_id } = req.body;
    const instructor_id = req.user.id;
    
    // Get block details
    const [blocks] = await db.query('SELECT * FROM blocks WHERE id = ? AND teacher_id = ?', [block_id, instructor_id]);
    
    if (blocks.length === 0) {
      return res.status(404).json({ error: 'Block not found or unauthorized' });
    }
    
    const block = blocks[0];
    
    // Check for conflicts
    const [conflicts] = await db.query(
      `SELECT COUNT(*) as count FROM blocks 
       WHERE day = ? AND time_slot_id = ? AND id != ?
       AND (teacher_id = ? OR section_id = ? OR (room_id = ? AND shift = ?))`,
      [new_day, new_time_slot_id, block_id, instructor_id, block.section_id, new_room_id, block.shift]
    );
    
    if (conflicts[0].count > 0) {
      return res.status(400).json({ error: 'Conflict detected with new schedule' });
    }
    
    // Update block
    await db.query(
      'UPDATE blocks SET day = ?, time_slot_id = ?, room_id = ? WHERE id = ?',
      [new_day, new_time_slot_id, new_room_id, block_id]
    );
    
    res.json({ message: 'Class rescheduled successfully' });
  } catch (error) {
    console.error('Reschedule class error:', error);
    res.status(500).json({ error: 'Failed to reschedule class' });
  }
};

// Reset timetable
const resetTimetable = async (req, res) => {
  try {
    const { type } = req.body; // 'slots', 'assignments', 'full'
    
    if (type === 'slots') {
      await db.query('DELETE FROM time_slots');
    } else if (type === 'assignments') {
      await db.query('DELETE FROM blocks');
      await db.query('UPDATE course_requests SET status = ?, instructor_id = NULL, preferences = NULL', ['pending']);
    } else if (type === 'full') {
      await db.query('DELETE FROM blocks');
      await db.query('DELETE FROM course_requests');
      await db.query('DELETE FROM time_slots');
      await db.query('UPDATE university_timings SET is_active = FALSE');
    }
    
    res.json({ message: `Timetable reset (${type}) completed successfully` });
  } catch (error) {
    console.error('Reset timetable error:', error);
    res.status(500).json({ error: 'Failed to reset timetable' });
  }
};

module.exports = {
  generateCourseRequests,
  getCourseRequests,
  acceptCourseRequest,
  undoCourseAcceptance,
  generateTimetable,
  getTimetable,
  rescheduleClass,
  resetTimetable
};
