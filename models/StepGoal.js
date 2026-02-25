const db = require('../config/db');

class StepGoal {
  static async createOrUpdate(userId, dailyTarget) {
    const [existing] = await db.query(
      `SELECT id FROM step_goals WHERE user_id=?`,
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE step_goals SET daily_target=? WHERE user_id=?`,
        [dailyTarget, userId]
      );
    } else {
      await db.query(
        `INSERT INTO step_goals (user_id, daily_target) VALUES (?, ?)`,
        [userId, dailyTarget]
      );
    }
  }

  static async getByUser(userId) {
    const [rows] = await db.query(
      `SELECT * FROM step_goals WHERE user_id=?`,
      [userId]
    );
    return rows[0];
  }

  static async delete(userId) {
    await db.query(`DELETE FROM step_goals WHERE user_id=?`, [userId]);
  }
}

module.exports = StepGoal;