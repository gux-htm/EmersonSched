const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { auth, isAdmin, isInstructor } = require('../middleware/auth');

// --- Admin routes ---
router.post('/', auth, isAdmin, requestController.createCourseRequest);
router.get('/', auth, isAdmin, requestController.getAllRequests);

// --- Instructor routes ---
router.get('/instructor', auth, isInstructor, requestController.getInstructorRequests);
router.post('/accept', auth, isInstructor, requestController.acceptCourseRequest);

// --- Undo/Action routes ---
router.post('/undo-accept', auth, requestController.undoAcceptCourseRequest);
router.post('/reassign', auth, isAdmin, requestController.reassignCourseRequest);

module.exports = router;
