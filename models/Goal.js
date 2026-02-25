const db = require('../config/db');

class Goal {
  static async createGoal(userId, type, targetValue, period) {
    await db.query(
      `INSERT INTO goals (user_id, type, target_value, period)
       VALUES (?, ?, ?, ?)`,
      [userId, type, targetValue, period]
    );
  }

  static async deleteGoal(userId, goalId) {
    await db.query(
      `DELETE FROM goals WHERE id=? AND user_id=?`,
      [goalId, userId]
    );
  }

  static async getUserGoals(userId) {
    const [goals] = await db.query(
      `SELECT * FROM goals WHERE user_id=?`,
      [userId]
    );

    const result = [];

    for (const goal of goals) {
      const current = await this.calculateProgress(userId, goal);
      const percentage = Math.min(
        Math.floor((current / goal.target_value) * 100),
        100
      );

      result.push({
        id: goal.id,
        type: goal.type,
        target: goal.target_value,
        period: goal.period,
        current,
        percentage,
        completed: current >= goal.target_value,
        createdAt: goal.created_at
      });
    }

    return result;
  }

  static async calculateProgress(userId, goal) {
    const { type, period } = goal;

    let dateCondition = '';

    if (period === 'daily') {
      dateCondition = `log_date = CURDATE()`;
    } else if (period === 'weekly') {
      dateCondition = `YEARWEEK(log_date, 1) = YEARWEEK(CURDATE(), 1)`;
    } else if (period === 'monthly') {
      dateCondition = `
        YEAR(log_date) = YEAR(CURDATE())
        AND MONTH(log_date) = MONTH(CURDATE())
      `;
    }

    const tableMap = {
      steps: { table: 'step_logs', column: 'steps' },
      water: { table: 'water_logs', column: 'glasses' },
      sleep: { table: 'sleep_logs', column: 'hours' },
      workout: { table: 'workout_logs', column: 'workouts' },
      calories: { table: 'calorie_logs', column: 'calories' },
      meditation: { table: 'meditation_logs', column: 'minutes' }
    };

    const { table, column } = tableMap[type];

    if (!table) return 0;

    const [rows] = await db.query(
      `SELECT COALESCE(SUM(${column}), 0) as total
       FROM ${table}
       WHERE user_id=? AND ${dateCondition}`,
      [userId]
    );

    return rows[0].total;
  }

  static async getGoalById(userId, goalId) {
    const [rows] = await db.query(
      `SELECT * FROM goals WHERE id=? AND user_id=?`,
      [goalId, userId]
    );
    return rows[0] || null;
  }
}

module.exports = Goal;