const db = require('../config/db');

class TokenBlacklist {

  static async add(token, expiresAt) {
    await db.query(
      `INSERT INTO token_blacklist (token, expires_at) VALUES (?, ?)`,
      [token, expiresAt]
    );
  }

  static async isBlacklisted(token) {
    const [rows] = await db.query(
      `SELECT id FROM token_blacklist WHERE token=? AND expires_at > NOW()`,
      [token]
    );
    return rows.length > 0;
  }

}

module.exports = TokenBlacklist;
