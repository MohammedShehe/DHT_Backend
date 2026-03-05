// models/FCMToken.js
const db = require('../config/db');

class FCMToken {
  // Register or update FCM token
  static async register(userId, token, deviceInfo = {}) {
    const { device_type, device_name } = deviceInfo;

    // Check if token exists
    const [existing] = await db.query(
      `SELECT id FROM fcm_tokens WHERE user_id=? AND fcm_token=?`,
      [userId, token]
    );

    if (existing.length > 0) {
      // Update existing token
      await db.query(
        `UPDATE fcm_tokens SET last_used=CURRENT_TIMESTAMP, device_type=?, device_name=?
         WHERE user_id=? AND fcm_token=?`,
        [device_type || null, device_name || null, userId, token]
      );
      return { message: 'Token updated' };
    } else {
      // Insert new token
      await db.query(
        `INSERT INTO fcm_tokens (user_id, fcm_token, device_type, device_name)
         VALUES (?, ?, ?, ?)`,
        [userId, token, device_type || null, device_name || null]
      );
      return { message: 'Token registered' };
    }
  }

  // Remove FCM token (logout)
  static async remove(userId, token) {
    await db.query(
      `DELETE FROM fcm_tokens WHERE user_id=? AND fcm_token=?`,
      [userId, token]
    );
    return { message: 'Token removed' };
  }

  // Remove all tokens for a user
  static async removeAll(userId) {
    await db.query(
      `DELETE FROM fcm_tokens WHERE user_id=?`,
      [userId]
    );
    return { message: 'All tokens removed' };
  }

  // Get all tokens for a user
  static async getUserTokens(userId) {
    const [rows] = await db.query(
      `SELECT fcm_token, device_type, device_name, last_used 
       FROM fcm_tokens WHERE user_id=? 
       ORDER BY last_used DESC`,
      [userId]
    );
    return rows;
  }
}

module.exports = FCMToken;