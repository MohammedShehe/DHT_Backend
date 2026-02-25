const SleepLog = require('../models/SleepLog');
const SleepGoal = require('../models/SleepGoal');

class SleepController {
  static async setGoal(req, res) {
    try {
      const { daily_target } = req.body;

      if (!daily_target || daily_target <= 0) {
        return res.status(400).json({ message: "Invalid sleep target" });
      }

      await SleepGoal.createOrUpdate(req.user.id, daily_target);
      res.json({ message: "Sleep goal saved successfully" });
    } catch (err) {
      console.error('Set sleep goal error:', err);
      res.status(500).json({ message: "Failed to set sleep goal" });
    }
  }

  static async getGoal(req, res) {
    try {
      const goal = await SleepGoal.getByUser(req.user.id);

      if (!goal) {
        return res.status(404).json({ message: "No sleep goal set" });
      }

      const totalToday = await SleepLog.getTodayTotal(req.user.id);
      const remaining = Math.max(goal.daily_target - totalToday, 0);

      res.json({
        daily_target: goal.daily_target,
        sleep_logged_today: totalToday,
        remaining_hours: remaining,
        completed: totalToday >= goal.daily_target,
        percentage: Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100)
      });
    } catch (err) {
      console.error('Get sleep goal error:', err);
      res.status(500).json({ message: "Failed to fetch sleep progress" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      await SleepGoal.delete(req.user.id);
      res.json({ message: "Sleep goal deleted successfully" });
    } catch (err) {
      console.error('Delete sleep goal error:', err);
      res.status(500).json({ message: "Failed to delete sleep goal" });
    }
  }

  static async logSleep(req, res) {
    try {
      const { hours } = req.body;

      if (!hours || hours <= 0) {
        return res.status(400).json({ message: "Invalid sleep hours" });
      }

      await SleepLog.logSleep(req.user.id, hours);

      const goal = await SleepGoal.getByUser(req.user.id);
      const totalToday = await SleepLog.getTodayTotal(req.user.id);

      let remaining = null;
      let completed = false;
      let percentage = null;

      if (goal) {
        remaining = Math.max(goal.daily_target - totalToday, 0);
        completed = totalToday >= goal.daily_target;
        percentage = Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100);
      }

      res.json({
        message: "Sleep logged successfully",
        sleep_logged_today: totalToday,
        remaining_hours: remaining,
        completed,
        percentage
      });
    } catch (err) {
      console.error('Log sleep error:', err);
      res.status(500).json({ message: "Failed to log sleep" });
    }
  }

  static async getLogs(req, res) {
    try {
      const { limit, offset } = req.pagination;
      const logs = await SleepLog.getLogs(req.user.id, limit, offset);
      res.json(logs);
    } catch (err) {
      console.error('Get sleep logs error:', err);
      res.status(500).json({ message: "Failed to fetch sleep logs" });
    }
  }

  static async updateLog(req, res) {
    try {
      const { hours } = req.body;
      const { logId } = req.params;

      if (!hours || hours <= 0) {
        return res.status(400).json({ message: "Invalid sleep hours" });
      }

      await SleepLog.updateLog(req.user.id, logId, hours);
      res.json({ message: "Sleep log updated successfully" });
    } catch (err) {
      console.error('Update sleep log error:', err);
      res.status(500).json({ message: "Failed to update sleep log" });
    }
  }

  static async deleteSleepLog(req, res) {
    try {
      const { logId } = req.params;
      await SleepLog.deleteLog(req.user.id, logId);
      res.json({ message: "Sleep log deleted successfully" });
    } catch (err) {
      console.error('Delete sleep log error:', err);
      res.status(500).json({ message: "Failed to delete sleep log" });
    }
  }

  static async resetDaily(req, res) {
    try {
      await SleepLog.resetDaily(req.user.id);
      res.json({ message: "Today's sleep reset successfully" });
    } catch (err) {
      console.error('Reset daily sleep error:', err);
      res.status(500).json({ message: "Failed to reset daily sleep" });
    }
  }
}

module.exports = SleepController;