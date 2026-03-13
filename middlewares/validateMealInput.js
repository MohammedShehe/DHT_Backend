// middlewares/validateMealInput.js
const validateMealInput = (req, res, next) => {
  const { meal_type, meal_time, items } = req.body;

  if (!meal_type) {
    return res.status(400).json({ message: 'Meal type is required' });
  }

  const validMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Brunch'];
  if (!validMealTypes.includes(meal_type)) {
    return res.status(400).json({ 
      message: `Invalid meal type. Allowed: ${validMealTypes.join(', ')}` 
    });
  }

  if (!meal_time) {
    return res.status(400).json({ message: 'Meal time is required' });
  }

  // Validate meal_time format (ISO datetime)
  if (isNaN(new Date(meal_time).getTime())) {
    return res.status(400).json({ message: 'Invalid meal time format' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'At least one food item is required' });
  }

  // Validate each item
  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) {
      return res.status(400).json({ message: 'Each item must have a positive quantity' });
    }

    if (!item.serving_unit) {
      return res.status(400).json({ message: 'Each item must have a serving unit' });
    }

    // Either food_item_id or custom food details must be provided
    if (!item.food_item_id && !item.custom_food_name) {
      return res.status(400).json({ 
        message: 'Each item must have either a food_item_id or custom food details' 
      });
    }

    // If custom food, validate nutritional values
    if (item.custom_food_name) {
      if (item.custom_calories === undefined || item.custom_calories < 0) {
        return res.status(400).json({ message: 'Custom food must have valid calories' });
      }
    }
  }

  next();
};

module.exports = validateMealInput;