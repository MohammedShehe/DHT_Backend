const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validateGoalInput = require('../middlewares/validateGoalInput');
const { goalLimiter } = require('../middlewares/rateLimiter');
const GoalController = require('../controllers/goalController');

// Create goal (unified)
router.post('/', auth, goalLimiter, validateGoalInput, GoalController.createGoal);

// Get all goals with progress
router.get('/', auth, GoalController.getGoals);

// Get specific goal progress
router.get('/:id/progress', auth, GoalController.getGoalProgress);

// Delete goal
router.delete('/:id', auth, GoalController.deleteGoal);

module.exports = router;