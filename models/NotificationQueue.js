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
        preference.action_data ? JSON.stringify(preference.action_data) : null,
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
      
      console.log(`✅ Added ${values.length} notifications to queue`);
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
    scheduled.setSeconds(0, 0);
    scheduled.setMilliseconds(0);

    // Add a 30-second buffer to handle same-minute scheduling
    const bufferMs = 30 * 1000;
    const timeDiff = scheduled.getTime() - now.getTime();
    
    // If scheduled time is in the future (more than buffer), use it as is
    if (timeDiff > bufferMs) {
      return scheduled;
    }
    
    // If scheduled time is within the buffer (including slightly in the past),
    // set it for the next minute to ensure it gets processed
    if (timeDiff <= bufferMs && timeDiff > -bufferMs) {
      scheduled.setMinutes(scheduled.getMinutes() + 1);
      return scheduled;
    }
    
    // If time has passed by more than buffer, schedule for tomorrow
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

  // Utility method to check queue status (useful for debugging)
  static async getQueueStatus(userId = null) {
    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        MIN(scheduled_for) as next_scheduled,
        MAX(created_at) as latest
      FROM notification_queue
    `;
    
    const params = [];
    
    if (userId) {
      query += ` WHERE user_id = ?`;
      params.push(userId);
    }
    
    query += ` GROUP BY status ORDER BY status`;
    
    const [rows] = await db.query(query, params);
    return rows;
  }
}

module.exports = NotificationQueue;