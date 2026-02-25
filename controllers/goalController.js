const Goal = require('../models/Goal');

class GoalController {
  static async createGoal(req, res) {
    try {
      const { type, targetValue, period } = req.body;

      await Goal.createGoal(req.user.id, type, targetValue, period);

      res.json({ 
        message: "Goal created successfully",
        goal: { type, targetValue, period }
      });
    } catch (err) {
      console.error('Create goal error:', err);
      res.status(500).json({ message: "Failed to create goal" });
    }
  }

  static async getGoals(req, res) {
    try {
      const goals = await Goal.getUserGoals(req.user.id);
      res.json(goals);
    } catch (err) {
      console.error('Get goals error:', err);
      res.status(500).json({ message: "Failed to fetch goals" });
    }
  }

  static async deleteGoal(req, res) {
    try {
      const { id } = req.params;
      await Goal.deleteGoal(req.user.id, id);
      res.json({ message: "Goal deleted successfully" });
    } catch (err) {
      console.error('Delete goal error:', err);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  }

  static async getGoalProgress(req, res) {
    try {
      const { id } = req.params;
      const goal = await Goal.getGoalById(req.user.id, id);

      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const current = await Goal.calculateProgress(req.user.id, goal);
      const percentage = Math.min(Math.floor((current / goal.target_value) * 100), 100);

      res.json({
        id: goal.id,
        type: goal.type,
        target: goal.target_value,
        period: goal.period,
        current,
        percentage,
        completed: current >= goal.target_value
      });
    } catch (err) {
      console.error('Get goal progress error:', err);
      res.status(500).json({ message: "Failed to fetch goal progress" });
    }
  }
}

module.exports = GoalController;