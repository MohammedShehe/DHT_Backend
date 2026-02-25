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

exports.sendWelcomeEmail = async (email, fullName) => {
  const mailOptions = {
    from: `"Digital Health Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to Digital Health Tracker!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, ${fullName}! 👋</h2>
        
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
        <p style="color: #6b7280; font-size: 12px;">&copy; 2026 Digital Health Tracker. All rights reserved.</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};