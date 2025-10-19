const express = require('express');
const router = express.Router();
const timingController = require('../controllers/timingController');
const { auth, isAdmin } = require('../middleware/auth');

router.post('/university-timings', auth, isAdmin, timingController.setUniversityTimings);
router.get('/university-timings', auth, timingController.getUniversityTimings);
router.get('/time-slots', auth, timingController.getTimeSlots);
router.post('/reset-time-slots', auth, isAdmin, timingController.resetTimeSlots);

module.exports = router;
