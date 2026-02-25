const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateNumber = require('../middlewares/validateNumber');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const StepsController = require('../controllers/stepsController');

// Goal routes
router.post('/set', auth, validateNumber('daily_target'), StepsController.setGoal);
router.get('/', auth, StepsController.getGoal);
router.delete('/', auth, StepsController.deleteGoal);

// Log routes
router.post('/log', auth, logLimiter, validateNumber('steps'), StepsController.logSteps);
router.get('/logs', auth, validatePagination, StepsController.getLogs);
router.put('/log/:logId', auth, validateNumber('steps'), StepsController.updateLog);
router.delete('/log/:logId', auth, StepsController.deleteStepLog);

// Reset routes
router.delete('/reset/daily', auth, StepsController.resetDaily);

module.exports = router;