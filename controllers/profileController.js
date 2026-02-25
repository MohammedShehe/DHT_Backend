const User = require('../models/User');
const { comparePassword, hashPassword } = require('../services/passwordService');
const { generateOTP } = require('../services/otpService');
const { sendOTP } = require('../services/emailService');
const fs = require('fs').promises;
const path = require('path');

class ProfileController {
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  }

  static async updateName(req, res) {
    try {
      const { full_name } = req.body;
      if (!full_name?.trim()) {
        return res.status(400).json({ message: "Name required" });
      }

      await User.updateName(req.user.id, full_name.trim());
      res.json({ message: "Name updated successfully" });
    } catch (err) {
      console.error('Update name error:', err);
      res.status(500).json({ message: "Failed to update name" });
    }
  }

  static async requestEmailChange(req, res) {
    try {
      const { new_email } = req.body;
      if (!new_email?.trim()) {
        return res.status(400).json({ message: "New email required" });
      }

      const normalizedEmail = new_email.trim().toLowerCase();

      const existingUser = await User.findByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({
          message: "This email is already registered with another account."
        });
      }

      const currentUser = await User.findById(req.user.id);
      if (currentUser.email === normalizedEmail) {
        return res.status(400).json({
          message: "New email cannot be the same as your current email."
        });
      }

      const otp = generateOTP();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.requestEmailChange(req.user.id, normalizedEmail, otp, expiry);
      await sendOTP(normalizedEmail, otp);

      res.json({ message: "OTP sent to new email" });
    } catch (err) {
      console.error('Email change request error:', err);
      res.status(500).json({ message: "Failed to request email change" });
    }
  }

  static async confirmEmailChange(req, res) {
    try {
      const { otp } = req.body;

      if (!otp) {
        return res.status(400).json({ message: "OTP required" });
      }

      const user = await User.verifyEmailOTP(req.user.id, otp);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      await User.confirmEmailChange(req.user.id);
      res.json({ message: "Email updated successfully" });
    } catch (err) {
      console.error('Email confirmation error:', err);
      res.status(500).json({ message: "Failed to confirm email change" });
    }
  }

  static async uploadProfilePic(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image required" });
      }

      const user = await User.findById(req.user.id);
      
      // Delete old profile pic if exists
      if (user.profile_pic) {
        try {
          const oldPath = path.join(__dirname, '..', user.profile_pic);
          await fs.access(oldPath);
          await fs.unlink(oldPath);
        } catch (err) {
          // File doesn't exist or can't be accessed, ignore
        }
      }

      await User.updateProfilePic(req.user.id, req.file.path.replace(/\\/g, '/'));
      
      res.json({ 
        message: "Profile picture updated",
        profile_pic: req.file.path.replace(/\\/g, '/')
      });
    } catch (err) {
      console.error('Profile pic upload error:', err);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  }

  static async changePassword(req, res) {
    try {
      const { current_password, new_password, confirm_password } = req.body;

      if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({ message: "All fields required" });
      }

      if (new_password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      if (new_password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await User.findById(req.user.id);
      const dbUser = await User.findByEmail(user.email);

      if (!dbUser.password) {
        return res.status(400).json({ 
          message: "This account doesn't have a password. Use 'Setup Password' instead."
        });
      }

      const valid = await comparePassword(current_password, dbUser.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password incorrect" });
      }

      const hashed = await hashPassword(new_password);
      await User.updatePasswordDirect(req.user.id, hashed);

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error('Change password error:', err);
      res.status(500).json({ message: "Failed to change password" });
    }
  }

  static async hasPassword(req, res) {
    try {
      const user = await User.findById(req.user.id);
      const dbUser = await User.findByEmail(user.email);
      res.json({ hasPassword: !!dbUser?.password });
    } catch (err) {
      console.error('Check password error:', err);
      res.status(500).json({ message: "Failed to check password status" });
    }
  }

  static async setupPassword(req, res) {
    try {
      const { password, confirm_password } = req.body;

      if (!password || !confirm_password) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const user = await User.findById(req.user.id);
      const dbUser = await User.findByEmail(user.email);

      if (dbUser.password) {
        return res.status(400).json({
          message: "Password already exists. Use change password instead."
        });
      }

      const hashed = await hashPassword(password);
      await User.updatePasswordDirect(req.user.id, hashed);

      res.json({ message: "Password setup successful" });
    } catch (err) {
      console.error('Setup password error:', err);
      res.status(500).json({ message: "Failed to setup password" });
    }
  }
}

module.exports = ProfileController;