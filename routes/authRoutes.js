const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/google', AuthController.googleLogin);
router.post('/forgot-password', AuthController.sendResetOTP);
router.post('/verify-otp', AuthController.verifyResetOTP);
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;
