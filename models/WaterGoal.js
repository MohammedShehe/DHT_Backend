const db = require('../config/db');

class WaterGoal {
  static async createOrUpdate(userId, dailyTarget) {
    const [existing] = await db.query(
      `SELECT id FROM water_goals WHERE user_id=?`,
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE water_goals SET daily_target=? WHERE user_id=?`,
        [dailyTarget, userId]
      );
    } else {
      await db.query(
        `INSERT INTO water_goals (user_id, daily_target) VALUES (?, ?)`,
        [userId, dailyTarget]
      );
    }
  }

  static async getByUser(userId) {
    const [rows] = await db.query(
      `SELECT * FROM water_goals WHERE user_id=?`,
      [userId]
    );
    return rows[0];
  }

  static async delete(userId) {
    await db.query(`DELETE FROM water_goals WHERE user_id=?`, [userId]);
  }
}

module.exports = WaterGoal;