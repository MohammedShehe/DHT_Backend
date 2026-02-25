const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/register', AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/google', authLimiter, AuthController.googleLogin);
router.post('/forgot-password', authLimiter, AuthController.sendResetOTP);
router.post('/verify-otp', authLimiter, AuthController.verifyResetOTP);
router.post('/reset-password', authLimiter, AuthController.resetPassword);

module.exports = router;