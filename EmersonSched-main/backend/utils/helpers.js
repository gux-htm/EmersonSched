const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate UUID
const generateUUID = () => uuidv4();

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Parse credit hours (e.g., "3+1" -> {theory: 3, lab: 1})
const parseCreditHours = (creditHours) => {
  if (creditHours.includes('+')) {
    const [theory, lab] = creditHours.split('+').map(Number);
    return { theory, lab, hasLab: true };
  } else {
    return { theory: Number(creditHours), lab: 0, hasLab: false };
  }
};

// Calculate required slots based on credit hours
const calculateRequiredSlots = (creditHours) => {
  const parsed = parseCreditHours(creditHours);
  const slots = [];
  
  if (parsed.theory === 2) {
    // 2 credit hours = 2 x 1-hour slots
    slots.push({ type: 'theory', duration: 60 });
    slots.push({ type: 'theory', duration: 60 });
  } else if (parsed.theory === 3) {
    // 3 credit hours = 2 x 90-minute slots
    slots.push({ type: 'theory', duration: 90 });
    slots.push({ type: 'theory', duration: 90 });
  }
  
  if (parsed.hasLab) {
    // Lab slot (typically 2-3 hours)
    slots.push({ type: 'lab', duration: 120 });
  }
  
  return slots;
};

// Check for conflicts in blocks
const hasConflict = (existingBlocks, newBlock) => {
  return existingBlocks.some(block => {
    // Check if same day and time slot
    if (block.day !== newBlock.day || block.time_slot_id !== newBlock.time_slot_id) {
      return false;
    }
    
    // Teacher conflict
    if (block.teacher_id === newBlock.teacher_id) return true;
    
    // Room conflict (same shift)
    if (block.room_id === newBlock.room_id && block.shift === newBlock.shift) return true;
    
    // Section conflict
    if (block.section_id === newBlock.section_id) return true;
    
    return false;
  });
};

// Format time slot label
const formatTimeSlot = (startTime, endTime) => {
  return `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`;
};

module.exports = {
  generateUUID,
  hashPassword,
  comparePassword,
  generateToken,
  parseCreditHours,
  calculateRequiredSlots,
  hasConflict,
  formatTimeSlot
};
