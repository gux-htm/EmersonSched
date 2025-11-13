const express = require('express');
const router = express.Router();
const offeringController = require('../controllers/offeringController');
const { auth, isAdmin } = require('../middleware/auth');

router.use(auth, isAdmin);

router.post('/generate-requests', offeringController.generateRequestsFromOfferings);
router.post('/:id/edit', offeringController.editOffering);
router.delete('/:id', offeringController.deleteOffering);

module.exports = router;
