const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateNumber = require('../middlewares/validateNumber');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const CalorieController = require('../controllers/calorieController');

// Goal routes
router.post('/set', auth, validateNumber('monthly_target'), CalorieController.setGoal);
router.get('/', auth, CalorieController.getGoal);
router.delete('/', auth, CalorieController.deleteGoal);

// Log routes
router.post('/log', auth, logLimiter, validateNumber('calories'), CalorieController.logCalories);
router.get('/logs', auth, validatePagination, CalorieController.getLogs);
router.put('/log/:logId', auth, validateNumber('calories'), CalorieController.updateLog);
router.delete('/log/:logId', auth, CalorieController.deleteCalorieLog);

// Reset routes
router.delete('/reset/daily', auth, CalorieController.resetDaily);

module.exports = router;