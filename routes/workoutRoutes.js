const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateNumber = require('../middlewares/validateNumber');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const WorkoutController = require('../controllers/workoutController');

// Goal routes
router.post('/set', auth, validateNumber('weekly_target'), WorkoutController.setGoal);
router.get('/', auth, WorkoutController.getGoal);
router.delete('/', auth, WorkoutController.deleteGoal);

// Log routes
router.post('/log', auth, logLimiter, validateNumber('workouts'), WorkoutController.logWorkout);
router.get('/logs', auth, validatePagination, WorkoutController.getLogs);
router.put('/log/:logId', auth, validateNumber('workouts'), WorkoutController.updateLog);
router.delete('/log/:logId', auth, WorkoutController.deleteWorkoutLog);

// Reset routes
router.delete('/reset/weekly', auth, WorkoutController.resetWeekly);
router.delete('/reset/monthly', auth, WorkoutController.resetMonthly);

module.exports = router;