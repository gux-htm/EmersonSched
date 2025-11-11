const db = require('../config/db');

// ===================== AUTO ASSIGN ROOMS =====================
/**
 * Automatically assign rooms to sections based on capacity and availability
 * Policy: 'evening-first' or 'morning-first'
 */
const autoAssignRooms = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { shift, semester, policy = 'evening-first' } = req.body;
    
    if (!shift || !semester) {
      return res.status(400).json({ error: 'Shift and semester required' });
    }
    
    await connection.beginTransaction();
    
    try {
      // Get all sections for the shift and semester
      const [sections] = await connection.query(
        `SELECT s.*, m.name as major_name 
         FROM sections s 
         JOIN majors m ON s.major_id = m.id 
         WHERE s.shift = ? AND s.semester = ?
         ORDER BY s.student_strength DESC`,
        [shift, semester]
      );
      
      // Get all rooms sorted by capacity (smallest adequate first)
      const [rooms] = await connection.query(
        'SELECT * FROM rooms ORDER BY capacity ASC'
      );
      
      // Get available time slots for this shift
      const [timeSlots] = await connection.query(
        'SELECT * FROM time_slots WHERE shift = ? ORDER BY start_time',
        [shift]
      );
      
      const assigned = [];
      const unassigned = [];
      const conflicts = [];
      
      // Calculate required slots per section based on credit hours
      // For now, default to 2 slots per section (can be made configurable)
      const slotsPerSection = 2;
      
      // Get course assignments to determine slot requirements
      const [courseOfferings] = await connection.query(
        `SELECT co.*, c.credit_hours 
         FROM course_offerings co 
         JOIN courses c ON co.course_id = c.id 
         WHERE co.major_id IN (${sections.map(() => '?').join(',')}) 
         AND co.semester = ?`,
        [...sections.map(s => s.major_id), semester]
      );
      
      // Try to assign each section
      for (const section of sections) {
        const sectionCourses = courseOfferings.filter(co => co.major_id === section.major_id);
        
        // Determine required slots based on course credit hours
        let requiredSlots = slotsPerSection;
        if (sectionCourses.length > 0) {
          // Use the first course's credit hours to estimate
          const creditHours = sectionCourses[0].credit_hours;
          requiredSlots = estimateRequiredSlots(creditHours);
        }
        
        // Track assignments for this section
        const sectionAssignments = [];
        
        for (let i = 0; i < requiredSlots; i++) {
          // Find an available room + time slot
          let assignedSlot = false;
          
          for (const room of rooms) {
            if (room.capacity < section.student_strength) continue;
            
            // Try to find an available slot
            for (const timeSlot of timeSlots) {
              // Check if this room+slot is already assigned
              const [existing] = await connection.query(
                `SELECT id FROM room_assignments 
                 WHERE room_id = ? AND time_slot_id = ? AND semester = ? AND status = 'reserved'`,
                [room.id, timeSlot.id, semester]
              );
              
              if (existing.length > 0) continue; // Slot taken
              
              // Check if this section already has this time slot
              const [sectionSlot] = await connection.query(
                `SELECT id FROM room_assignments 
                 WHERE section_id = ? AND time_slot_id = ? AND semester = ?`,
                [section.id, timeSlot.id, semester]
              );
              
              if (sectionSlot.length > 0) continue; // Section already has this slot
              
              // Assign this room + slot
              const [result] = await connection.query(
                `INSERT INTO room_assignments 
                 (room_id, section_id, time_slot_id, semester, status, assigned_by) 
                 VALUES (?, ?, ?, ?, 'reserved', ?)`,
                [room.id, section.id, timeSlot.id, semester, req.user?.id || null]
              );
              
              sectionAssignments.push({
                room_id: room.id,
                room_name: room.name,
                time_slot_id: timeSlot.id,
                time_slot_label: timeSlot.slot_label
              });
              
              assignedSlot = true;
              break;
            }
            
            if (assignedSlot) break;
          }
          
          if (!assignedSlot) {
            conflicts.push({
              section_id: section.id,
              section_name: section.name,
              major_name: section.major_name,
              missing_slots: requiredSlots - sectionAssignments.length
            });
          }
        }
        
        if (sectionAssignments.length === requiredSlots) {
          assigned.push({
            section_id: section.id,
            section_name: section.name,
            major_name: section.major_name,
            assignments: sectionAssignments
          });
        } else {
          unassigned.push({
            section_id: section.id,
            section_name: section.name,
            major_name: section.major_name,
            assigned_count: sectionAssignments.length,
            required_count: requiredSlots
          });
        }
      }
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Room assignment completed',
        summary: {
          total_sections: sections.length,
          assigned: assigned.length,
          unassigned: unassigned.length,
          conflicts: conflicts.length
        },
        assigned,
        unassigned,
        conflicts
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Auto assign rooms error:', error);
    res.status(500).json({ error: 'Failed to auto-assign rooms' });
  } finally {
    connection.release();
  }
};

// Helper: Estimate required slots based on credit hours
const estimateRequiredSlots = (creditHours) => {
  // Simple mapping: adjust based on needs
  const credits = parseInt(creditHours.split('+')[0]);
  
  if (credits === 1) return 1;
  if (credits === 2) return 2;
  if (credits === 3) return 3;
  if (credits === 4) return 4;
  return 2; // default
};

// ===================== GET ROOM ASSIGNMENTS =====================
const getRoomAssignments = async (req, res) => {
  try {
    const { section_id, semester, room_id } = req.query;
    
    let query = `
      SELECT ra.*, 
             r.name as room_name, r.capacity, r.type as room_type,
             s.name as section_name, s.student_strength,
             m.name as major_name,
             ts.slot_label, ts.start_time, ts.end_time
      FROM room_assignments ra
      JOIN rooms r ON ra.room_id = r.id
      JOIN sections s ON ra.section_id = s.id
      JOIN majors m ON s.major_id = m.id
      JOIN time_slots ts ON ra.time_slot_id = ts.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (section_id) {
      query += ' AND ra.section_id = ?';
      params.push(section_id);
    }
    
    if (semester) {
      query += ' AND ra.semester = ?';
      params.push(semester);
    }
    
    if (room_id) {
      query += ' AND ra.room_id = ?';
      params.push(room_id);
    }
    
    query += ' ORDER BY ra.semester, s.name, ts.start_time';
    
    const [assignments] = await db.query(query, params);
    res.json({ assignments });
  } catch (error) {
    console.error('Get room assignments error:', error);
    res.status(500).json({ error: 'Failed to get room assignments' });
  }
};

// ===================== EDIT ROOM ASSIGNMENT =====================
const editRoomAssignment = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { id } = req.params;
    const { room_id, time_slot_id } = req.body;
    
    await connection.beginTransaction();
    
    try {
      // Get current assignment
      const [[assignment]] = await connection.query(
        'SELECT * FROM room_assignments WHERE id = ?',
        [id]
      );
      
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
      
      // Check for conflicts with new room/slot
      const [conflicts] = await connection.query(
        `SELECT id FROM room_assignments 
         WHERE room_id = ? AND time_slot_id = ? 
         AND semester = ? AND status = 'reserved' AND id != ?`,
        [room_id, time_slot_id, assignment.semester, id]
      );
      
      if (conflicts.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          error: 'Room and time slot already assigned',
          conflicts 
        });
      }
      
      // Update assignment
      await connection.query(
        'UPDATE room_assignments SET room_id = ?, time_slot_id = ?, assigned_by = ? WHERE id = ?',
        [room_id, time_slot_id, req.user?.id || null, id]
      );
      
      await connection.commit();
      
      res.json({ message: 'Room assignment updated successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Edit room assignment error:', error);
    res.status(500).json({ error: 'Failed to edit room assignment' });
  } finally {
    connection.release();
  }
};

// ===================== DELETE ROOM ASSIGNMENT =====================
const deleteRoomAssignment = async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const { id } = req.params;
    
    await connection.beginTransaction();
    
    try {
      // Check if this assignment has active reservations
      const [reservations] = await connection.query(
        'SELECT id FROM slot_reservations WHERE room_assignment_id = ? AND status = "reserved"',
        [id]
      );
      
      if (reservations.length > 0) {
        await connection.rollback();
        return res.status(409).json({ 
          error: 'Cannot delete: assignment has active reservations',
          reservation_count: reservations.length
        });
      }
      
      // Delete assignment
      await connection.query('DELETE FROM room_assignments WHERE id = ?', [id]);
      
      await connection.commit();
      
      res.json({ message: 'Room assignment deleted successfully' });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Delete room assignment error:', error);
    res.status(500).json({ error: 'Failed to delete room assignment' });
  } finally {
    connection.release();
  }
};

module.exports = {
  autoAssignRooms,
  getRoomAssignments,
  editRoomAssignment,
  deleteRoomAssignment
};

