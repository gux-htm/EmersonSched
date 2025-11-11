const db = require('../config/db');

// Set university timings
const setUniversityTimings = async (req, res) => {
  try {
    const { opening_time, closing_time, break_duration, slot_length, working_days } = req.body;
    
    // Deactivate all previous timings
    await db.query('UPDATE university_timings SET is_active = FALSE');
    
    // Insert new timings
    const [result] = await db.query(
      'INSERT INTO university_timings (opening_time, closing_time, break_duration, slot_length, working_days, is_active) VALUES (?, ?, ?, ?, ?, TRUE)',
      [opening_time, closing_time, break_duration, slot_length, JSON.stringify(working_days)]
    );
    
    // Generate time slots
    await generateTimeSlots(opening_time, closing_time, break_duration, slot_length);
    
    res.status(201).json({ message: 'University timings set successfully', timingId: result.insertId });
  } catch (error) {
    console.error('Set university timings error:', error);
    res.status(500).json({ error: 'Failed to set university timings' });
  }
};

// Set time slot generation settings with distribution
const setTimeSlotSettings = async (req, res) => {
  try {
    const { shift, start_time, end_time, distribution } = req.body;
    
    if (!shift || !start_time || !end_time || !distribution) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const distributionJson = JSON.stringify(distribution);
    
    // Upsert settings for this shift
    await db.query(
      'INSERT INTO time_slot_generation_settings (shift, start_time, end_time, distribution_json) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), distribution_json = VALUES(distribution_json)',
      [shift, start_time, end_time, distributionJson]
    );
    
    res.json({ message: 'Time slot generation settings updated successfully' });
  } catch (error) {
    console.error('Set time slot settings error:', error);
    res.status(500).json({ error: 'Failed to set time slot settings' });
  }
};

// Get time slot generation settings
const getTimeSlotSettings = async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM time_slot_generation_settings ORDER BY shift');
    res.json({ settings });
  } catch (error) {
    console.error('Get time slot settings error:', error);
    res.status(500).json({ error: 'Failed to get time slot settings' });
  }
};

// Generate time slots based on timings
const generateTimeSlots = async (openingTime, closingTime, breakDuration, slotLength) => {
  try {
    // Clear existing slots
    await db.query('DELETE FROM time_slots');
    
    const slots = [];
    const shifts = ['morning', 'evening', 'weekend'];
    
    for (const shift of shifts) {
      let currentTime = parseTime(openingTime);
      const endTime = parseTime(closingTime);
      
      // Adjust for shifts
      if (shift === 'evening') {
        currentTime = parseTime('14:00:00');
      } else if (shift === 'weekend') {
        currentTime = parseTime('09:00:00');
      }
      
      while (currentTime < endTime) {
        const slotStart = formatTime(currentTime);
        currentTime += slotLength;
        
        // Add break if needed
        const breakTime = parseTime('12:00:00');
        if (currentTime > breakTime && currentTime < breakTime + breakDuration) {
          currentTime = breakTime + breakDuration;
        }
        
        const slotEnd = formatTime(currentTime);
        const label = `${slotStart.substring(0, 5)} - ${slotEnd.substring(0, 5)}`;
        
        slots.push([shift, slotStart, slotEnd, label]);
        
        if (currentTime >= endTime) break;
      }
    }
    
    // Insert slots
    if (slots.length > 0) {
      const query = 'INSERT INTO time_slots (shift, start_time, end_time, slot_label) VALUES ?';
      await db.query(query, [slots]);
    }
    
    console.log(`Generated ${slots.length} time slots`);
  } catch (error) {
    console.error('Generate time slots error:', error);
    throw error;
  }
};

// Helper functions
const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
};

// Get active timings
const getUniversityTimings = async (req, res) => {
  try {
    const [timings] = await db.query(
      'SELECT * FROM university_timings WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    if (timings.length === 0) {
      return res.json({ timings: null });
    }
    
    res.json({ timings: timings[0] });
  } catch (error) {
    console.error('Get university timings error:', error);
    res.status(500).json({ error: 'Failed to get university timings' });
  }
};

// Generate time slots with distribution
const generateSlotsWithDistribution = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { shift, start_time, end_time, distribution, working_days } = req.body;
    
    if (!shift || !start_time || !end_time || !distribution || !working_days) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate distribution fits in window
    const totalMinutes = calculateTotalMinutes(distribution);
    const windowMinutes = timeDifferenceInMinutes(start_time, end_time);
    
    if (totalMinutes > windowMinutes) {
      return res.status(400).json({ 
        error: 'Distribution does not fit in time window',
        details: { totalMinutes, windowMinutes }
      });
    }
    
    await connection.beginTransaction();
    
    try {
      // Delete existing slots for this shift
      await connection.query('DELETE FROM time_slots WHERE shift = ?', [shift]);
      
      // Generate slots for each day
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const slots = [];
      
      for (const day of days) {
        if (!working_days.includes(day)) continue;
        
        const daySlots = createSlotsForDay(shift, day, start_time, end_time, distribution);
        slots.push(...daySlots);
      }
      
      if (slots.length > 0) {
        const query = 'INSERT INTO time_slots (shift, day_of_week, start_time, end_time, slot_length_minutes, slot_label) VALUES ?';
        await connection.query(query, [slots]);
      }
      
      await connection.commit();
      
      res.json({ 
        message: 'Time slots generated successfully',
        count: slots.length,
        slots: slots.slice(0, 10) // Preview first 10
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Generate slots error:', error);
    res.status(500).json({ error: 'Failed to generate time slots' });
  } finally {
    connection.release();
  }
};

// Helper function to create slots for a single day
const createSlotsForDay = (shift, day, startTime, endTime, distribution) => {
  const slots = [];
  let currentTime = parseTime(startTime);
  const endTimeMinutes = parseTime(endTime);
  
  for (const slot of distribution) {
    const { len, count } = slot;
    
    for (let i = 0; i < count; i++) {
      if (currentTime + len > endTimeMinutes) break;
      
      const startStr = formatTime(currentTime);
      const endStr = formatTime(currentTime + len);
      const label = `${startStr.substring(0, 5)} - ${endStr.substring(0, 5)}`;
      
      slots.push([shift, day, startStr, endStr, len, label]);
      currentTime += len;
      
      // Add small gap between different slot types
      if (i < count - 1) {
        currentTime += 15; // 15-minute gap
      }
    }
  }
  
  return slots;
};

// Helper to calculate total minutes from distribution
const calculateTotalMinutes = (distribution) => {
  return distribution.reduce((total, slot) => {
    return total + (slot.len * slot.count);
  }, 0);
};

// Helper to calculate time difference in minutes
const timeDifferenceInMinutes = (startTime, endTime) => {
  return parseTime(endTime) - parseTime(startTime);
};

// Get time slots
const getTimeSlots = async (req, res) => {
  try {
    const { shift, day_of_week } = req.query;
    
    let query = 'SELECT * FROM time_slots WHERE 1=1';
    const params = [];
    
    if (shift) {
      query += ' AND shift = ?';
      params.push(shift);
    }
    
    if (day_of_week) {
      query += ' AND day_of_week = ?';
      params.push(day_of_week);
    }
    
    query += ' ORDER BY day_of_week, start_time';
    
    const [slots] = await db.query(query, params);
    res.json({ slots });
  } catch (error) {
    console.error('Get time slots error:', error);
    res.status(500).json({ error: 'Failed to get time slots' });
  }
};

// Reset time slots only
const resetTimeSlots = async (req, res) => {
  try {
    // Clear time slots
    await db.query('DELETE FROM time_slots');
    
    // Re-generate from active timings
    const [timings] = await db.query(
      'SELECT * FROM university_timings WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    if (timings.length > 0) {
      const t = timings[0];
      await generateTimeSlots(t.opening_time, t.closing_time, t.break_duration, t.slot_length);
    }
    
    res.json({ message: 'Time slots reset successfully' });
  } catch (error) {
    console.error('Reset time slots error:', error);
    res.status(500).json({ error: 'Failed to reset time slots' });
  }
};

module.exports = {
  setUniversityTimings,
  getUniversityTimings,
  getTimeSlots,
  resetTimeSlots,
  setTimeSlotSettings,
  getTimeSlotSettings,
  generateSlotsWithDistribution
};
