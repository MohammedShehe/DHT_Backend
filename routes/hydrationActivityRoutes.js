// routes/hydrationActivityRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { logLimiter } = require('../middlewares/rateLimiter');
const HydrationActivityController = require('../controllers/hydrationActivityController');

// ===== PUBLIC ENDPOINTS (Reference data) =====
router.get('/drink-types', auth, HydrationActivityController.getDrinkTypes);
router.get('/preset-amounts', auth, HydrationActivityController.getPresetAmounts);

// ===== GOAL MANAGEMENT =====
router.post('/goal', auth, HydrationActivityController.setGoal);
router.get('/goal', auth, HydrationActivityController.getGoal);
router.delete('/goal', auth, HydrationActivityController.deleteGoal);

// ===== STATISTICS & ANALYTICS (MUST come before /logs routes) =====
router.get('/stats/daily', auth, HydrationActivityController.getDailyStats);
router.get('/stats/weekly', auth, HydrationActivityController.getWeeklyStats);
router.get('/stats/monthly', auth, HydrationActivityController.getMonthlyStats);
router.get('/stats/distribution', auth, HydrationActivityController.getDrinkTypeDistribution);
router.get('/stats/hourly', auth, HydrationActivityController.getHourlyDistribution);
router.get('/stats/summary', auth, HydrationActivityController.getSummaryStats);
router.get('/stats/trends', auth, HydrationActivityController.getTrends);
router.get('/dashboard', auth, HydrationActivityController.getDashboard);

// ===== DATE RANGE QUERY =====
router.get('/range', auth, HydrationActivityController.getByDateRange);

// ===== CRUD OPERATIONS =====
router.post('/log', auth, logLimiter, HydrationActivityController.logHydration);
router.get('/logs/:date', auth, HydrationActivityController.getByDate);
router.get('/log/:id', auth, HydrationActivityController.getLogById);
router.put('/log/:id', auth, HydrationActivityController.updateLog);
router.delete('/log/:id', auth, HydrationActivityController.deleteLog);

module.exports = router;