const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOTP = async (email, otp) => {
  await transporter.sendMail({
    from: `"DHT Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Confirmation OTP',
    html: `
      <h3>Confirmation OTP</h3>
      <p>Your OTP is:</p>
      <h2>${otp}</h2>
      <p>This OTP expires in 10 minutes.</p>
    `
  });
};


// ✅ ADD THIS FUNCTION
exports.sendWelcomeEmail = async (email, fullName) => {
  await transporter.sendMail({
    from: `"Digital Health Tracker" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎉 Welcome to Digital Health Tracker!',
    html: `
      <div style="font-family: Arial, sans-serif; line-height:1.6;">
        <h2>Welcome, ${fullName}! 👋</h2>
        
        <p>Thank you for registering with <strong>Digital Health Tracker (DHT)</strong>.</p>
        
        <p>We’re excited to help you track and manage your health journey efficiently.</p>
        
        <h4>What you can do with DHT:</h4>
        <ul>
          <li>✔ Track your health metrics</li>
          <li>✔ Monitor progress over time</li>
          <li>✔ Manage your profile securely</li>
        </ul>

        <p>If you have any questions, feel free to reach out to our support team.</p>

        <p>Stay healthy 💙<br/>
        <strong>DHT Team</strong></p>
      </div>
    `
  });
};
