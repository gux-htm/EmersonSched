const Joi = require('joi');

// User registration validation
const validateUserRegistration = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'instructor', 'student').required(),
    department: Joi.string().when('role', {
      is: Joi.string().valid('admin', 'instructor'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    designation: Joi.string().when('role', {
      is: 'admin',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    program: Joi.string().when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    semester: Joi.number().integer().min(1).max(20).when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    section: Joi.string().when('role', {
      is: 'student',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    specialization: Joi.string().when('role', {
      is: 'instructor',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    availability: Joi.string().when('role', {
      is: 'instructor',
      then: Joi.optional(),
      otherwise: Joi.forbidden()
    })
  });

  return schema.validate(data);
};

// User login validation
const validateUserLogin = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  return schema.validate(data);
};

// Program validation
const validateProgram = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    system_type: Joi.string().valid('semester', 'annual').required(),
    total_semesters: Joi.number().integer().min(1).max(20).required(),
    shift: Joi.string().valid('morning', 'evening', 'weekend').required()
  });

  return schema.validate(data);
};

// Major validation
const validateMajor = (data) => {
  const schema = Joi.object({
    program_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(2).max(100).required()
  });

  return schema.validate(data);
};

// Course validation
const validateCourse = (data) => {
  const schema = Joi.object({
    major_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(2).max(100).required(),
    code: Joi.string().min(2).max(20).required(),
    credit_hours: Joi.string().pattern(/^\d+\+\d+$|^\d+$/).required(),
    semester: Joi.number().integer().min(1).max(20).required(),
    shift: Joi.string().valid('morning', 'evening').required()
  });

  return schema.validate(data);
};

// Section validation
const validateSection = (data) => {
  const schema = Joi.object({
    major_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(10).required(),
    student_strength: Joi.number().integer().min(1).max(200).required(),
    shift: Joi.string().valid('morning', 'evening').required()
  });

  return schema.validate(data);
};

// Room validation
const validateRoom = (data) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(20).required(),
    type: Joi.string().valid('lecture', 'lab', 'seminar').required(),
    capacity: Joi.number().integer().min(1).max(500).required(),
    resources: Joi.object().optional()
  });

  return schema.validate(data);
};

// University timings validation
const validateUniversityTimings = (data) => {
  const schema = Joi.object({
    opening_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    closing_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    break_duration: Joi.number().integer().min(0).max(120).required(),
    slot_length: Joi.number().integer().valid(60, 90).required(),
    working_days: Joi.array().items(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday')
    ).min(1).max(5).required()
  });

  return schema.validate(data);
};

// Course request validation
const validateCourseRequest = (data) => {
  const schema = Joi.object({
    course_id: Joi.number().integer().positive().required(),
    section_id: Joi.number().integer().positive().required(),
    preferences: Joi.object({
      days: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday')
      ).min(1).max(5).required(),
      time_slots: Joi.array().items(
        Joi.number().integer().positive()
      ).min(1).required()
    }).required()
  });

  return schema.validate(data);
};

// Exam validation
const validateExam = (data) => {
  const schema = Joi.object({
    course_id: Joi.number().integer().positive().required(),
    room_id: Joi.number().integer().positive().required(),
    invigilator_id: Joi.string().uuid().required(),
    exam_type: Joi.string().valid('midterm', 'final', 'supplementary').required(),
    exam_date: Joi.date().min('now').required(),
    start_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    end_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    duration: Joi.number().integer().min(30).max(480).required(),
    mode: Joi.string().valid('match', 'shuffle').required()
  });

  return schema.validate(data);
};

// Reschedule validation
const validateReschedule = (data) => {
  const schema = Joi.object({
    block_id: Joi.number().integer().positive().required(),
    new_room_id: Joi.number().integer().positive().required(),
    new_time_slot_id: Joi.number().integer().positive().required(),
    reason: Joi.string().max(500).optional()
  });

  return schema.validate(data);
};

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateProgram,
  validateMajor,
  validateCourse,
  validateSection,
  validateRoom,
  validateUniversityTimings,
  validateCourseRequest,
  validateExam,
  validateReschedule,
  validate
};