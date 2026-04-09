const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const WorkoutDetailController = require('../controllers/workoutDetailController');

// Workout types
router.get('/types', auth, WorkoutDetailController.getWorkoutTypes);
router.post('/types', auth, logLimiter, WorkoutDetailController.createWorkoutType);
router.delete('/types/:id', auth, WorkoutDetailController.deleteWorkoutType);

// Workout logs
router.post('/', auth, logLimiter, WorkoutDetailController.logWorkout);
router.get('/', auth, validatePagination, WorkoutDetailController.getWorkouts);
router.get('/:id', auth, WorkoutDetailController.getWorkoutById);
router.put('/:id', auth, WorkoutDetailController.updateWorkout);
router.delete('/:id', auth, WorkoutDetailController.deleteWorkout);

// Stats endpoints
router.get('/stats/daily', auth, WorkoutDetailController.getDailyStats);
router.get('/stats/weekly', auth, WorkoutDetailController.getWeeklyStats);
router.get('/stats/monthly', auth, WorkoutDetailController.getMonthlyStats);
router.get('/stats/intensity', auth, WorkoutDetailController.getIntensityDistribution);
router.get('/stats/workout-types', auth, WorkoutDetailController.getWorkoutTypeStats);
router.get('/stats/summary', auth, WorkoutDetailController.getSummary);

module.exports = router;