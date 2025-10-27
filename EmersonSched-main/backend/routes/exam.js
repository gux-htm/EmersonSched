const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { auth, isAdmin } = require('../middleware/auth');

router.post('/create', auth, isAdmin, examController.createExam);
router.post('/generate-schedule', auth, isAdmin, examController.generateExamSchedule);
router.get('/', auth, examController.getExams);
router.post('/reset', auth, isAdmin, examController.resetExams);

module.exports = router;
