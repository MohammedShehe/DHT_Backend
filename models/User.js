const db = require('../config/db');

class User {
  static async create({ full_name, email, password, google_id = null }) {
    const passwordValue = password === undefined ? null : password;
    const googleIdValue = google_id === undefined ? null : google_id;
    
    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, password, google_id) 
       VALUES (?, ?, ?, ?)`,
      [full_name, email, passwordValue, googleIdValue]
    );
    return result.insertId;
  }

  static async findByEmail(email) {
    const [rows] = await db.execute(`SELECT * FROM users WHERE email = ?`, [email]);
    return rows[0];
  }

  static async findByGoogleId(google_id) {
    const [rows] = await db.execute(`SELECT * FROM users WHERE google_id = ?`, [google_id]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT id, full_name, email, profile_pic, google_id, 
              CASE WHEN password IS NOT NULL THEN true ELSE false END as has_password 
       FROM users WHERE id=?`,
      [id]
    );
    return rows[0];
  }

  static async updateGoogleId(userId, googleId) {
    await db.query(
      `UPDATE users SET google_id=? WHERE id=?`,
      [googleId, userId]
    );
  }

  static async saveOTP(email, otp, expiry) {
    await db.query(
      `UPDATE users SET reset_otp=?, reset_otp_expires=? WHERE email=?`,
      [otp, expiry, email]
    );
  }

  static async verifyOTP(email, otp) {
    const [rows] = await db.query(
      `SELECT * FROM users WHERE email=? AND reset_otp=? AND reset_otp_expires > NOW()`,
      [email, otp]
    );
    return rows[0];
  }

  static async updatePassword(userId, password) {
    await db.query(
      `UPDATE users SET password=?, reset_otp=NULL, reset_otp_expires=NULL WHERE id=?`,
      [password, userId]
    );
  }

  static async updateName(userId, full_name) {
    await db.query(
      `UPDATE users SET full_name=? WHERE id=?`,
      [full_name, userId]
    );
  }

  static async requestEmailChange(userId, newEmail, otp, expiry) {
    await db.query(
      `UPDATE users 
       SET pending_email=?, email_change_otp=?, email_change_otp_expires=? 
       WHERE id=?`,
      [newEmail, otp, expiry, userId]
    );
  }

  static async confirmEmailChange(userId) {
    await db.query(
      `UPDATE users 
       SET email=pending_email,
           pending_email=NULL,
           email_change_otp=NULL,
           email_change_otp_expires=NULL
       WHERE id=?`,
      [userId]
    );
  }

  static async verifyEmailOTP(userId, otp) {
    const [rows] = await db.query(
      `SELECT * FROM users 
       WHERE id=? 
       AND email_change_otp=? 
       AND email_change_otp_expires > NOW()`,
      [userId, otp]
    );
    return rows[0];
  }

  static async updateProfilePic(userId, path) {
    await db.query(
      `UPDATE users SET profile_pic=? WHERE id=?`,
      [path, userId]
    );
  }

  static async updatePasswordDirect(userId, password) {
    await db.query(
      `UPDATE users SET password=? WHERE id=?`,
      [password, userId]
    );
  }

  static async saveDeleteOTP(userId, otp, expiry) {
    await db.query(
      `UPDATE users 
       SET delete_otp=?, delete_otp_expires=? 
       WHERE id=?`,
      [otp, expiry, userId]
    );
  }

  static async verifyDeleteOTP(userId, otp) {
    const [rows] = await db.query(
      `SELECT id FROM users 
       WHERE id=? 
       AND delete_otp=? 
       AND delete_otp_expires > NOW()`,
      [userId, otp]
    );
    return rows[0];
  }
}

module.exports = User;