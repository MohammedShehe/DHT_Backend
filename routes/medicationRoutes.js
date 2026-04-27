// routes/medicationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const { logLimiter } = require('../middlewares/rateLimiter');
const MedicationController = require('../controllers/medicationController');

// ===== REFERENCE DATA (for frontend) =====
router.get('/units', auth, MedicationController.getValidUnits);
router.get('/statuses', auth, MedicationController.getValidStatuses);
router.get('/colors', auth, MedicationController.getColorPresets);

// ===== STATISTICS & ANALYTICS (MUST come before /:id routes) =====
router.get('/adherence/all', auth, MedicationController.getAllAdherenceRates);
router.get('/summary/daily', auth, MedicationController.getDailySummary);
router.get('/missed', auth, MedicationController.getMissedDoses);
router.get('/upcoming', auth, MedicationController.getUpcomingDoses);

// Date range logs
router.get('/logs/range', auth, MedicationController.getLogsByDateRange);

// Medication stats by ID (MUST come before /:id routes that aren't stats)
router.get('/:medicationId/stats', auth, MedicationController.getMedicationStats);
router.get('/:medicationId/adherence', auth, MedicationController.getAdherenceRate);
router.get('/:medicationId/date/:date', auth, MedicationController.getMedicationDetailsForDate);

// ===== MEDICATION CRUD =====
router.post('/', auth, logLimiter, MedicationController.createMedication);
router.get('/', auth, MedicationController.getMedications);
router.get('/:id', auth, MedicationController.getMedicationById);
router.put('/:id', auth, MedicationController.updateMedication);
router.delete('/:id', auth, MedicationController.deleteMedication);

// ===== SCHEDULE MANAGEMENT =====
router.post('/:medicationId/schedules', auth, logLimiter, MedicationController.addSchedule);
router.delete('/:medicationId/schedules/:scheduleId', auth, MedicationController.deleteSchedule);

// ===== ADHERENCE LOGGING =====
router.post('/logs', auth, logLimiter, MedicationController.logIntake);
router.patch('/logs/:logId', auth, MedicationController.updateLogStatus);
router.get('/logs/date/:date', auth, MedicationController.getLogsByDate);

module.exports = router;