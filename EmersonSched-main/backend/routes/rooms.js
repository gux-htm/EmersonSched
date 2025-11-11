const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const adminController = require('../controllers/adminController');
const { auth, isAdmin, isInstructor } = require('../middleware/auth');

// Room CRUD (admin)
router.post('/', auth, isAdmin, adminController.createRoom);
router.get('/', auth, adminController.getRooms);

// Auto assign rooms (admin)
router.post('/auto-assign', auth, isAdmin, roomController.autoAssignRooms);

// Room assignments management (admin)
router.get('/assignments', auth, roomController.getRoomAssignments);
router.put('/assignments/:id', auth, isAdmin, roomController.editRoomAssignment);
router.delete('/assignments/:id', auth, isAdmin, roomController.deleteRoomAssignment);

module.exports = router;

