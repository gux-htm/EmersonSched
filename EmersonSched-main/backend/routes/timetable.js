const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { auth, isAdmin, isInstructor } = require('../middleware/auth');

// Admin routes
router.post('/generate-requests', auth, isAdmin, timetableController.generateCourseRequests);
router.post('/generate', auth, isAdmin, timetableController.generateTimetable);
router.post('/reset', auth, isAdmin, timetableController.resetTimetable);

// Instructor routes
router.post('/accept-request', auth, isInstructor, timetableController.acceptCourseRequest);
router.post('/undo-acceptance', auth, isInstructor, timetableController.undoCourseAcceptance);
router.post('/reschedule', auth, isInstructor, timetableController.rescheduleClass);

// Common routes
router.get('/requests', auth, timetableController.getCourseRequests);
router.get('/', auth, timetableController.getTimetable);
router.get('/available-slots', auth, isInstructor, timetableController.getAvailableSlots);

module.exports = router;
