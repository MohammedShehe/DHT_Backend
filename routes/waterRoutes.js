const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateNumber = require('../middlewares/validateNumber');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const WaterController = require('../controllers/waterController');

// Goal routes
router.post('/set', auth, validateNumber('daily_target'), WaterController.setGoal);
router.get('/', auth, WaterController.getGoal);
router.delete('/', auth, WaterController.deleteGoal);

// Log routes
router.post('/log', auth, logLimiter, validateNumber('glasses'), WaterController.logWater);
router.get('/logs', auth, validatePagination, WaterController.getLogs);
router.put('/log/:logId', auth, validateNumber('glasses'), WaterController.updateLog);
router.delete('/log/:logId', auth, WaterController.deleteWaterLog);

// Reset routes
router.delete('/reset/daily', auth, WaterController.resetDaily);

module.exports = router;