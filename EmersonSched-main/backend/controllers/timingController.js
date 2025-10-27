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

// Get time slots
const getTimeSlots = async (req, res) => {
  try {
    const { shift } = req.query;
    
    let query = 'SELECT * FROM time_slots';
    const params = [];
    
    if (shift) {
      query += ' WHERE shift = ?';
      params.push(shift);
    }
    
    query += ' ORDER BY shift, start_time';
    
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
  resetTimeSlots
};
