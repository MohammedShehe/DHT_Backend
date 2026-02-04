const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { comparePassword, hashPassword } = require('../services/passwordService'); // Added hashPassword
const { generateOTP } = require('../services/otpService');
const { sendOTP } = require('../services/emailService');
const db = require('../config/db');
const { OAuth2Client } = require('google-auth-library'); // Added OAuth2Client
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Add this new method to check user existence for Google
const checkGoogleUserExistence = async (googleId, email) => {
  try {
    // Check by Google ID first
    let user = await User.findByGoogleId(googleId);
    if (user) {
      return {
        exists: true,
        user: user,
        requiresPasswordSetup: !user.password
      };
    }
    
    // Check by email (in case user signed up with email/password first)
    user = await User.findByEmail(email);
    if (user) {
      return {
        exists: true,
        user: user,
        requiresPasswordSetup: !user.password
      };
    }
    
    return {
      exists: false,
      user: null,
      requiresPasswordSetup: false
    };
  } catch (error) {
    throw error;
  }
};

// Add generateToken function (or import it from jwtService)
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

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

  // Google OAuth login - handles both ID tokens and access tokens
  static async googleLogin(req, res) {
    try {
      const { token, accessToken, check_existence } = req.body;
      
      // If accessToken is provided but token (idToken) is not, use accessToken
      if (!token && accessToken) {
        return await AuthController.googleLoginWithAccessToken(req, res, check_existence);
      }
      
      // Original ID token verification logic
      if (!token) {
        return res.status(400).json({ message: "Google token required." });
      }

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { sub, email, name } = payload;

      // Check if this is just an existence check
      if (check_existence) {
        const existence = await checkGoogleUserExistence(sub, email);
        return res.json({
          message: "User existence checked",
          userExists: existence.exists,
          requiresPasswordSetup: existence.requiresPasswordSetup
        });
      }

      let user = await User.findByGoogleId(sub);
      if (!user) {
        const userId = await User.create({ full_name: name, email, password: null, google_id: sub });
        user = { id: userId, full_name: name, email };
      }

      const jwtToken = generateToken(user);
      res.json({ 
        message: "Google login successful.", 
        token: jwtToken,
        requiresPasswordSetup: !user.password
      });
    } catch (err) {
      console.error('Google login error:', err.message);
      res.status(500).json({ message: "Google login failed." });
    }
  }

  // Google login with access token
  static async googleLoginWithAccessToken(req, res, check_existence = false) {
    try {
      const { accessToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ message: "Access token required." });
      }

      // Use Node.js native https module
      const https = require('https');
      
      // Make request to Google API to get user info
      const userInfo = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          path: '/oauth2/v3/userinfo',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        };
        
        const request = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              const parsedData = JSON.parse(data);
              
              if (response.statusCode >= 200 && response.statusCode < 300) {
                resolve(parsedData);
              } else {
                reject(new Error(`Google API error: ${parsedData.error?.message || 'Unknown error'}`));
              }
            } catch (parseError) {
              reject(new Error(`Failed to parse Google API response: ${parseError.message}`));
            }
          });
        });
        
        request.on('error', (error) => {
          reject(new Error(`Google API request failed: ${error.message}`));
        });
        
        request.setTimeout(10000, () => {
          request.destroy();
          reject(new Error('Google API request timeout'));
        });
        
        request.end();
      });

      // Validate user info
      if (!userInfo || !userInfo.sub || !userInfo.email) {
        throw new Error('Invalid user info from Google');
      }

      const googleId = userInfo.sub;
      const email = userInfo.email;
      const name = userInfo.name || userInfo.email.split('@')[0] || 'Google User';

      // Check if this is just an existence check
      if (check_existence) {
        const existence = await checkGoogleUserExistence(googleId, email);
        return res.json({
          message: "User existence checked",
          userExists: existence.exists,
          requiresPasswordSetup: existence.requiresPasswordSetup
        });
      }

      // Find or create user
      let user = await User.findByEmail(email);
      
      if (!user) {
        user = await User.findByGoogleId(googleId);
        
        if (!user) {
          const userId = await User.create({ 
            full_name: name, 
            email: email, 
            password: null, 
            google_id: googleId 
          });
          user = { 
            id: userId, 
            full_name: name, 
            email: email 
          };
        }
      } else if (!user.google_id) {
        await User.updateGoogleId(user.id, googleId);
      }

      const jwtToken = generateToken(user);
      res.json({ 
        message: "Google login successful.", 
        token: jwtToken,
        requiresPasswordSetup: !user.password
      });
      
    } catch (err) {
      console.error('Google login with access token error:', err.message);
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
      const expiry = new Date(Date.now() + 10 * 60 * 1000);

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

      const hashedPassword = await hashPassword(password);
      await User.updatePassword(user.id, hashedPassword);

      res.json({ message: "Password reset successful." });
    } catch (err) {
      res.status(500).json({ message: "Password reset failed." });
    }
  }
}

module.exports = AuthController;