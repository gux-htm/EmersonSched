const db = require('../config/db');

// ==========================
// POST /api/course-requests
// ==========================
exports.createCourseRequest = async (req, res) => {
  const { courses } = req.body; // Array of { course_id, section_id, major_id, semester, shift, time_slot }
  const adminId = req.user?.id || null;

  try {
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
      // Fallback: auto-generate requests from course_offerings and sections for current semester
      // Avoid duplicates (same course+section+semester already pending/accepted)
      const [pairs] = await db.query(`
        SELECT co.course_id, s.id AS section_id, co.major_id, s.semester, s.shift
        FROM course_offerings co
        JOIN sections s ON s.major_id = co.major_id AND s.semester = co.semester
      `);

      if (pairs.length === 0) {
        return res.status(400).json({ message: 'No offerings/sections found to create requests.' });
      }

      // Filter out duplicates - check for unique combination: course_id, section_id, major_id, semester, shift
      const values = [];
      const seen = new Set(); // Track seen combinations in memory
      
      for (const p of pairs) {
        // Create unique key for this combination
        const uniqueKey = `${p.course_id}-${p.section_id}-${p.major_id}-${String(p.semester)}-${p.shift || 'morning'}`;
        
        // Check if we've already seen this combination in this batch
        if (seen.has(uniqueKey)) continue;
        
        // Check if it already exists in database
        const [[exists]] = await db.query(
          `SELECT id FROM course_requests 
           WHERE course_id = ? AND section_id = ? AND major_id = ? AND semester = ? AND shift = ? AND status IN ('pending','accepted')
           LIMIT 1`,
          [p.course_id, p.section_id, p.major_id, String(p.semester), p.shift || 'morning']
        );
        if (exists) continue;
        
        // Add to seen set and values array
        seen.add(uniqueKey);
        values.push([
          p.course_id,
          p.section_id,
          p.major_id,
          String(p.semester),
          p.shift || 'morning',
          null,
          adminId,
          'pending',
          JSON.stringify({ sent_by: 'admin_auto' })
        ]);
      }

      if (values.length === 0) {
        return res.status(200).json({ message: 'No new course requests to create (all up to date).' });
      }

      const insertQ = `
        INSERT INTO course_requests 
        (course_id, section_id, major_id, semester, shift, time_slot, requested_by, status, preferences)
        VALUES ?
      `;
      await db.query(insertQ, [values]);
      return res.status(201).json({ message: 'Course requests sent successfully.', created: values.length });
    }

    // Explicit list provided - filter duplicates
    const seen = new Set();
    const values = [];
    
    for (const c of courses) {
      // Create unique key for this combination
      const uniqueKey = `${c.course_id}-${c.section_id}-${c.major_id}-${String(c.semester)}-${c.shift || 'morning'}`;
      
      // Check if we've already seen this combination in this batch
      if (seen.has(uniqueKey)) continue;
      
      // Check if it already exists in database
      const [[exists]] = await db.query(
        `SELECT id FROM course_requests 
         WHERE course_id = ? AND section_id = ? AND major_id = ? AND semester = ? AND shift = ? AND status IN ('pending','accepted')
         LIMIT 1`,
        [c.course_id, c.section_id, c.major_id, String(c.semester), c.shift || 'morning']
      );
      if (exists) continue;
      
      // Add to seen set and values array
      seen.add(uniqueKey);
      values.push([
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
    }

    if (values.length === 0) {
      return res.status(200).json({ message: 'No new course requests to create (all duplicates or already exist).' });
    }

    const query = `
      INSERT INTO course_requests 
      (course_id, section_id, major_id, semester, shift, time_slot, requested_by, status, preferences)
      VALUES ?
    `;

    await db.query(query, [values]);
    res.status(201).json({ message: 'Course requests sent successfully.', created: values.length });
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
    // Get ALL course requests - show each unique request by ID
    // Group by cr.id to prevent duplicates from JOINs (though there shouldn't be any)
    const [rows] = await db.query(`
      SELECT cr.id,
             cr.course_id,
             cr.section_id,
             cr.instructor_id,
             cr.status,
             cr.preferences,
             cr.created_at,
             cr.accepted_at,
             cr.major_id,
             cr.semester,
             cr.shift,
             cr.time_slot,
             cr.requested_by,
             MAX(c.name) AS course_name,
             MAX(c.code) AS course_code,
             MAX(c.credit_hours) AS credit_hours,
             MAX(s.name) AS section_name,
             MAX(u.name) AS assigned_instructor,
             MAX(m.name) AS major_name
      FROM course_requests cr
      LEFT JOIN courses c ON cr.course_id = c.id
      LEFT JOIN sections s ON cr.section_id = s.id
      LEFT JOIN users u ON cr.instructor_id = u.id
      LEFT JOIN majors m ON cr.major_id = m.id
      GROUP BY cr.id
      ORDER BY 
        CASE WHEN cr.status = 'accepted' THEN 0 
             WHEN cr.status = 'pending' THEN 1 
             ELSE 2 END,
        cr.created_at DESC
    `);

    // For accepted requests, get time slot details from slot_reservations
    const requestsWithSlots = await Promise.all(rows.map(async (request) => {
      if (request.status === 'accepted' && request.id) {
        const [slotReservations] = await db.query(`
          SELECT sr.time_slot_id, ts.slot_label, ts.start_time, ts.end_time, ts.day_of_week
          FROM slot_reservations sr
          JOIN time_slots ts ON sr.time_slot_id = ts.id
          WHERE sr.course_request_id = ? AND sr.status = 'reserved'
          ORDER BY ts.day_of_week, ts.start_time
        `, [request.id]);
        
        return {
          ...request,
          selected_time_slots: slotReservations
        };
      }
      return request;
    }));

    res.json({ requests: requestsWithSlots });
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
    // Get pending requests with deduplication - only show one per unique combination
    const [rows] = await db.query(`
      SELECT cr.*, 
             c.name AS course_name, 
             c.code AS course_code,
             c.credit_hours,
             s.name AS section_name,
             s.student_strength,
             m.name AS major_name
      FROM course_requests cr
      JOIN courses c ON cr.course_id = c.id
      JOIN sections s ON cr.section_id = s.id
      LEFT JOIN majors m ON cr.major_id = m.id
      WHERE cr.status = 'pending'
        AND cr.id IN (
          SELECT MAX(id)
          FROM course_requests
          WHERE status = 'pending'
          GROUP BY course_id, section_id, major_id, semester, shift
        )
      ORDER BY cr.created_at DESC
    `);
    
    // For each request, get available time slots
    const requestsWithSlots = await Promise.all(rows.map(async (request) => {
      // Get time slots for this section's shift
      const [timeSlots] = await db.query(
        `SELECT * FROM time_slots WHERE shift = ? ORDER BY start_time`,
        [request.shift]
      );
      
      // Get already reserved time slots for this section
      const [reservedSlots] = await db.query(
        `SELECT DISTINCT sr.time_slot_id 
         FROM slot_reservations sr
         JOIN course_requests cr ON sr.course_request_id = cr.id
         WHERE cr.section_id = ? AND sr.status = 'reserved'`,
        [request.section_id]
      );
      
      const reservedIds = new Set(reservedSlots.map(r => r.time_slot_id));
      
      // Filter available time slots
      const availableSlots = timeSlots
        .filter(slot => !reservedIds.has(slot.id))
        .map(slot => ({
          id: slot.id,
          label: slot.slot_label,
          start_time: slot.start_time,
          end_time: slot.end_time,
          day_of_week: slot.day_of_week
        }));
      
      return {
        ...request,
        available_time_slots: availableSlots
      };
    }));
    
    res.json(requestsWithSlots);
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
  const { request_id, time_slots, room_id, preference_days } = req.body;

  if (!instructorId) return res.status(403).json({ message: 'Unauthorized.' });
  if (!request_id) return res.status(400).json({ message: 'Request ID required.' });
  if (!time_slots || !Array.isArray(time_slots) || time_slots.length === 0) {
    return res.status(400).json({ message: 'At least one time slot is required.' });
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Lock the request for update (prevents race conditions)
    const [[request]] = await connection.query(
      'SELECT * FROM course_requests WHERE id = ? FOR UPDATE',
      [request_id]
    );
    
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }
    
    if (request.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Request is already ${request.status}.` 
      });
    }
    
    // Validate that instructor doesn't already have conflicting slots
    const conflictingRequests = await connection.query(
      `SELECT id, time_slot FROM course_requests 
       WHERE instructor_id = ? AND status = 'accepted' 
       AND time_slot IS NOT NULL`,
      [instructorId]
    );
    
    // Check each requested time slot for conflicts
    const conflicts = [];
    for (const timeSlotId of time_slots) {
      // Lock room assignments for this slot
      const [roomAssignments] = await connection.query(
        `SELECT * FROM room_assignments 
         WHERE time_slot_id = ? AND status = 'reserved' 
         FOR UPDATE`,
        [timeSlotId]
      );
      
      // Check if room is available if specific room requested
      if (room_id) {
        const roomAvailable = roomAssignments.find(
          ra => ra.room_id === room_id
        );
        
        if (roomAvailable) {
          conflicts.push({
            time_slot_id: timeSlotId,
            reason: 'Room not available for this time slot'
          });
        }
      } else {
        // Find an available room for this time slot
        const [availableRooms] = await connection.query(
          `SELECT r.* FROM rooms r 
           INNER JOIN sections s ON s.id = ?
           WHERE r.capacity >= s.student_strength
           AND r.id NOT IN (
             SELECT room_id FROM room_assignments 
             WHERE time_slot_id = ? AND status = 'reserved'
           )
           LIMIT 1`,
          [request.section_id, timeSlotId]
        );
        
        if (availableRooms.length === 0) {
          conflicts.push({
            time_slot_id: timeSlotId,
            reason: 'No available room for this time slot'
          });
        }
      }
      
      // Check if another instructor already reserved this slot for this section
      const [existingReservations] = await connection.query(
        `SELECT sr.* FROM slot_reservations sr
         JOIN course_requests cr ON sr.course_request_id = cr.id
         WHERE cr.section_id = ? AND sr.time_slot_id = ? AND sr.status = 'reserved'
         FOR UPDATE`,
        [request.section_id, timeSlotId]
      );
      
      if (existingReservations.length > 0) {
        conflicts.push({
          time_slot_id: timeSlotId,
          reason: 'Time slot already reserved by another instructor'
        });
      }
    }
    
    if (conflicts.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        message: 'Time slots have conflicts',
        conflicts 
      });
    }
    
    // All checks passed - create reservations
    const reservations = [];
    for (const timeSlotId of time_slots) {
      // Find or assign room
      let assignedRoomId = room_id;
      
      if (!assignedRoomId) {
        const [rooms] = await connection.query(
          `SELECT r.* FROM rooms r 
           INNER JOIN sections s ON s.id = ?
           WHERE r.capacity >= s.student_strength
           AND r.id NOT IN (
             SELECT room_id FROM room_assignments 
             WHERE time_slot_id = ? AND status = 'reserved'
           )
           LIMIT 1`,
          [request.section_id, timeSlotId]
        );
        
        if (rooms.length === 0) {
          await connection.rollback();
          return res.status(409).json({ 
            message: 'No available room for time slot',
            time_slot_id: timeSlotId
          });
        }
        
        assignedRoomId = rooms[0].id;
      }
      
      // Check if room assignment already exists for this specific section
      const [existingAssignment] = await connection.query(
        'SELECT id FROM room_assignments WHERE room_id = ? AND section_id = ? AND time_slot_id = ? AND semester = ?',
        [assignedRoomId, request.section_id, timeSlotId, request.semester || '3']
      );
      
      let assignmentId;
      
      if (existingAssignment.length > 0) {
        // Update existing assignment for this specific section
        assignmentId = existingAssignment[0].id;
        await connection.query(
          `UPDATE room_assignments 
           SET status = 'reserved', assigned_by = ?
           WHERE id = ? AND section_id = ?`,
          [instructorId, assignmentId, request.section_id]
        );
      } else {
        // Check if there's a conflicting assignment (same room+time+semester but different section)
        const [conflictingAssignment] = await connection.query(
          'SELECT id FROM room_assignments WHERE room_id = ? AND time_slot_id = ? AND semester = ? AND section_id != ?',
          [assignedRoomId, timeSlotId, request.semester || '3', request.section_id]
        );
        
        if (conflictingAssignment.length > 0) {
          await connection.rollback();
          return res.status(409).json({ 
            message: 'Room and time slot already assigned to a different section',
            time_slot_id: timeSlotId,
            room_id: assignedRoomId
          });
        }
        
        // Create new room assignment
        const [roomAssignment] = await connection.query(
          `INSERT INTO room_assignments 
           (room_id, section_id, time_slot_id, semester, status, assigned_by)
           VALUES (?, ?, ?, ?, 'reserved', ?)`,
          [
            assignedRoomId,
            request.section_id,
            timeSlotId,
            request.semester || '3',
            instructorId
          ]
        );
        
        assignmentId = roomAssignment.insertId;
      }
      
      // Create slot reservation
      const [reservation] = await connection.query(
        `INSERT INTO slot_reservations 
         (course_request_id, instructor_id, time_slot_id, room_assignment_id, status)
         VALUES (?, ?, ?, ?, 'reserved')`,
        [request_id, instructorId, timeSlotId, assignmentId]
      );
      
      reservations.push({
        reservation_id: reservation.insertId,
        time_slot_id: timeSlotId,
        room_id: assignedRoomId,
        room_assignment_id: assignmentId
      });
    }
    
    // Update course request status - ensure we only update the specific request that was locked
    const timeSlotsJson = JSON.stringify(time_slots);
    const [updateResult] = await connection.query(
      `UPDATE course_requests 
       SET status = 'accepted', instructor_id = ?, accepted_at = NOW(), time_slot = ?
       WHERE id = ? AND status = 'pending'`,
      [instructorId, timeSlotsJson, request_id]
    );
    
    // Verify that exactly one row was updated
    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return res.status(500).json({ 
        message: 'Failed to update course request. Request may have been modified or does not exist.' 
      });
    }

    // Cancel other pending requests for the same course
    await connection.query(
      `DELETE FROM course_requests
       WHERE course_id = ? AND section_id = ? AND status = 'pending'`,
      [request.course_id, request.section_id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Course request accepted successfully.',
      reservations 
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('Error accepting course request:', err);
    res.status(500).json({ message: 'Server error while accepting request.' });
  } finally {
    connection.release();
  }
};

// ==========================
// POST /api/course-requests/reassign
// ==========================
exports.reassignCourseRequest = async (req, res) => {
  const { course_request_id, selected_instructors, admin_id } = req.body;

  if (!course_request_id || !selected_instructors || !Array.isArray(selected_instructors) || selected_instructors.length === 0) {
    return res.status(400).json({ message: 'Missing required fields.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Get the original course request
    const [[originalRequest]] = await connection.query('SELECT * FROM course_requests WHERE id = ?', [course_request_id]);

    if (!originalRequest) {
      await connection.rollback();
      return res.status(404).json({ message: 'Original course request not found.' });
    }

    // Delete the original accepted request
    await connection.query('DELETE FROM course_requests WHERE id = ?', [course_request_id]);

    // Create new pending requests for the selected instructors
    const newRequests = selected_instructors.map(instructorId => [
      originalRequest.course_id,
      originalRequest.section_id,
      instructorId,
      'pending',
      originalRequest.preferences,
      originalRequest.major_id,
      originalRequest.semester,
      originalRequest.shift,
      originalRequest.time_slot,
      admin_id
    ]);

    const query = `
      INSERT INTO course_requests
      (course_id, section_id, instructor_id, status, preferences, major_id, semester, shift, time_slot, requested_by)
      VALUES ?
    `;
    await connection.query(query, [newRequests]);

    // Send notification to the original instructor
    if (originalRequest.instructor_id) {
      const notification = {
        user_id: originalRequest.instructor_id,
        type: 'reschedule',
        title: 'Course Reassigned',
        message: `You have been unassigned from the course.`
      };
      await connection.query('INSERT INTO notifications SET ?', notification);
    }

    await connection.commit();
    res.status(200).json({ message: 'Course reassigned successfully.' });
  } catch (err) {
    await connection.rollback();
    console.error('Error reassigning course:', err);
    res.status(500).json({ message: 'Server error while reassigning course.' });
  } finally {
    connection.release();
  }
};

// ==========================
// POST /api/course-requests/undo-accept
// ==========================
exports.undoAcceptCourseRequest = async (req, res) => {
  const userId = req.user?.id;
  const { request_id } = req.body;
  const isAdmin = req.user?.role === 'admin';

  if (!userId) return res.status(403).json({ message: 'Unauthorized.' });
  if (!request_id) return res.status(400).json({ message: 'Request ID required.' });

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get the request with lock
    const [[request]] = await connection.query(
      'SELECT * FROM course_requests WHERE id = ? FOR UPDATE',
      [request_id]
    );
    
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }
    
    // Check authorization: instructor can only undo their own requests
    if (!isAdmin && request.instructor_id !== userId) {
      await connection.rollback();
      return res.status(403).json({ 
        message: 'Not authorized to undo this request.' 
      });
    }
    
    if (request.status !== 'accepted') {
      await connection.rollback();
      return res.status(400).json({ 
        message: `Request is not accepted, current status: ${request.status}` 
      });
    }
    
    // Get all reservations for this request
    const [reservations] = await connection.query(
      'SELECT * FROM slot_reservations WHERE course_request_id = ? AND status = "reserved"',
      [request_id]
    );
    
    // Cancel all reservations
    for (const reservation of reservations) {
      await connection.query(
        'UPDATE slot_reservations SET status = "cancelled" WHERE id = ?',
        [reservation.id]
      );
      
      // Free up room assignment
      await connection.query(
        'UPDATE room_assignments SET status = "available" WHERE id = ?',
        [reservation.room_assignment_id]
      );
    }
    
    // Reset request status
    await connection.query(
      `UPDATE course_requests 
       SET status = 'pending', instructor_id = NULL, accepted_at = NULL, time_slot = NULL
       WHERE id = ?`,
      [request_id]
    );
    
    await connection.commit();
    
    res.json({ 
      message: 'Request undone successfully. Slot reservations cancelled.',
      cancelled_count: reservations.length
    });
    
  } catch (err) {
    await connection.rollback();
    console.error('Error undoing course request:', err);
    res.status(500).json({ message: 'Server error while undoing request.' });
  } finally {
    connection.release();
  }
};
