const WaterLog = require('../models/WaterLog');
const WaterGoal = require('../models/WaterGoal');

class WaterController {
  static async setGoal(req, res) {
    try {
      const { daily_target } = req.body;

      if (!daily_target || daily_target <= 0) {
        return res.status(400).json({ message: "Invalid water target" });
      }

      await WaterGoal.createOrUpdate(req.user.id, daily_target);
      res.json({ message: "Water goal saved successfully" });
    } catch (err) {
      console.error('Set water goal error:', err);
      res.status(500).json({ message: "Failed to set water goal" });
    }
  }

  static async getGoal(req, res) {
    try {
      const goal = await WaterGoal.getByUser(req.user.id);

      if (!goal) {
        return res.status(404).json({ message: "No water goal set" });
      }

      const totalToday = await WaterLog.getTodayTotal(req.user.id);
      const remaining = Math.max(goal.daily_target - totalToday, 0);

      res.json({
        daily_target: goal.daily_target,
        glasses_taken_today: totalToday,
        remaining_glasses: remaining,
        completed: totalToday >= goal.daily_target,
        percentage: Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100)
      });
    } catch (err) {
      console.error('Get water goal error:', err);
      res.status(500).json({ message: "Failed to fetch water progress" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      await WaterGoal.delete(req.user.id);
      res.json({ message: "Water goal deleted successfully" });
    } catch (err) {
      console.error('Delete water goal error:', err);
      res.status(500).json({ message: "Failed to delete water goal" });
    }
  }

  static async logWater(req, res) {
    try {
      const { glasses } = req.body;

      if (!glasses || glasses <= 0) {
        return res.status(400).json({ message: "Invalid glasses amount" });
      }

      await WaterLog.logWater(req.user.id, glasses);

      const goal = await WaterGoal.getByUser(req.user.id);
      const totalToday = await WaterLog.getTodayTotal(req.user.id);

      let remaining = null;
      let completed = false;
      let percentage = null;

      if (goal) {
        remaining = Math.max(goal.daily_target - totalToday, 0);
        completed = totalToday >= goal.daily_target;
        percentage = Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100);
      }

      res.json({
        message: "Water intake logged successfully",
        glasses_taken_today: totalToday,
        remaining_glasses: remaining,
        completed,
        percentage
      });
    } catch (err) {
      console.error('Log water error:', err);
      res.status(500).json({ message: "Failed to log water intake" });
    }
  }

  static async getLogs(req, res) {
    try {
      const { limit, offset } = req.pagination;
      const logs = await WaterLog.getLogs(req.user.id, limit, offset);
      res.json(logs);
    } catch (err) {
      console.error('Get water logs error:', err);
      res.status(500).json({ message: "Failed to fetch water logs" });
    }
  }

  static async updateLog(req, res) {
    try {
      const { glasses } = req.body;
      const { logId } = req.params;

      if (!glasses || glasses <= 0) {
        return res.status(400).json({ message: "Invalid glasses amount" });
      }

      await WaterLog.updateLog(req.user.id, logId, glasses);
      res.json({ message: "Water log updated successfully" });
    } catch (err) {
      console.error('Update water log error:', err);
      res.status(500).json({ message: "Failed to update water log" });
    }
  }

  static async deleteWaterLog(req, res) {
    try {
      const { logId } = req.params;
      await WaterLog.deleteLog(req.user.id, logId);
      res.json({ message: "Water log deleted successfully" });
    } catch (err) {
      console.error('Delete water log error:', err);
      res.status(500).json({ message: "Failed to delete water log" });
    }
  }

  static async resetDaily(req, res) {
    try {
      await WaterLog.resetDaily(req.user.id);
      res.json({ message: "Today's water intake reset successfully" });
    } catch (err) {
      console.error('Reset daily water error:', err);
      res.status(500).json({ message: "Failed to reset daily water" });
    }
  }
}

module.exports = WaterController;