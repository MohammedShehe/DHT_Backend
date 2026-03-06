// services/notificationScheduler.js
const cron = require('node-cron');
const db = require('../config/db');
const { messaging } = require('../config/fcm');
const NotificationPreference = require('../models/NotificationPreference');
const NotificationQueue = require('../models/NotificationQueue');
const FCMToken = require('../models/FCMToken');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
    // Set timezone for Tanzania (East Africa Time)
    process.env.TZ = 'Africa/Dar_es_Salaam';
  }

  // Start the scheduler
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('📱 Notification scheduler started');

    // Queue notifications every minute
    cron.schedule('* * * * *', () => this.queueNotifications());

    // Send pending notifications every 30 seconds
    cron.schedule('*/30 * * * * *', () => this.sendNotifications());

    // Clean up old notifications daily at 3 AM
    cron.schedule('0 3 * * *', () => this.cleanup());
  }

  // Queue notifications for the current time
  async queueNotifications() {
    try {
      const preferences = await NotificationPreference.getEnabledForCurrentTime();
      if (preferences.length === 0) return;

      console.log(`📝 Queuing ${preferences.length} notifications`);

      for (const pref of preferences) {
        const tokens = await FCMToken.getUserTokens(pref.user_id);
        if (tokens.length === 0) continue;

        await NotificationQueue.addToQueue(pref.user_id, pref, tokens);
      }
    } catch (err) {
      console.error('Error queueing notifications:', err);
    }
  }

  // Send pending notifications
  async sendNotifications() {
    try {
      const pending = await NotificationQueue.getPendingToSend(50);
      if (pending.length === 0) return;

      console.log(`📱 Sending ${pending.length} notifications`);

      for (const notification of pending) {
        try {
          // Ensure ALL data values are strings - FCM requirement
          const payload = {
            notification: {
              title: String(notification.title || ''),
              body: String(notification.message || '')
            },
            data: {
              click_action: 'FLUTTER_NOTIFICATION_CLICK',
              action_type: String(notification.action_type || 'no_action'),
              action_data: notification.action_data ? String(notification.action_data) : '{}',
              preference_id: String(notification.preference_id || ''),
              screen: String(this.getScreenFromAction(notification.action_type) || 'notifications'),
              scheduled_for: notification.scheduled_for ? new Date(notification.scheduled_for).toISOString() : new Date().toISOString(),
              sent_at: new Date().toISOString(),
              notification_id: String(notification.id || '')
            },
            token: String(notification.fcm_token),
            android: {
              priority: 'high',
              notification: {
                channelId: 'health_tracker_channel',
                icon: 'ic_notification',
                color: '#2563eb',
                sound: 'default',
                clickAction: 'FLUTTER_NOTIFICATION_CLICK'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1
                }
              },
              headers: {
                'apns-priority': '10'
              }
            }
          };

          const response = await messaging.send(payload);
          await NotificationQueue.markAsSent(notification.id);
        } catch (err) {
          console.error(`❌ Failed to send notification ${notification.id}:`, err.message);
          
          await NotificationQueue.markAsFailed(notification.id, err.message);

          // Remove invalid tokens
          if (err.code === 'messaging/invalid-registration-token' ||
              err.code === 'messaging/registration-token-not-registered') {
            await db.query(`DELETE FROM fcm_tokens WHERE fcm_token=?`, [notification.fcm_token]);
          }
        }
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
    }
  }

  // Clean up old notifications
  async cleanup() {
    try {
      await NotificationQueue.cleanup(7);
      console.log('🧹 Cleaned up old notifications');
    } catch (err) {
      console.error('Error cleaning up notifications:', err);
    }
  }

  // Helper: Get screen from action type
  getScreenFromAction(actionType) {
    const screens = {
      'open_activity': 'activity_logging',
      'log_water': 'hydration_logging',
      'log_meal': 'meal_logging',
      'take_medication': 'medication',
      'meditate': 'meditation',
      'no_action': 'notifications'
    };

    return screens[actionType] || 'notifications';
  }
}

module.exports = new NotificationScheduler();