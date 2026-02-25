const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { comparePassword, hashPassword } = require('../services/passwordService');
const { generateOTP } = require('../services/otpService');
const { sendOTP, sendWelcomeEmail } = require('../services/emailService');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const checkGoogleUserExistence = async (googleId, email) => {
  try {
    let user = await User.findByGoogleId(googleId);
    if (user) {
      return {
        exists: true,
        user: user,
        requiresPasswordSetup: !user.password
      };
    }
    
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

class AuthController {
  static async register(req, res) {
    try {
      const { full_name, email, password, confirm_password } = req.body;

      if (!full_name?.trim() || !email?.trim() || !password || !confirm_password) {
        return res.status(400).json({ message: "All fields are required." });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered." });
      }

      const hashedPassword = await hashPassword(password);
      const userId = await User.create({ 
        full_name: full_name.trim(), 
        email: email.trim().toLowerCase(), 
        password: hashedPassword 
      });

      const newUser = await User.findById(userId);

      sendWelcomeEmail(email, full_name.trim())
        .catch(err => console.error("Welcome email failed:", err.message));

      const token = generateToken(newUser);

      return res.status(201).json({ 
        message: "User registered successfully.", 
        user: {
          id: newUser.id,
          full_name: newUser.full_name,
          email: newUser.email,
          profile_pic: newUser.profile_pic
        },
        token 
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ message: "Registration failed. Please try again." });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email?.trim() || !password) {
        return res.status(400).json({ message: "Email and password required." });
      }

      const user = await User.findByEmail(email.trim().toLowerCase());
      if (!user) return res.status(400).json({ message: "Invalid credentials." });

      if (!user.password) {
        return res.status(400).json({ 
          message: "This account uses Google Sign-In. Please login with Google or set a password."
        });
      }

      const validPassword = await comparePassword(password, user.password);
      if (!validPassword) return res.status(400).json({ message: "Invalid credentials." });

      const token = generateToken(user);
      
      res.json({ 
        message: "Login successful.", 
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          profile_pic: user.profile_pic
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: "Login failed. Please try again." });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { token, accessToken, check_existence } = req.body;
      
      if (accessToken) {
        return await AuthController.googleLoginWithAccessToken(req, res, check_existence);
      }
      
      if (!token) {
        return res.status(400).json({ message: "Google token required." });
      }

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      const { sub, email, name, picture } = payload;

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
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          await User.updateGoogleId(existingUser.id, sub);
          user = existingUser;
        } else {
          const userId = await User.create({ 
            full_name: name, 
            email, 
            password: null, 
            google_id: sub 
          });
          user = await User.findById(userId);
        }
      }

      const jwtToken = generateToken(user);
      
      res.json({ 
        message: "Google login successful.", 
        token: jwtToken,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          profile_pic: user.profile_pic || picture
        },
        requiresPasswordSetup: !user.password
      });
    } catch (err) {
      console.error('Google login error:', err.message);
      res.status(500).json({ message: "Google login failed." });
    }
  }

  static async googleLoginWithAccessToken(req, res, check_existence = false) {
    try {
      const { accessToken } = req.body;
      
      if (!accessToken) {
        return res.status(400).json({ message: "Access token required." });
      }

      const https = require('https');
      
      const userInfo = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'www.googleapis.com',
          path: '/oauth2/v3/userinfo',
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        };
        
        const request = https.request(options, (response) => {
          let data = '';
          
          response.on('data', (chunk) => { data += chunk; });
          
          response.on('end', () => {
            try {
              const parsedData = JSON.parse(data);
              
              if (response.statusCode >= 200 && response.statusCode < 300) {
                resolve(parsedData);
              } else {
                reject(new Error(parsedData.error?.message || 'Google API error'));
              }
            } catch (parseError) {
              reject(new Error('Failed to parse Google API response'));
            }
          });
        });
        
        request.on('error', reject);
        request.on('timeout', () => {
          request.destroy();
          reject(new Error('Google API request timeout'));
        });
        
        request.end();
      });

      if (!userInfo?.sub || !userInfo?.email) {
        throw new Error('Invalid user info from Google');
      }

      const googleId = userInfo.sub;
      const email = userInfo.email;
      const name = userInfo.name || email.split('@')[0];
      const picture = userInfo.picture;

      if (check_existence) {
        const existence = await checkGoogleUserExistence(googleId, email);
        return res.json({
          message: "User existence checked",
          userExists: existence.exists,
          requiresPasswordSetup: existence.requiresPasswordSetup
        });
      }

      let user = await User.findByEmail(email);
      
      if (!user) {
        user = await User.findByGoogleId(googleId);
        
        if (!user) {
          const userId = await User.create({ 
            full_name: name, 
            email, 
            password: null, 
            google_id: googleId 
          });
          user = await User.findById(userId);
        }
      } else if (!user.google_id) {
        await User.updateGoogleId(user.id, googleId);
      }

      const jwtToken = generateToken(user);
      
      res.json({ 
        message: "Google login successful.", 
        token: jwtToken,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          profile_pic: user.profile_pic || picture
        },
        requiresPasswordSetup: !user.password
      });
      
    } catch (err) {
      console.error('Google access token login error:', err.message);
      res.status(500).json({ message: "Google login failed." });
    }
  }

  static async sendResetOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email?.trim()) {
        return res.status(400).json({ message: "Email required." });
      }

      const user = await User.findByEmail(email.trim().toLowerCase());
      if (!user) {
        return res.status(404).json({ message: "Email not registered." });
      }

      const otp = generateOTP();
      const expiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.saveOTP(email, otp, expiry);
      await sendOTP(email, otp);

      res.json({ message: "OTP sent to email." });
    } catch (err) {
      console.error('Send OTP error:', err);
      res.status(500).json({ message: "Failed to send OTP." });
    }
  }

  static async verifyResetOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email?.trim() || !otp) {
        return res.status(400).json({ message: "Email and OTP required." });
      }

      const user = await User.verifyOTP(email.trim().toLowerCase(), otp);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }

      res.json({ message: "OTP verified." });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ message: "OTP verification failed." });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { email, otp, password, confirm_password } = req.body;

      if (!email?.trim() || !otp || !password || !confirm_password) {
        return res.status(400).json({ message: "All fields required." });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ message: "Passwords do not match." });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }

      const user = await User.verifyOTP(email.trim().toLowerCase(), otp);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }

      const hashedPassword = await hashPassword(password);
      await User.updatePassword(user.id, hashedPassword);

      res.json({ message: "Password reset successful." });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ message: "Password reset failed." });
    }
  }
}

module.exports = AuthController;