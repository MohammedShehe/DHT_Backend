const db = require('../config/db');

class User {
  static async create({ full_name, email, password, google_id = null }) {
    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, password, google_id) VALUES (?, ?, ?, ?)`,
      [full_name, email, password, google_id]
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

}

module.exports = User;
