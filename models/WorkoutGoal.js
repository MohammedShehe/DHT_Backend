const db = require('../config/db');

class WorkoutGoal {
  static async createOrUpdate(userId, weeklyTarget) {
    const [existing] = await db.query(
      `SELECT id FROM workout_goals WHERE user_id=?`,
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE workout_goals SET weekly_target=? WHERE user_id=?`,
        [weeklyTarget, userId]
      );
    } else {
      await db.query(
        `INSERT INTO workout_goals (user_id, weekly_target) VALUES (?, ?)`,
        [userId, weeklyTarget]
      );
    }
  }

  static async getByUser(userId) {
    const [rows] = await db.query(
      `SELECT * FROM workout_goals WHERE user_id=?`,
      [userId]
    );
    return rows[0];
  }

  static async delete(userId) {
    await db.query(`DELETE FROM workout_goals WHERE user_id=?`, [userId]);
  }
}

module.exports = WorkoutGoal;