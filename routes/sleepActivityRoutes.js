// routes/sleepActivityRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const SleepActivityController = require('../controllers/sleepActivityController');

// Quality types (for frontend reference)
router.get('/quality-types', auth, SleepActivityController.getQualityTypes);

// Stats and analytics (MUST come before /:date routes)
router.get('/stats/weekly', auth, SleepActivityController.getWeeklyStatsByDay);
router.get('/stats/chart', auth, SleepActivityController.getDailyChartData);
router.get('/stats/summary', auth, SleepActivityController.getSummary);
router.get('/stats/comparison', auth, SleepActivityController.getWeeklyComparison);
router.get('/stats/trends', auth, SleepActivityController.getTrends);
router.get('/stats/consistency', auth, SleepActivityController.getConsistency);

// Date range query
router.get('/range', auth, SleepActivityController.getByDateRange);

// CRUD operations (specific date routes)
router.post('/log', auth, logLimiter, SleepActivityController.logSleep);
router.get('/:date', auth, SleepActivityController.getByDate);
router.delete('/:date', auth, SleepActivityController.deleteSleepLog);

module.exports = router;