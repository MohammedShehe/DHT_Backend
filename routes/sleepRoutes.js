const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateNumber = require('../middlewares/validateNumber');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const SleepController = require('../controllers/sleepController');

// Goal routes
router.post('/set', auth, validateNumber('daily_target'), SleepController.setGoal);
router.get('/', auth, SleepController.getGoal);
router.delete('/', auth, SleepController.deleteGoal);

// Log routes
router.post('/log', auth, logLimiter, validateNumber('hours'), SleepController.logSleep);
router.get('/logs', auth, validatePagination, SleepController.getLogs);
router.put('/log/:logId', auth, validateNumber('hours'), SleepController.updateLog);
router.delete('/log/:logId', auth, SleepController.deleteSleepLog);

// Reset routes
router.delete('/reset/daily', auth, SleepController.resetDaily);

module.exports = router;