// models/NotificationPreference.js
const db = require('../config/db');

class NotificationPreference {

  // Create or update a notification preference
  static async createOrUpdate(userId, data) {
    const {
      id,
      notification_type = 'custom',
      title,
      message,
      time,
      repeat_days = 'all',
      action_type,
      action_data = null,
      is_predefined = 0
    } = data;

    if (!title || !message || !time) {
      throw new Error('Title, message and time are required');
    }

    // Validate time format
    if (!this.isValidTime(time)) {
      throw new Error('Invalid time format. Use HH:MM or HH:MM:SS');
    }

    // Validate repeat days
    if (!this.isValidRepeatDays(repeat_days)) {
      throw new Error('Invalid repeat days format');
    }

    const parsedActionData = action_data ? JSON.stringify(action_data) : null;

    if (id) {

      // Check existing
      const [existing] = await db.query(
        `SELECT id FROM notification_preferences WHERE id=? AND user_id=?`,
        [id, userId]
      );

      if (existing.length === 0) {
        throw new Error('Notification preference not found');
      }

      await db.query(
        `UPDATE notification_preferences SET
          title=?, message=?, time=?, repeat_days=?, 
          action_type=?, action_data=?
         WHERE id=? AND user_id=?`,
        [
          title,
          message,
          time,
          repeat_days,
          action_type,
          parsedActionData,
          id,
          userId
        ]
      );

      return { id, ...data };

    } else {

      const [result] = await db.query(
        `INSERT INTO notification_preferences 
          (user_id, notification_type, title, message, time, repeat_days, action_type, action_data, is_predefined)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          notification_type,
          title,
          message,
          time,
          repeat_days,
          action_type,
          parsedActionData,
          is_predefined
        ]
      );

      return { id: result.insertId, ...data };
    }
  }


  // Get all notification preferences for a user
  static async getAllByUser(userId) {

    const [rows] = await db.query(
      `SELECT * FROM notification_preferences 
       WHERE user_id=? 
       ORDER BY time ASC`,
      [userId]
    );

    return rows.map(this.parseActionData);
  }


  // Get a single notification preference
  static async getById(userId, preferenceId) {

    const [rows] = await db.query(
      `SELECT * FROM notification_preferences WHERE id=? AND user_id=?`,
      [preferenceId, userId]
    );

    if (!rows.length) return null;

    return this.parseActionData(rows[0]);
  }


  // Toggle notification enabled/disabled
  static async toggle(userId, preferenceId, isEnabled) {

    await db.query(
      `UPDATE notification_preferences 
       SET is_enabled=? 
       WHERE id=? AND user_id=?`,
      [isEnabled ? 1 : 0, preferenceId, userId]
    );

    return {
      id: preferenceId,
      is_enabled: isEnabled
    };
  }


  // Delete notification preference
  static async delete(userId, preferenceId) {

    const [pref] = await db.query(
      `SELECT is_predefined FROM notification_preferences 
       WHERE id=? AND user_id=?`,
      [preferenceId, userId]
    );

    if (!pref.length) {
      throw new Error('Notification preference not found');
    }

    // Predefined notifications cannot be deleted
    if (pref[0].is_predefined) {

      await db.query(
        `UPDATE notification_preferences 
         SET is_enabled=0 
         WHERE id=? AND user_id=?`,
        [preferenceId, userId]
      );

      return {
        id: preferenceId,
        is_enabled: false,
        message: 'Predefined notification disabled'
      };
    }

    await db.query(
      `DELETE FROM notification_preferences 
       WHERE id=? AND user_id=?`,
      [preferenceId, userId]
    );

    return {
      id: preferenceId,
      deleted: true
    };
  }


  // Get all enabled notifications for the current time
  static async getEnabledForCurrentTime() {

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const currentDay = this.getCurrentDay();

    const [rows] = await db.query(
      `SELECT np.*, u.email, u.full_name
       FROM notification_preferences np
       JOIN users u ON np.user_id = u.id
       WHERE np.is_enabled = 1
       AND TIME_FORMAT(np.time,'%H:%i') = ?
       AND (
         np.repeat_days = 'all'
         OR np.repeat_days LIKE ?
         OR (np.repeat_days='weekdays' AND ? IN ('mon','tue','wed','thu','fri'))
         OR (np.repeat_days='weekends' AND ? IN ('sat','sun'))
       )`,
      [
        currentTime,
        `%${currentDay}%`,
        currentDay,
        currentDay
      ]
    );

    return rows.map(this.parseActionData);
  }


  // Reset to default predefined notifications
  static async resetToDefaults(userId) {

    await db.query(
      `DELETE FROM notification_preferences 
       WHERE user_id=? AND is_predefined=0`,
      [userId]
    );

    await db.query(
      `UPDATE notification_preferences SET 
        is_enabled=1,
        title=CASE notification_type
          WHEN 'morning_workout' THEN 'Morning Workout'
          WHEN 'drink_water' THEN 'Drink Water'
          WHEN 'lunch_time' THEN 'Lunch Time'
          WHEN 'evening_meditation' THEN 'Evening Meditation'
        END,
        message=CASE notification_type
          WHEN 'morning_workout' THEN 'Time for your daily exercise'
          WHEN 'drink_water' THEN 'Stay Hydrated!'
          WHEN 'lunch_time' THEN 'Time to Log your meal'
          WHEN 'evening_meditation' THEN '10 minutes of mindfulness'
        END,
        time=CASE notification_type
          WHEN 'morning_workout' THEN '07:00:00'
          WHEN 'drink_water' THEN '10:30:00'
          WHEN 'lunch_time' THEN '12:00:00'
          WHEN 'evening_meditation' THEN '20:00:00'
        END,
        repeat_days=CASE notification_type
          WHEN 'morning_workout' THEN 'weekdays'
          WHEN 'drink_water' THEN 'all'
          WHEN 'lunch_time' THEN 'weekdays'
          WHEN 'evening_meditation' THEN 'all'
        END,
        action_type=CASE notification_type
          WHEN 'morning_workout' THEN 'open_activity'
          WHEN 'drink_water' THEN 'log_water'
          WHEN 'lunch_time' THEN 'log_meal'
          WHEN 'evening_meditation' THEN 'meditate'
        END
       WHERE user_id=? AND is_predefined=1`,
      [userId]
    );

    return {
      message: 'Notifications reset to defaults'
    };
  }


  // Parse JSON action_data safely
  static parseActionData(row) {

    if (!row) return row;

    try {
      if (row.action_data) {
        row.action_data = JSON.parse(row.action_data);
      }
    } catch (e) {
      row.action_data = null;
    }

    return row;
  }


  // Validate time format
  static isValidTime(time) {

    const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;

    return regex.test(time);
  }


  // Validate repeat days
  static isValidRepeatDays(days) {

    const validDays = ['all', 'weekdays', 'weekends'];

    if (validDays.includes(days)) return true;

    const validDayValues = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    const dayList = days.split(',');

    return dayList.every(day =>
      validDayValues.includes(day.trim())
    );
  }


  // Get current day abbreviation
  static getCurrentDay() {

    const days = ['sun','mon','tue','wed','thu','fri','sat'];

    return days[new Date().getDay()];
  }

}

module.exports = NotificationPreference;