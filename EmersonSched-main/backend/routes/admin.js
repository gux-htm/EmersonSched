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
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);

// Sections
router.post('/sections', adminController.createSection);
router.get('/sections', adminController.getSections);
router.put('/sections/:id', adminController.updateSection);
router.delete('/sections/:id', adminController.deleteSection);

// Rooms
router.post('/rooms', adminController.createRoom);
router.get('/rooms', adminController.getRooms);
router.put('/rooms/:id', adminController.updateRoom);
router.delete('/rooms/:id', adminController.deleteRoom);

// Instructors
router.get('/instructors', adminController.getInstructors);

module.exports = router;
