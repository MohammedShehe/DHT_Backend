const CalorieLog = require('../models/CalorieLog');
const CalorieGoal = require('../models/CalorieGoal');

class CalorieController {
  static async setGoal(req, res) {
    try {
      const { monthly_target } = req.body;

      if (!monthly_target || monthly_target <= 0) {
        return res.status(400).json({ message: "Invalid monthly calorie target" });
      }

      await CalorieGoal.createOrUpdate(req.user.id, monthly_target);
      res.json({ message: "Calorie goal saved successfully" });
    } catch (err) {
      console.error('Set calorie goal error:', err);
      res.status(500).json({ message: "Failed to set calorie goal" });
    }
  }

  static async getGoal(req, res) {
    try {
      const goal = await CalorieGoal.getByUser(req.user.id);

      if (!goal) {
        return res.status(404).json({ message: "No calorie goal set" });
      }

      const totalThisMonth = await CalorieLog.getMonthlyTotal(req.user.id);
      const remaining = Math.max(goal.monthly_target - totalThisMonth, 0);

      res.json({
        monthly_target: goal.monthly_target,
        calories_logged_this_month: totalThisMonth,
        remaining_calories: remaining,
        completed: totalThisMonth >= goal.monthly_target,
        percentage: Math.min(Math.floor((totalThisMonth / goal.monthly_target) * 100), 100)
      });
    } catch (err) {
      console.error('Get calorie goal error:', err);
      res.status(500).json({ message: "Failed to fetch calorie progress" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      await CalorieGoal.delete(req.user.id);
      res.json({ message: "Calorie goal deleted successfully" });
    } catch (err) {
      console.error('Delete calorie goal error:', err);
      res.status(500).json({ message: "Failed to delete calorie goal" });
    }
  }

  static async logCalories(req, res) {
    try {
      const { calories } = req.body;

      if (!calories || calories <= 0) {
        return res.status(400).json({ message: "Invalid calorie amount" });
      }

      await CalorieLog.logCalories(req.user.id, calories);

      const goal = await CalorieGoal.getByUser(req.user.id);
      const totalThisMonth = await CalorieLog.getMonthlyTotal(req.user.id);

      let remaining = null;
      let completed = false;
      let percentage = null;

      if (goal) {
        remaining = Math.max(goal.monthly_target - totalThisMonth, 0);
        completed = totalThisMonth >= goal.monthly_target;
        percentage = Math.min(Math.floor((totalThisMonth / goal.monthly_target) * 100), 100);
      }

      res.json({
        message: "Calories logged successfully",
        calories_logged_this_month: totalThisMonth,
        remaining_calories: remaining,
        completed,
        percentage
      });
    } catch (err) {
      console.error('Log calories error:', err);
      res.status(500).json({ message: "Failed to log calories" });
    }
  }

  static async getLogs(req, res) {
    try {
      const { limit, offset } = req.pagination;
      const logs = await CalorieLog.getLogs(req.user.id, limit, offset);
      res.json(logs);
    } catch (err) {
      console.error('Get calorie logs error:', err);
      res.status(500).json({ message: "Failed to fetch calorie logs" });
    }
  }

  static async updateLog(req, res) {
    try {
      const { calories } = req.body;
      const { logId } = req.params;

      if (!calories || calories <= 0) {
        return res.status(400).json({ message: "Invalid calorie amount" });
      }

      await CalorieLog.updateLog(req.user.id, logId, calories);
      res.json({ message: "Calorie log updated successfully" });
    } catch (err) {
      console.error('Update calorie log error:', err);
      res.status(500).json({ message: "Failed to update calorie log" });
    }
  }

  static async deleteCalorieLog(req, res) {
    try {
      const { logId } = req.params;
      await CalorieLog.deleteLog(req.user.id, logId);
      res.json({ message: "Calorie log deleted successfully" });
    } catch (err) {
      console.error('Delete calorie log error:', err);
      res.status(500).json({ message: "Failed to delete calorie log" });
    }
  }

  static async resetDaily(req, res) {
    try {
      await CalorieLog.resetDaily(req.user.id);
      res.json({ message: "Today's calories reset successfully" });
    } catch (err) {
      console.error('Reset daily calories error:', err);
      res.status(500).json({ message: "Failed to reset daily calories" });
    }
  }
}

module.exports = CalorieController;