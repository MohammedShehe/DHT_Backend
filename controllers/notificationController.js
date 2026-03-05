// controllers/notificationController.js
const NotificationPreference = require('../models/NotificationPreference');
const FCMToken = require('../models/FCMToken');
const NotificationQueue = require('../models/NotificationQueue');
const { messaging } = require('../config/fcm');

class NotificationController {
  // Get all notification preferences
  static async getPreferences(req, res) {
    try {
      const preferences = await NotificationPreference.getAllByUser(req.user.id);
      res.json(preferences);
    } catch (err) {
      console.error('Get notification preferences error:', err);
      res.status(500).json({ message: 'Failed to fetch notification preferences' });
    }
  }

  // Create or update notification preference
  static async savePreference(req, res) {
    try {
      const data = req.body;

      // Validate required fields
      const requiredFields = ['title', 'message', 'time', 'repeat_days'];
      for (const field of requiredFields) {
        if (!data[field]) {
          return res.status(400).json({ message: `${field} is required` });
        }
      }

      const preference = await NotificationPreference.createOrUpdate(req.user.id, data);

      // Cancel pending notifications for this preference if it was updated
      if (data.id) {
        await NotificationQueue.cancelForPreference(data.id);
      }

      res.json({
        message: data.id ? 'Notification updated successfully' : 'Notification created successfully',
        preference
      });
    } catch (err) {
      console.error('Save notification preference error:', err);
      res.status(500).json({ message: err.message || 'Failed to save notification preference' });
    }
  }

  // Toggle notification enabled/disabled
  static async togglePreference(req, res) {
    try {
      const { id } = req.params;
      const { is_enabled } = req.body;

      if (is_enabled === undefined) {
        return res.status(400).json({ message: 'is_enabled field required' });
      }

      const result = await NotificationPreference.toggle(req.user.id, id, is_enabled);

      // Cancel pending notifications if disabled
      if (!is_enabled) {
        await NotificationQueue.cancelForPreference(id);
      }

      res.json({
        message: `Notification ${is_enabled ? 'enabled' : 'disabled'} successfully`,
        ...result
      });
    } catch (err) {
      console.error('Toggle notification error:', err);
      res.status(500).json({ message: 'Failed to toggle notification' });
    }
  }

  // Delete notification preference
  static async deletePreference(req, res) {
    try {
      const { id } = req.params;

      const result = await NotificationPreference.delete(req.user.id, id);

      // Cancel pending notifications
      await NotificationQueue.cancelForPreference(id);

      res.json(result);
    } catch (err) {
      console.error('Delete notification error:', err);
      res.status(500).json({ message: err.message || 'Failed to delete notification' });
    }
  }

  // Reset to default notifications
  static async resetToDefaults(req, res) {
    try {
      const result = await NotificationPreference.resetToDefaults(req.user.id);
      res.json(result);
    } catch (err) {
      console.error('Reset notifications error:', err);
      res.status(500).json({ message: 'Failed to reset notifications' });
    }
  }

  // Register FCM token
  static async registerToken(req, res) {
    try {
      const { fcm_token, device_type, device_name } = req.body;

      if (!fcm_token) {
        return res.status(400).json({ message: 'FCM token required' });
      }

      const result = await FCMToken.register(req.user.id, fcm_token, {
        device_type,
        device_name
      });

      res.json(result);
    } catch (err) {
      console.error('Register FCM token error:', err);
      res.status(500).json({ message: 'Failed to register FCM token' });
    }
  }

  // Remove FCM token
  static async removeToken(req, res) {
    try {
      const { fcm_token } = req.body;

      if (!fcm_token) {
        return res.status(400).json({ message: 'FCM token required' });
      }

      const result = await FCMToken.remove(req.user.id, fcm_token);
      res.json(result);
    } catch (err) {
      console.error('Remove FCM token error:', err);
      res.status(500).json({ message: 'Failed to remove FCM token' });
    }
  }

  // Get user's FCM tokens
  static async getTokens(req, res) {
    try {
      const tokens = await FCMToken.getUserTokens(req.user.id);
      res.json(tokens);
    } catch (err) {
      console.error('Get FCM tokens error:', err);
      res.status(500).json({ message: 'Failed to fetch FCM tokens' });
    }
  }

  // Get notification history
  static async getHistory(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.pagination || {};
      const history = await NotificationQueue.getUserHistory(req.user.id, limit, offset);
      res.json(history);
    } catch (err) {
      console.error('Get notification history error:', err);
      res.status(500).json({ message: 'Failed to fetch notification history' });
    }
  }

  // Test send notification (for debugging)
  static async testSend(req, res) {
    try {
      const { fcm_token, title, message } = req.body;

      if (!fcm_token || !title || !message) {
        return res.status(400).json({ message: 'fcm_token, title, and message required' });
      }

      const payload = {
        notification: {
          title,
          body: message
        },
        data: {
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          screen: 'notifications'
        },
        token: fcm_token,
        android: {
          notification: {
            sound: 'default',
            channelId: 'health_tracker_channel',
            color: '#2563eb'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default'
            }
          }
        }
      };

      const response = await messaging.send(payload);
      
      res.json({
        message: 'Test notification sent',
        response
      });
    } catch (err) {
      console.error('Test send error:', err);
      res.status(500).json({ message: err.message || 'Failed to send test notification' });
    }
  }
}

module.exports = NotificationController;