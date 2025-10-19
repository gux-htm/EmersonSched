const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { auth, isAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(auth);
router.use(isAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Programs
router.post('/programs', adminController.createProgram);
router.get('/programs', adminController.getPrograms);

// Majors
router.post('/majors', adminController.createMajor);
router.get('/majors', adminController.getMajors);

// Courses
router.post('/courses', adminController.createCourse);
router.get('/courses', adminController.getCourses);

// Sections
router.post('/sections', adminController.createSection);
router.get('/sections', adminController.getSections);

// Rooms
router.post('/rooms', adminController.createRoom);
router.get('/rooms', adminController.getRooms);

// Instructors
router.get('/instructors', adminController.getInstructors);

module.exports = router;
