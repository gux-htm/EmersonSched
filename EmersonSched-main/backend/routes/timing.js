const express = require('express');
const router = express.Router();
const timingController = require('../controllers/timingController');
const { auth, isAdmin } = require('../middleware/auth');

router.get('/time-slots', auth, timingController.getTimeSlots);

// New dynamic slot generation routes
router.post('/generate-slots', auth, isAdmin, timingController.generateSlotsWithDistribution);
router.post('/slot-settings', auth, isAdmin, timingController.setTimeSlotSettings);
router.get('/slot-settings', auth, isAdmin, timingController.getTimeSlotSettings);

module.exports = router;
