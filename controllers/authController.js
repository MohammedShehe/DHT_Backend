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

      return res.status(201).json({ message: "User registered successfully.", userId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error." });
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
      res.status(500).json({ message: "Server error." });
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
}

module.exports = AuthController;
