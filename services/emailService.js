// services/emailService.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"Digital Health Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Digital Health Tracker</h2>
        <p>Your verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px; color: #1e3a8a;">${otp}</h1>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px;">&copy; 2026 Digital Health Tracker. All rights reserved.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendLoginOTP = async (email, otp, fullName) => {
  const mailOptions = {
    from: `"Digital Health Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🔐 Login Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Digital Health Tracker</h2>
        <p style="font-size: 16px;">Hello <strong>${fullName}</strong>,</p>
        <p>Your login verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="font-size: 48px; letter-spacing: 8px; color: #1e3a8a; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #ef4444; font-weight: bold;">⚠️ This code will expire in 10 minutes.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't attempt to login, please secure your account immediately.</p>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">&copy; 2026 Digital Health Tracker. All rights reserved.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

exports.sendWelcomeEmail = async (email, fullName) => {
  const mailOptions = {
    from: `"Digital Health Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to Digital Health Tracker!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Welcome, ${fullName}! 👋</h2>
        
        <p>Thank you for joining <strong>Digital Health Tracker</strong>.</p>
        
        <p>We're excited to help you track and improve your health journey.</p>
        
        <h4 style="color: #374151;">What you can do:</h4>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;">✅ Track steps, water, sleep, and more</li>
          <li style="margin: 10px 0;">✅ Set personalized health goals</li>
          <li style="margin: 10px 0;">✅ Monitor your progress over time</li>
          <li style="margin: 10px 0;">✅ Secure and private health dashboard</li>
        </ul>

        <p>Ready to start? <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="color: #2563eb;">Go to your dashboard</a></p>

        <p>Stay healthy! 💙<br/>
        <strong>The DHT Team</strong></p>
        
        <hr style="border: 1px solid #e5e7eb;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center;">&copy; 2026 Digital Health Tracker. All rights reserved.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};