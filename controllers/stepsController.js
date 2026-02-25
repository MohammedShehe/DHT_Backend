const StepLog = require('../models/StepLog');
const StepGoal = require('../models/StepGoal');

class StepsController {
  static async setGoal(req, res) {
    try {
      const { daily_target } = req.body;

      if (!daily_target || daily_target <= 0) {
        return res.status(400).json({ message: "Invalid step target" });
      }

      await StepGoal.createOrUpdate(req.user.id, daily_target);
      res.json({ message: "Steps goal saved successfully" });
    } catch (err) {
      console.error('Set step goal error:', err);
      res.status(500).json({ message: "Failed to set goal" });
    }
  }

  static async getGoal(req, res) {
    try {
      const goal = await StepGoal.getByUser(req.user.id);

      if (!goal) {
        return res.status(404).json({ message: "No goal set" });
      }

      const totalToday = await StepLog.getTodayTotal(req.user.id);
      const remaining = Math.max(goal.daily_target - totalToday, 0);

      res.json({
        daily_target: goal.daily_target,
        walked_today: totalToday,
        remaining_steps: remaining,
        completed: totalToday >= goal.daily_target,
        percentage: Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100)
      });
    } catch (err) {
      console.error('Get step goal error:', err);
      res.status(500).json({ message: "Failed to fetch goal" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      await StepGoal.delete(req.user.id);
      res.json({ message: "Goal deleted successfully" });
    } catch (err) {
      console.error('Delete step goal error:', err);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  }

  static async logSteps(req, res) {
    try {
      const { steps } = req.body;

      if (!steps || steps <= 0) {
        return res.status(400).json({ message: "Invalid steps" });
      }

      await StepLog.logSteps(req.user.id, steps);

      const goal = await StepGoal.getByUser(req.user.id);
      const totalToday = await StepLog.getTodayTotal(req.user.id);

      let remaining = null;
      let completed = false;
      let percentage = null;

      if (goal) {
        remaining = Math.max(goal.daily_target - totalToday, 0);
        completed = totalToday >= goal.daily_target;
        percentage = Math.min(Math.floor((totalToday / goal.daily_target) * 100), 100);
      }

      res.json({
        message: "Steps logged successfully",
        walked_today: totalToday,
        remaining_steps: remaining,
        completed,
        percentage
      });
    } catch (err) {
      console.error('Log steps error:', err);
      res.status(500).json({ message: "Failed to log steps" });
    }
  }

  static async getLogs(req, res) {
    try {
      const { limit, offset } = req.pagination;
      const logs = await StepLog.getLogs(req.user.id, limit, offset);
      res.json(logs);
    } catch (err) {
      console.error('Get step logs error:', err);
      res.status(500).json({ message: "Failed to fetch step logs" });
    }
  }

  static async updateLog(req, res) {
    try {
      const { steps } = req.body;
      const { logId } = req.params;

      if (!steps || steps <= 0) {
        return res.status(400).json({ message: "Invalid steps value" });
      }

      await StepLog.updateLog(req.user.id, logId, steps);
      res.json({ message: "Step log updated successfully" });
    } catch (err) {
      console.error('Update step log error:', err);
      res.status(500).json({ message: "Failed to update step log" });
    }
  }

  static async deleteStepLog(req, res) {
    try {
      const { logId } = req.params;
      await StepLog.deleteLog(req.user.id, logId);
      res.json({ message: "Step log deleted successfully" });
    } catch (err) {
      console.error('Delete step log error:', err);
      res.status(500).json({ message: "Failed to delete step log" });
    }
  }

  static async resetDaily(req, res) {
    try {
      await StepLog.resetDaily(req.user.id);
      res.json({ message: "Today's steps reset successfully" });
    } catch (err) {
      console.error('Reset daily steps error:', err);
      res.status(500).json({ message: "Failed to reset daily steps" });
    }
  }
}

module.exports = StepsController;