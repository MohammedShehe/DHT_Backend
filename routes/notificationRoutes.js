// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const NotificationController = require('../controllers/notificationController');

// Notification preferences
router.get('/preferences', auth, NotificationController.getPreferences);
router.post('/preferences', auth, logLimiter, NotificationController.savePreference);
router.patch('/preferences/:id/toggle', auth, NotificationController.togglePreference);
router.delete('/preferences/:id', auth, NotificationController.deletePreference);
router.post('/preferences/reset', auth, NotificationController.resetToDefaults);

// FCM token management
router.post('/token', auth, NotificationController.registerToken);
router.delete('/token', auth, NotificationController.removeToken);
router.get('/tokens', auth, NotificationController.getTokens);

// Notification history
router.get('/history', auth, validatePagination, NotificationController.getHistory);

// Test endpoint (remove in production)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', auth, NotificationController.testSend);
}

module.exports = router;