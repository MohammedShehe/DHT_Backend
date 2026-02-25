const MeditationLog = require('../models/MeditationLog');
const MeditationGoal = require('../models/MeditationGoal');

class MeditationController {
  static async setGoal(req, res) {
    try {
      const { daily_target } = req.body;

      if (!daily_target || daily_target <= 0) {
        return res.status(400).json({ message: "Invalid meditation target" });
      }

      await MeditationGoal.createOrUpdate(req.user.id, daily_target);
      res.json({ message: "Meditation goal saved successfully" });
    } catch (err) {
      console.error('Set meditation goal error:', err);
      res.status(500).json({ message: "Failed to set meditation goal" });
    }
  }

  static async getGoal(req, res) {
    try {
      const goal = await MeditationGoal.getByUser(req.user.id);

      if (!goal) {
        return res.status(404).json({ message: "No meditation goal set" });
      }

      const totalToday = await MeditationLog.getTodayTotal(req.user.id);
      const remaining = Math.max(goal.daily_target - totalToday, 0);

      res.json({
        daily_target: goal.daily_target,
        meditation_minutes_today: totalToday,
        remaining_minutes: remaining,
        completed: totalToday >= goal.daily_target,
        percentage: Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100)
      });
    } catch (err) {
      console.error('Get meditation goal error:', err);
      res.status(500).json({ message: "Failed to fetch meditation progress" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      await MeditationGoal.delete(req.user.id);
      res.json({ message: "Meditation goal deleted successfully" });
    } catch (err) {
      console.error('Delete meditation goal error:', err);
      res.status(500).json({ message: "Failed to delete meditation goal" });
    }
  }

  static async logMeditation(req, res) {
    try {
      const { minutes } = req.body;

      if (!minutes || minutes <= 0) {
        return res.status(400).json({ message: "Invalid meditation minutes" });
      }

      await MeditationLog.logMeditation(req.user.id, minutes);

      const goal = await MeditationGoal.getByUser(req.user.id);
      const totalToday = await MeditationLog.getTodayTotal(req.user.id);

      let remaining = null;
      let completed = false;
      let percentage = null;

      if (goal) {
        remaining = Math.max(goal.daily_target - totalToday, 0);
        completed = totalToday >= goal.daily_target;
        percentage = Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100);
      }

      res.json({
        message: "Meditation logged successfully",
        meditation_minutes_today: totalToday,
        remaining_minutes: remaining,
        completed,
        percentage
      });
    } catch (err) {
      console.error('Log meditation error:', err);
      res.status(500).json({ message: "Failed to log meditation" });
    }
  }

  static async getLogs(req, res) {
    try {
      const { limit, offset } = req.pagination;
      const logs = await MeditationLog.getLogs(req.user.id, limit, offset);
      res.json(logs);
    } catch (err) {
      console.error('Get meditation logs error:', err);
      res.status(500).json({ message: "Failed to fetch meditation logs" });
    }
  }

  static async updateLog(req, res) {
    try {
      const { minutes } = req.body;
      const { logId } = req.params;

      if (!minutes || minutes <= 0) {
        return res.status(400).json({ message: "Invalid meditation minutes" });
      }

      await MeditationLog.updateLog(req.user.id, logId, minutes);
      res.json({ message: "Meditation log updated successfully" });
    } catch (err) {
      console.error('Update meditation log error:', err);
      res.status(500).json({ message: "Failed to update meditation log" });
    }
  }

  static async deleteMeditationLog(req, res) {
    try {
      const { logId } = req.params;
      await MeditationLog.deleteLog(req.user.id, logId);
      res.json({ message: "Meditation log deleted successfully" });
    } catch (err) {
      console.error('Delete meditation log error:', err);
      res.status(500).json({ message: "Failed to delete meditation log" });
    }
  }

  static async resetDaily(req, res) {
    try {
      await MeditationLog.resetDaily(req.user.id);
      res.json({ message: "Today's meditation reset successfully" });
    } catch (err) {
      console.error('Reset daily meditation error:', err);
      res.status(500).json({ message: "Failed to reset daily meditation" });
    }
  }
}

module.exports = MeditationController;