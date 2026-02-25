const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TokenBlacklist = require('../models/TokenBlacklist');
const { comparePassword } = require('../services/passwordService');
const { generateOTP } = require('../services/otpService');
const { sendOTP } = require('../services/emailService');
const db = require('../config/db');

class AccountController {
  static async requestDelete(req, res) {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ message: "Password required" });
      }

      const user = await User.findByEmail(req.user.email);
      
      if (user.password) {
        const valid = await comparePassword(password, user.password);
        if (!valid) {
          return res.status(400).json({ message: "Incorrect password" });
        }
      }

      const otp = generateOTP();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.saveDeleteOTP(req.user.id, otp, expiry);
      await sendOTP(user.email, otp);

      res.json({ message: "Deletion OTP sent to your email" });
    } catch (err) {
      console.error('Delete request error:', err);
      res.status(500).json({ message: "Account deletion process failed." });
    }
  }

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

      // Get user info before deletion for cleanup
      const user = await User.findById(req.user.id);
      
      // Delete profile picture if exists
      if (user?.profile_pic) {
        try {
          const fs = require('fs').promises;
          const path = require('path');
          const filePath = path.join(__dirname, '..', user.profile_pic);
          await fs.access(filePath);
          await fs.unlink(filePath);
        } catch (err) {
          // File doesn't exist or can't be accessed, ignore
        }
      }

      // Delete user (cascades to all related data)
      await db.query(`DELETE FROM users WHERE id=?`, [req.user.id]);

      // Blacklist current token
      const decoded = jwt.decode(req.token);
      await TokenBlacklist.add(
        req.token,
        new Date(decoded.exp * 1000)
      );

      res.json({ message: "Account deleted permanently" });
    } catch (err) {
      console.error('Delete confirmation error:', err);
      res.status(500).json({ message: "Account deletion failed" });
    }
  }

  static async logout(req, res) {
    try {
      const decoded = jwt.decode(req.token);
      await TokenBlacklist.add(
        req.token,
        new Date(decoded.exp * 1000)
      );
      res.json({ message: "Logged out successfully" });
    } catch (err) {
      console.error('Logout error:', err);
      res.status(500).json({ message: "Logout failed" });
    }
  }
}

module.exports = AccountController;