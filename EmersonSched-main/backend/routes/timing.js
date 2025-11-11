const express = require('express');
const router = express.Router();
const timingController = require('../controllers/timingController');
const { auth, isAdmin } = require('../middleware/auth');

router.post('/university-timings', auth, isAdmin, timingController.setUniversityTimings);
router.get('/university-timings', auth, timingController.getUniversityTimings);
router.get('/time-slots', auth, timingController.getTimeSlots);
router.post('/reset-time-slots', auth, isAdmin, timingController.resetTimeSlots);

// New dynamic slot generation routes
router.post('/generate-slots', auth, isAdmin, timingController.generateSlotsWithDistribution);
router.post('/slot-settings', auth, isAdmin, timingController.setTimeSlotSettings);
router.get('/slot-settings', auth, isAdmin, timingController.getTimeSlotSettings);

module.exports = router;
