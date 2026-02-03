const User = require('../models/User');
const { hashPassword, comparePassword } = require('../services/passwordService');
const { generateToken } = require('../services/jwtService');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthController {
  // Email/password registration
  static async register(req, res) {
    try {
      const { full_name, email, password, confirm_password } = req.body;

      if (!full_name || !email || !password || !confirm_password) {
        return res.status(400).json({ message: "All fields are required." });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered." });
      }

      const hashedPassword = await hashPassword(password);
      const userId = await User.create({ full_name, email, password: hashedPassword });

      const newUser = await User.findById(userId);

      const token = generateToken(newUser);

      return res.status(201).json({ message: "User registered successfully.", userId, token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Email/password login
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required." });
      }

      const user = await User.findByEmail(email);
      if (!user) return res.status(400).json({ message: "Invalid credentials." });

      const validPassword = await comparePassword(password, user.password);
      if (!validPassword) return res.status(400).json({ message: "Invalid credentials." });

      const token = generateToken(user);
      res.json({ message: "Login successful.", token });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  // Google OAuth login
  static async googleLogin(req, res) {
    try {
      const { token } = req.body;
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { sub, email, name } = payload;

      let user = await User.findByGoogleId(sub);
      if (!user) {
        const userId = await User.create({ full_name: name, email, google_id: sub });
        user = { id: userId, full_name: name, email };
      }

      const jwtToken = generateToken(user);
      res.json({ message: "Google login successful.", token: jwtToken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Google login failed." });
    }
  }

    static async sendResetOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email required." });

      const user = await User.findByEmail(email);
      if (!user) return res.status(404).json({ message: "Email not registered." });

      const otp = require('../services/otpService').generateOTP();
      const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

      await User.saveOTP(email, otp, expiry);
      await require('../services/emailService').sendOTP(email, otp);

      res.json({ message: "OTP sent to email." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to send OTP." });
    }
  }

  static async verifyResetOTP(req, res) {
  try {
    const { email, otp } = req.body;

    const user = await User.verifyOTP(email, otp);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP." });
    }

    res.json({ message: "OTP verified." });
  } catch (err) {
    res.status(500).json({ message: "OTP verification failed." });
  }
}

  static async resetPassword(req, res) {
    try {
      const { email, otp, password, confirm_password } = req.body;

      if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      const user = await User.verifyOTP(email, otp);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }

      const hashedPassword = await require('../services/passwordService').hashPassword(password);
      await User.updatePassword(user.id, hashedPassword);

      res.json({ message: "Password reset successful." });
    } catch (err) {
      res.status(500).json({ message: "Password reset failed." });
    }
  }
}

module.exports = AuthController;
