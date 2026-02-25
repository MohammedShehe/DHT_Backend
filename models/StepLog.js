const db = require('../config/db');

class StepLog {
  static async logSteps(userId, steps) {
    const today = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO step_logs (user_id, steps, log_date)
       VALUES (?, ?, ?)`,
      [userId, steps, today]
    );
  }

  static async getTodayTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(steps), 0) as total
       FROM step_logs
       WHERE user_id=? AND log_date=CURDATE()`,
      [userId]
    );

    return rows[0].total;
  }

  static async getWeeklyTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(steps), 0) as total
       FROM step_logs
       WHERE user_id=?
       AND YEARWEEK(log_date, 1) = YEARWEEK(CURDATE(), 1)`,
      [userId]
    );

    return rows[0].total;
  }

  static async getMonthlyTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(steps), 0) as total
       FROM step_logs
       WHERE user_id=?
       AND YEAR(log_date)=YEAR(CURDATE())
       AND MONTH(log_date)=MONTH(CURDATE())`,
      [userId]
    );

    return rows[0].total;
  }

  static async getLogs(userId, limit, offset) {
    const [rows] = await db.query(
      `SELECT id, steps, log_date, created_at
       FROM step_logs
       WHERE user_id=?
       ORDER BY log_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows;
  }

  static async updateLog(userId, logId, steps) {
    await db.query(
      `UPDATE step_logs
       SET steps=?
       WHERE id=? AND user_id=?`,
      [steps, logId, userId]
    );
  }

  static async deleteLog(userId, logId) {
    await db.query(
      `DELETE FROM step_logs
       WHERE id=? AND user_id=?`,
      [logId, userId]
    );
  }

  static async resetDaily(userId) {
    await db.query(
      `DELETE FROM step_logs
       WHERE user_id=? AND log_date=CURDATE()`,
      [userId]
    );
  }

  static async resetWeekly(userId) {
    await db.query(
      `DELETE FROM step_logs
       WHERE user_id=?
       AND YEARWEEK(log_date,1)=YEARWEEK(CURDATE(),1)`,
      [userId]
    );
  }

  static async resetMonthly(userId) {
    await db.query(
      `DELETE FROM step_logs
       WHERE user_id=?
       AND YEAR(log_date)=YEAR(CURDATE())
       AND MONTH(log_date)=MONTH(CURDATE())`,
      [userId]
    );
  }
}

module.exports = StepLog;