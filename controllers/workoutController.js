const WorkoutLog = require('../models/WorkoutLog');
const WorkoutGoal = require('../models/WorkoutGoal');

class WorkoutController {
  static async setGoal(req, res) {
    try {
      const { weekly_target } = req.body;

      if (!weekly_target || weekly_target <= 0) {
        return res.status(400).json({ message: "Invalid weekly workout target" });
      }

      await WorkoutGoal.createOrUpdate(req.user.id, weekly_target);
      res.json({ message: "Workout goal saved successfully" });
    } catch (err) {
      console.error('Set workout goal error:', err);
      res.status(500).json({ message: "Failed to set workout goal" });
    }
  }

  static async getGoal(req, res) {
    try {
      const goal = await WorkoutGoal.getByUser(req.user.id);

      if (!goal) {
        return res.status(404).json({ message: "No workout goal set" });
      }

      const totalThisWeek = await WorkoutLog.getWeeklyTotal(req.user.id);
      const remaining = Math.max(goal.weekly_target - totalThisWeek, 0);

      res.json({
        weekly_target: goal.weekly_target,
        workouts_completed_this_week: totalThisWeek,
        remaining_workouts: remaining,
        completed: totalThisWeek >= goal.weekly_target,
        percentage: Math.min(Math.floor((totalThisWeek / goal.weekly_target) * 100), 100)
      });
    } catch (err) {
      console.error('Get workout goal error:', err);
      res.status(500).json({ message: "Failed to fetch workout progress" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      await WorkoutGoal.delete(req.user.id);
      res.json({ message: "Workout goal deleted successfully" });
    } catch (err) {
      console.error('Delete workout goal error:', err);
      res.status(500).json({ message: "Failed to delete workout goal" });
    }
  }

  static async logWorkout(req, res) {
    try {
      const { workouts } = req.body;

      if (!workouts || workouts <= 0) {
        return res.status(400).json({ message: "Invalid workout amount" });
      }

      await WorkoutLog.logWorkout(req.user.id, workouts);

      const goal = await WorkoutGoal.getByUser(req.user.id);
      const totalThisWeek = await WorkoutLog.getWeeklyTotal(req.user.id);

      let remaining = null;
      let completed = false;
      let percentage = null;

      if (goal) {
        remaining = Math.max(goal.weekly_target - totalThisWeek, 0);
        completed = totalThisWeek >= goal.weekly_target;
        percentage = Math.min(Math.floor((totalThisWeek / goal.weekly_target) * 100), 100);
      }

      res.json({
        message: "Workout logged successfully",
        workouts_completed_this_week: totalThisWeek,
        remaining_workouts: remaining,
        completed,
        percentage
      });
    } catch (err) {
      console.error('Log workout error:', err);
      res.status(500).json({ message: "Failed to log workout" });
    }
  }

  static async getLogs(req, res) {
    try {
      const { limit, offset } = req.pagination;
      const logs = await WorkoutLog.getLogs(req.user.id, limit, offset);
      res.json(logs);
    } catch (err) {
      console.error('Get workout logs error:', err);
      res.status(500).json({ message: "Failed to fetch workout logs" });
    }
  }

  static async updateLog(req, res) {
    try {
      const { workouts } = req.body;
      const { logId } = req.params;

      if (!workouts || workouts <= 0) {
        return res.status(400).json({ message: "Invalid workout amount" });
      }

      await WorkoutLog.updateLog(req.user.id, logId, workouts);
      res.json({ message: "Workout log updated successfully" });
    } catch (err) {
      console.error('Update workout log error:', err);
      res.status(500).json({ message: "Failed to update workout log" });
    }
  }

  static async deleteWorkoutLog(req, res) {
    try {
      const { logId } = req.params;
      await WorkoutLog.deleteLog(req.user.id, logId);
      res.json({ message: "Workout log deleted successfully" });
    } catch (err) {
      console.error('Delete workout log error:', err);
      res.status(500).json({ message: "Failed to delete workout log" });
    }
  }

  static async resetWeekly(req, res) {
    try {
      await WorkoutLog.resetWeekly(req.user.id);
      res.json({ message: "Weekly workouts reset successfully" });
    } catch (err) {
      console.error('Reset weekly workouts error:', err);
      res.status(500).json({ message: "Failed to reset weekly workouts" });
    }
  }

  static async resetMonthly(req, res) {
    try {
      await WorkoutLog.resetMonthly(req.user.id);
      res.json({ message: "Monthly workouts reset successfully" });
    } catch (err) {
      console.error('Reset monthly workouts error:', err);
      res.status(500).json({ message: "Failed to reset monthly workouts" });
    }
  }
}

module.exports = WorkoutController;