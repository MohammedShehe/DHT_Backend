// models/NotificationQueue.js
const db = require('../config/db');

class NotificationQueue {
  // Add notifications to queue for a user
  static async addToQueue(userId, preference, fcmTokens) {
    const scheduledFor = this.getScheduledDateTime(preference.time);
    const values = [];

    for (const token of fcmTokens) {
      values.push([
        userId,
        preference.id,
        token.fcm_token,
        preference.title,
        preference.message,
        preference.action_type,
        preference.action_data,
        scheduledFor
      ]);
    }

    if (values.length > 0) {
      const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      const flatValues = values.flat();

      await db.query(
        `INSERT INTO notification_queue 
          (user_id, preference_id, fcm_token, title, message, action_type, action_data, scheduled_for)
         VALUES ${placeholders}`,
        flatValues
      );
    }

    return { queued: values.length };
  }

  // Get pending notifications to send
  static async getPendingToSend(limit = 100) {
    const [rows] = await db.query(
      `SELECT * FROM notification_queue 
       WHERE status = 'pending' 
       AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT ?`,
      [limit]
    );

    return rows;
  }

  // Mark notification as sent
  static async markAsSent(id) {
    await db.query(
      `UPDATE notification_queue 
       SET status='sent', sent_at=NOW() 
       WHERE id=?`,
      [id]
    );
  }

  // Mark notification as failed
  static async markAsFailed(id, errorMessage) {
    await db.query(
      `UPDATE notification_queue 
       SET status='failed', error_message=?, retry_count=retry_count+1 
       WHERE id=?`,
      [errorMessage, id]
    );
  }

  // Cancel pending notifications for a preference
  static async cancelForPreference(preferenceId) {
    await db.query(
      `UPDATE notification_queue 
       SET status='cancelled' 
       WHERE preference_id=? AND status='pending'`,
      [preferenceId]
    );
  }

  // Clean up old notifications
  static async cleanup(daysToKeep = 7) {
    await db.query(
      `DELETE FROM notification_queue 
       WHERE status IN ('sent', 'failed', 'cancelled') 
       AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [daysToKeep]
    );
  }

  // Helper: Get scheduled datetime from time string
  static getScheduledDateTime(timeStr) {
    const now = new Date();
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    
    const scheduled = new Date(now);
    scheduled.setHours(hours, minutes, seconds || 0, 0);

    // If time has passed today, schedule for tomorrow
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled;
  }

  // Get user's notification history
  static async getUserHistory(userId, limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT nq.*, np.title as pref_title, np.notification_type
       FROM notification_queue nq
       LEFT JOIN notification_preferences np ON nq.preference_id = np.id
       WHERE nq.user_id=?
       ORDER BY nq.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows;
  }
}

module.exports = NotificationQueue;