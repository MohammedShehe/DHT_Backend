const User = require('../models/User');
const { comparePassword, hashPassword } = require('../services/passwordService');
const { generateOTP } = require('../services/otpService');
const { sendOTP } = require('../services/emailService');

class ProfileController {

  // View profile
  static async getProfile(req, res) {
    const user = await User.findById(req.user.id);
    res.json(user);
  }

  // Update name
  static async updateName(req, res) {
    const { full_name } = req.body;
    if (!full_name) {
      return res.status(400).json({ message: "Name required" });
    }

    await User.updateName(req.user.id, full_name);
    res.json({ message: "Name updated successfully" });
  }

  // Request email change
  static async requestEmailChange(req, res) {
    const { new_email } = req.body;
    if (!new_email) {
      return res.status(400).json({ message: "New email required" });
    }

    // ✅ CHECK if email already exists
    const existingUser = await User.findByEmail(new_email);
    if (existingUser) {
      return res.status(400).json({
        message: "This email is already registered with another account."
      });
    }

    // ✅ CHECK if new email is same as current email
    const currentUser = await User.findById(req.user.id);
    if (currentUser.email === new_email) {
      return res.status(400).json({
        message: "New email cannot be the same as your current email."
      });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.requestEmailChange(req.user.id, new_email, otp, expiry);
    await sendOTP(new_email, otp);

    res.json({ message: "OTP sent to new email" });
  }

  // Confirm email change
  static async confirmEmailChange(req, res) {
    const { otp } = req.body;

    const user = await User.verifyEmailOTP(req.user.id, otp);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    await User.confirmEmailChange(req.user.id);
    res.json({ message: "Email updated successfully" });
  }

  // Upload profile picture
  static async uploadProfilePic(req, res) {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    await User.updateProfilePic(req.user.id, req.file.path);
    res.json({ message: "Profile picture updated" });
  }

  // Change password
  static async changePassword(req, res) {
    const { current_password, new_password, confirm_password } = req.body;

    if (new_password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const user = await User.findById(req.user.id);
    const dbUser = await User.findByEmail(user.email);

    const valid = await comparePassword(current_password, dbUser.password);
    if (!valid) {
      return res.status(400).json({ message: "Current password incorrect" });
    }

    const hashed = await hashPassword(new_password);
    await User.updatePasswordDirect(req.user.id, hashed);

    res.json({ message: "Password changed successfully" });
  }

  // Check if user has password
  static async hasPassword(req, res) {
    try {
      const user = await User.findById(req.user.id);

      // Fetch password explicitly (in case it's hidden in findById)
      const dbUser = await User.findByEmail(user.email);

      res.json({ hasPassword: !!dbUser.password });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to check password status" });
    }
  }

  // ✅ UPDATED: Setup password (ONLY for Google/OAuth users without password)
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

      // Check for password requirements
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one uppercase letter" });
      }

      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ message: "Password must contain at least one number" });
      }

      const user = await User.findById(req.user.id);
      const dbUser = await User.findByEmail(user.email);

      // Only allow password setup if user doesn't have a password (Google/OAuth users)
      if (dbUser.password) {
        return res.status(400).json({
          message: "Password already exists. Use change password instead."
        });
      }

      const hashed = await hashPassword(password);
      await User.updatePasswordDirect(req.user.id, hashed);

      res.json({ message: "Password setup successful" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to setup password" });
    }
  }
}

module.exports = ProfileController;