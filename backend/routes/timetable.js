const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all timetable routes
router.use(authenticateToken);

// University timings management (Admin only)
router.post('/timings', requireRole(['admin']), [
  body('opening_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid opening time required'),
  body('closing_time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid closing time required'),
  body('break_duration').isInt({ min: 0, max: 120 }).withMessage('Break duration must be 0-120 minutes'),
  body('slot_length').isIn([60, 90]).withMessage('Slot length must be 60 or 90 minutes'),
  body('working_days').isArray({ min: 1, max: 7 }).withMessage('At least one working day required')
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

    const { opening_time, closing_time, break_duration, slot_length, working_days } = req.body;

    // Deactivate existing timings
    await pool.execute('UPDATE university_timings SET is_active = 0');

    // Insert new timings
    const [result] = await pool.execute(
      'INSERT INTO university_timings (opening_time, closing_time, break_duration, slot_length, working_days) VALUES (?, ?, ?, ?, ?)',
      [opening_time, closing_time, break_duration, slot_length, JSON.stringify(working_days)]
    );

    // Generate time slots
    await generateTimeSlots(result.insertId, opening_time, closing_time, break_duration, slot_length, working_days);

    res.status(201).json({
      success: true,
      message: 'University timings configured successfully'
    });
  } catch (error) {
    console.error('Set timings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to configure university timings'
    });
  }
});

// Get current university timings
router.get('/timings', async (req, res) => {
  try {
    const [timings] = await pool.execute(
      'SELECT * FROM university_timings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );

    if (timings.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: {
        ...timings[0],
        working_days: JSON.parse(timings[0].working_days)
      }
    });
  } catch (error) {
    console.error('Get timings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch university timings'
    });
  }
});

// Get time slots
router.get('/time-slots', async (req, res) => {
  try {
    const { shift } = req.query;
    let query = 'SELECT * FROM time_slots WHERE is_active = 1';
    const params = [];

    if (shift) {
      query += ' AND shift = ?';
      params.push(shift);
    }

    query += ' ORDER BY slot_number';

    const [slots] = await pool.execute(query, params);

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time slots'
    });
  }
});

// Generate course requests (Admin only)
router.post('/generate-requests', requireRole(['admin']), async (req, res) => {
  try {
    // Clear existing requests
    await pool.execute('DELETE FROM course_requests');

    // Get all courses with their sections
    const [courses] = await pool.execute(`
      SELECT c.*, s.id as section_id, s.name as section_name, s.student_strength,
             m.name as major_name, p.name as program_name
      FROM courses c
      JOIN majors m ON c.major_id = m.id
      JOIN programs p ON m.program_id = p.id
      JOIN sections s ON s.major_id = m.id AND s.shift = c.shift
      WHERE c.is_active = 1 AND s.is_active = 1
      ORDER BY p.name, m.name, c.semester, c.name, s.name
    `);

    // Create course requests for each course-section combination
    const requests = [];
    for (const course of courses) {
      requests.push([
        null, // instructor_id will be set when instructor accepts
        course.id,
        course.section_id,
        'pending',
        null, // preferences will be set when instructor accepts
        null  // accepted_at
      ]);
    }

    if (requests.length > 0) {
      await pool.execute(
        'INSERT INTO course_requests (instructor_id, course_id, section_id, status, preferences, accepted_at) VALUES ?',
        [requests]
      );
    }

    res.json({
      success: true,
      message: `Generated ${requests.length} course requests`,
      data: { count: requests.length }
    });
  } catch (error) {
    console.error('Generate requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate course requests'
    });
  }
});

// Get timetable blocks
router.get('/blocks', async (req, res) => {
  try {
    const { teacher_id, section_id, day } = req.query;
    let query = `
      SELECT b.*, u.name as teacher_name, c.name as course_name, c.code as course_code,
             s.name as section_name, r.name as room_name, r.type as room_type,
             ts.start_time, ts.end_time
      FROM blocks b
      JOIN users u ON b.teacher_id = u.id
      JOIN courses c ON b.course_id = c.id
      JOIN sections s ON b.section_id = s.id
      JOIN rooms r ON b.room_id = r.id
      JOIN time_slots ts ON b.time_slot_id = ts.id
      WHERE 1=1
    `;
    const params = [];

    if (teacher_id) {
      query += ' AND b.teacher_id = ?';
      params.push(teacher_id);
    }

    if (section_id) {
      query += ' AND b.section_id = ?';
      params.push(section_id);
    }

    if (day) {
      query += ' AND b.day = ?';
      params.push(day);
    }

    query += ' ORDER BY b.day, ts.slot_number';

    const [blocks] = await pool.execute(query, params);

    res.json({
      success: true,
      data: blocks
    });
  } catch (error) {
    console.error('Get blocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timetable blocks'
    });
  }
});

// Generate timetable using Block Theory algorithm (Admin only)
router.post('/generate', requireRole(['admin']), async (req, res) => {
  try {
    // Clear existing blocks
    await pool.execute('DELETE FROM blocks');

    // Get accepted course requests
    const [requests] = await pool.execute(`
      SELECT cr.*, c.name as course_name, c.code as course_code, c.credit_hours,
             s.name as section_name, s.student_strength, s.shift,
             u.name as instructor_name, u.metadata as instructor_metadata
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      JOIN users u ON cr.instructor_id = u.id
      WHERE cr.status = 'accepted'
      ORDER BY c.semester, c.name, s.name
    `);

    if (requests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No accepted course requests found'
      });
    }

    // Get available time slots
    const [timeSlots] = await pool.execute(
      'SELECT * FROM time_slots WHERE is_active = 1 ORDER BY shift, slot_number'
    );

    // Get available rooms
    const [rooms] = await pool.execute(
      'SELECT * FROM rooms WHERE is_active = 1 ORDER BY type, capacity'
    );

    // Generate timetable using Block Theory
    const blocks = await generateTimetableBlocks(requests, timeSlots, rooms);

    if (blocks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate timetable - conflicts detected'
      });
    }

    // Insert blocks into database
    for (const block of blocks) {
      await pool.execute(
        'INSERT INTO blocks (teacher_id, course_id, section_id, room_id, day, time_slot_id, shift) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [block.teacher_id, block.course_id, block.section_id, block.room_id, block.day, block.time_slot_id, block.shift]
      );
    }

    res.json({
      success: true,
      message: `Timetable generated successfully with ${blocks.length} blocks`,
      data: { blockCount: blocks.length }
    });
  } catch (error) {
    console.error('Generate timetable error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate timetable'
    });
  }
});

// Helper function to generate time slots
async function generateTimeSlots(timingId, openingTime, closingTime, breakDuration, slotLength, workingDays) {
  const slots = [];
  const opening = new Date(`2000-01-01 ${openingTime}`);
  const closing = new Date(`2000-01-01 ${closingTime}`);
  
  let currentTime = new Date(opening);
  let slotNumber = 1;

  while (currentTime < closing) {
    const endTime = new Date(currentTime.getTime() + slotLength * 60000);
    
    if (endTime <= closing) {
      const startTimeStr = currentTime.toTimeString().slice(0, 5);
      const endTimeStr = endTime.toTimeString().slice(0, 5);
      
      // Determine shift based on time
      let shift = 'morning';
      if (currentTime.getHours() >= 12) {
        shift = 'evening';
      }
      if (workingDays.includes('saturday') || workingDays.includes('sunday')) {
        shift = 'weekend';
      }

      slots.push([
        startTimeStr,
        endTimeStr,
        slotNumber,
        shift
      ]);

      slotNumber++;
    }

    // Add break duration
    currentTime = new Date(endTime.getTime() + breakDuration * 60000);
  }

  if (slots.length > 0) {
    await pool.execute(
      'INSERT INTO time_slots (start_time, end_time, slot_number, shift) VALUES ?',
      [slots]
    );
  }
}

// Helper function to generate timetable blocks using Block Theory
async function generateTimetableBlocks(requests, timeSlots, rooms) {
  const blocks = [];
  const usedSlots = new Set();
  const usedRooms = new Set();
  const teacherSchedule = new Map();

  // Group time slots by shift
  const slotsByShift = {};
  timeSlots.forEach(slot => {
    if (!slotsByShift[slot.shift]) {
      slotsByShift[slot.shift] = [];
    }
    slotsByShift[slot.shift].push(slot);
  });

  // Process each request
  for (const request of requests) {
    const preferences = JSON.parse(request.preferences || '{}');
    const preferredDays = preferences.days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const preferredSlots = preferences.time_slots || [];
    
    const shift = request.shift;
    const availableSlots = slotsByShift[shift] || [];
    
    // Parse credit hours to determine number of slots needed
    const creditHours = request.credit_hours;
    let slotsNeeded = 2; // Default for 2+1 or 2 credit hours
    
    if (creditHours.includes('3+1')) {
      slotsNeeded = 3; // Two 90-min theory + One lab
    } else if (creditHours.includes('2+1')) {
      slotsNeeded = 3; // Two 1-hour theory + One lab
    } else if (creditHours === '2') {
      slotsNeeded = 2; // Two 1-hour lectures
    }

    // Find suitable room
    const suitableRooms = rooms.filter(room => 
      room.type === (request.course_name.toLowerCase().includes('lab') ? 'lab' : 'lecture') &&
      room.capacity >= request.student_strength
    );

    if (suitableRooms.length === 0) {
      continue; // Skip if no suitable room
    }

    // Try to assign slots
    let assignedSlots = 0;
    const assignedBlocks = [];

    for (const day of preferredDays) {
      if (assignedSlots >= slotsNeeded) break;

      for (const slot of availableSlots) {
        if (assignedSlots >= slotsNeeded) break;

        const slotKey = `${day}-${slot.id}`;
        const roomKey = `${day}-${slot.id}-${suitableRooms[0].id}`;

        // Check conflicts
        if (usedSlots.has(slotKey) || usedRooms.has(roomKey)) {
          continue;
        }

        // Check teacher availability
        const teacherKey = `${request.instructor_id}-${day}-${slot.id}`;
        if (teacherSchedule.has(teacherKey)) {
          continue;
        }

        // Assign the slot
        usedSlots.add(slotKey);
        usedRooms.add(roomKey);
        teacherSchedule.set(teacherKey, true);

        assignedBlocks.push({
          teacher_id: request.instructor_id,
          course_id: request.course_id,
          section_id: request.section_id,
          room_id: suitableRooms[0].id,
          day: day,
          time_slot_id: slot.id,
          shift: shift
        });

        assignedSlots++;
      }
    }

    // If we couldn't assign all required slots, skip this request
    if (assignedSlots < slotsNeeded) {
      // Remove assigned slots from used sets
      assignedBlocks.forEach(block => {
        const slotKey = `${block.day}-${block.time_slot_id}`;
        const roomKey = `${block.day}-${block.time_slot_id}-${block.room_id}`;
        const teacherKey = `${block.teacher_id}-${block.day}-${block.time_slot_id}`;
        
        usedSlots.delete(slotKey);
        usedRooms.delete(roomKey);
        teacherSchedule.delete(teacherKey);
      });
      continue;
    }

    blocks.push(...assignedBlocks);
  }

  return blocks;
}

module.exports = router;