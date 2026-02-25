const db = require('../config/db');

class WaterLog {
  static async logWater(userId, glasses) {
    const today = new Date().toISOString().split('T')[0];

    await db.query(
      `INSERT INTO water_logs (user_id, glasses, log_date)
       VALUES (?, ?, ?)`,
      [userId, glasses, today]
    );
  }

  static async getTodayTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(glasses), 0) as total
       FROM water_logs
       WHERE user_id=? AND log_date=CURDATE()`,
      [userId]
    );

    return rows[0].total;
  }

  static async getWeeklyTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(glasses), 0) as total
       FROM water_logs
       WHERE user_id=?
       AND YEARWEEK(log_date, 1) = YEARWEEK(CURDATE(), 1)`,
      [userId]
    );

    return rows[0].total;
  }

  static async getMonthlyTotal(userId) {
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(glasses), 0) as total
       FROM water_logs
       WHERE user_id=?
       AND YEAR(log_date)=YEAR(CURDATE())
       AND MONTH(log_date)=MONTH(CURDATE())`,
      [userId]
    );

    return rows[0].total;
  }

  static async getLogs(userId, limit, offset) {
    const [rows] = await db.query(
      `SELECT id, glasses, log_date, created_at
       FROM water_logs
       WHERE user_id=?
       ORDER BY log_date DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows;
  }

  static async updateLog(userId, logId, glasses) {
    await db.query(
      `UPDATE water_logs
       SET glasses=?
       WHERE id=? AND user_id=?`,
      [glasses, logId, userId]
    );
  }

  static async deleteLog(userId, logId) {
    await db.query(
      `DELETE FROM water_logs
       WHERE id=? AND user_id=?`,
      [logId, userId]
    );
  }

  static async resetDaily(userId) {
    await db.query(
      `DELETE FROM water_logs
       WHERE user_id=? AND log_date=CURDATE()`,
      [userId]
    );
  }
}

module.exports = WaterLog;