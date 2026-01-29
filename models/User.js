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
}

module.exports = User;
