const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth, isAdmin } = require('../middleware/auth');

router.get('/check-first-admin', authController.checkFirstAdmin);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);
router.get('/pending-registrations', auth, isAdmin, authController.getPendingRegistrations);
router.post('/update-registration-status', auth, isAdmin, authController.updateRegistrationStatus);

module.exports = router;
