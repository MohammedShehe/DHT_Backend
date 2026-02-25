const db = require('../config/db');

class CalorieGoal {
  static async createOrUpdate(userId, monthlyTarget) {
    const [existing] = await db.query(
      `SELECT id FROM calorie_goals WHERE user_id=?`,
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE calorie_goals SET monthly_target=? WHERE user_id=?`,
        [monthlyTarget, userId]
      );
    } else {
      await db.query(
        `INSERT INTO calorie_goals (user_id, monthly_target) VALUES (?, ?)`,
        [userId, monthlyTarget]
      );
    }
  }

  static async getByUser(userId) {
    const [rows] = await db.query(
      `SELECT * FROM calorie_goals WHERE user_id=?`,
      [userId]
    );
    return rows[0];
  }

  static async delete(userId) {
    await db.query(`DELETE FROM calorie_goals WHERE user_id=?`, [userId]);
  }
}

module.exports = CalorieGoal;