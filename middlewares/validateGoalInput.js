const allowedTypes = [
  'steps',
  'water',
  'sleep',
  'workout',
  'calories',
  'meditation'
];

const allowedPeriods = ['daily', 'weekly', 'monthly'];

const validateGoalInput = (req, res, next) => {
  const {
    type,
    targetValue,
    period
  } = req.body;

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ message: "Valid type required" });
  }

  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ 
      message: `Invalid goal type. Allowed: ${allowedTypes.join(', ')}` 
    });
  }

  if (targetValue === undefined || typeof targetValue !== 'number' || targetValue <= 0) {
    return res.status(400).json({
      message: "targetValue must be a positive number"
    });
  }

  if (!period || !allowedPeriods.includes(period)) {
    return res.status(400).json({ 
      message: `Invalid period. Allowed: ${allowedPeriods.join(', ')}` 
    });
  }

  next();
};

module.exports = validateGoalInput;