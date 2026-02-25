const db = require('../config/db');

class WorkoutLog {
  static async logWorkout(userId, workouts) {
    const today = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO workout_logs (user_id, workouts, log_date)
       VALUES (?, ?, ?)`,
      [userId, workouts, today]
    );
  }

  static async getTodayTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(workouts), 0) as total
       FROM workout_logs
       WHERE user_id=? AND log_date=CURDATE()`,
      [userId]
    );

    return rows[0].total;
  }

  static async getWeeklyTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(workouts), 0) as total
       FROM workout_logs
       WHERE user_id=?
       AND YEARWEEK(log_date, 1) = YEARWEEK(CURDATE(), 1)`,
      [userId]
    );

    return rows[0].total;
  }

  static async getMonthlyTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(workouts), 0) as total
       FROM workout_logs
       WHERE user_id=?
       AND YEAR(log_date)=YEAR(CURDATE())
       AND MONTH(log_date)=MONTH(CURDATE())`,
      [userId]
    );

    return rows[0].total;
  }

  static async getLogs(userId, limit, offset) {
    const [rows] = await db.query(
      `SELECT id, workouts, log_date, created_at
       FROM workout_logs
       WHERE user_id=?
       ORDER BY log_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows;
  }

  static async updateLog(userId, logId, workouts) {
    await db.query(
      `UPDATE workout_logs
       SET workouts=?
       WHERE id=? AND user_id=?`,
      [workouts, logId, userId]
    );
  }

  static async deleteLog(userId, logId) {
    await db.query(
      `DELETE FROM workout_logs
       WHERE id=? AND user_id=?`,
      [logId, userId]
    );
  }

  static async resetDaily(userId) {
    await db.query(
      `DELETE FROM workout_logs
       WHERE user_id=? AND log_date=CURDATE()`,
      [userId]
    );
  }

  static async resetWeekly(userId) {
    await db.query(
      `DELETE FROM workout_logs
       WHERE user_id=?
       AND YEARWEEK(log_date,1)=YEARWEEK(CURDATE(),1)`,
      [userId]
    );
  }

  static async resetMonthly(userId) {
    await db.query(
      `DELETE FROM workout_logs
       WHERE user_id=?
       AND YEAR(log_date)=YEAR(CURDATE())
       AND MONTH(log_date)=MONTH(CURDATE())`,
      [userId]
    );
  }
}

module.exports = WorkoutLog;