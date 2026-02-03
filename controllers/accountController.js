const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const { comparePassword } = require('../services/passwordService');
const { generateOTP } = require('../services/otpService');
const { sendOTP } = require('../services/emailService');
const db = require('../config/db');
require('dotenv').config();

class AccountController {

  // STEP 1️⃣ Request account deletion (send email OTP)
  static async requestDelete(req, res) {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password required" });
      }

      const user = await User.findByEmail(req.user.email);
      const valid = await comparePassword(password, user.password);

      if (!valid) {
        return res.status(400).json({ message: "Incorrect password" });
      }

      const otp = generateOTP();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      await User.saveDeleteOTP(req.user.id, otp, expiry);
      await sendOTP(user.email, otp);

      res.json({ message: "Deletion OTP sent to your email" });
    } catch (err) {
      console.error('Delete request error:', err.message);
      res.status(500).json({ message: "Account deletion process failed. Please try again." });
    }
  }

  // STEP 2️⃣ Confirm deletion with OTP
  static async confirmDelete(req, res) {
    try {
      const { otp } = req.body;
      if (!otp) {
        return res.status(400).json({ message: "OTP required" });
      }

      const verified = await User.verifyDeleteOTP(req.user.id, otp);
      if (!verified) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // Delete user
      await db.query(`DELETE FROM users WHERE id=?`, [req.user.id]);

      // Blacklist current token
      const decoded = jwt.decode(req.token);
      await TokenBlacklist.add(
        req.token,
        new Date(decoded.exp * 1000)
      );

      res.json({ message: "Account deleted permanently" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Account deletion failed" });
    }
  }

  // Logout (unchanged)
  static async logout(req, res) {
    try {
      const decoded = jwt.decode(req.token);
      await TokenBlacklist.add(
        req.token,
        new Date(decoded.exp * 1000)
      );
      res.json({ message: "Logged out successfully" });
    } catch (err) {
      res.status(500).json({ message: "Logout failed" });
    }
  }
}

module.exports = AccountController;
