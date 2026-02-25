const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateNumber = require('../middlewares/validateNumber');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const MeditationController = require('../controllers/meditationController');

// Goal routes
router.post('/set', auth, validateNumber('daily_target'), MeditationController.setGoal);
router.get('/', auth, MeditationController.getGoal);
router.delete('/', auth, MeditationController.deleteGoal);

// Log routes
router.post('/log', auth, logLimiter, validateNumber('minutes'), MeditationController.logMeditation);
router.get('/logs', auth, validatePagination, MeditationController.getLogs);
router.put('/log/:logId', auth, validateNumber('minutes'), MeditationController.updateLog);
router.delete('/log/:logId', auth, MeditationController.deleteMeditationLog);

// Reset routes
router.delete('/reset/daily', auth, MeditationController.resetDaily);

module.exports = router;