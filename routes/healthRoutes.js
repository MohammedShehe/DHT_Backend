const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const HealthController = require('../controllers/healthController');

router.post('/save', auth, HealthController.saveProfile);
router.get('/', auth, HealthController.getProfile);

module.exports = router;
