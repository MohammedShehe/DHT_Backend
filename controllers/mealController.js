// controllers/mealController.js
const Meal = require('../models/Meal');
const FoodItem = require('../models/FoodItem');
const FoodCategory = require('../models/FoodCategory');
const UserFavoriteFood = require('../models/UserFavoriteFood');

class MealController {
  // ===== FOOD CATEGORIES =====

  static async getCategories(req, res) {
    try {
      const categories = await FoodCategory.getAll();
      res.json(categories);
    } catch (err) {
      console.error('Get categories error:', err);
      res.status(500).json({ message: 'Failed to fetch food categories' });
    }
  }

  // ===== FOOD ITEMS =====

  static async searchFoods(req, res) {
    try {
      const { q, category_id, limit = 50 } = req.query;
      const userId = req.user.id;

      const foods = await FoodItem.search(q, category_id, userId, limit);
      res.json(foods);
    } catch (err) {
      console.error('Search foods error:', err);
      res.status(500).json({ message: 'Failed to search foods' });
    }
  }

  static async getFoodsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const { limit = 100 } = req.query;

      const foods = await FoodItem.getByCategory(categoryId, limit);
      res.json(foods);
    } catch (err) {
      console.error('Get foods by category error:', err);
      res.status(500).json({ message: 'Failed to fetch foods' });
    }
  }

  static async getPopularFoods(req, res) {
    try {
      const { limit = 20 } = req.query;
      const foods = await FoodItem.getPopularFoods(limit);
      res.json(foods);
    } catch (err) {
      console.error('Get popular foods error:', err);
      res.status(500).json({ message: 'Failed to fetch popular foods' });
    }
  }

  static async getUserCustomFoods(req, res) {
    try {
      const foods = await FoodItem.getUserCustomFoods(req.user.id);
      res.json(foods);
    } catch (err) {
      console.error('Get user custom foods error:', err);
      res.status(500).json({ message: 'Failed to fetch custom foods' });
    }
  }

  static async createCustomFood(req, res) {
    try {
      const {
        name, brand = '', category_id, calories, protein, carbs, fat,
        fiber = null, sugar = null, sodium = null,
        serving_size = null, serving_unit = 'g'
      } = req.body;

      // Validate required fields
      if (!name || !category_id || !calories || !protein || !carbs || !fat) {
        return res.status(400).json({
          message: 'Name, category, calories, protein, carbs, and fat are required'
        });
      }

      if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
        return res.status(400).json({ message: 'Nutritional values cannot be negative' });
      }

      const foodId = await FoodItem.create({
        name, brand, category_id, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit,
        is_custom: true
      }, req.user.id);

      const food = await FoodItem.getById(foodId);

      res.status(201).json({
        message: 'Custom food created successfully',
        food
      });
    } catch (err) {
      console.error('Create custom food error:', err);
      res.status(500).json({ message: 'Failed to create custom food' });
    }
  }

  static async updateCustomFood(req, res) {
    try {
      const { foodId } = req.params;
      const food = await FoodItem.getById(foodId);

      if (!food) {
        return res.status(404).json({ message: 'Food not found' });
      }

      // Check if user owns this custom food
      if (food.created_by !== req.user.id) {
        return res.status(403).json({ message: 'You can only edit your own custom foods' });
      }

      const {
        name, brand, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit
      } = req.body;

      await FoodItem.update(foodId, {
        name, brand, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit
      });

      const updatedFood = await FoodItem.getById(foodId);

      res.json({
        message: 'Food updated successfully',
        food: updatedFood
      });
    } catch (err) {
      console.error('Update custom food error:', err);
      res.status(500).json({ message: 'Failed to update food' });
    }
  }

  static async deleteCustomFood(req, res) {
    try {
      const { foodId } = req.params;
      const food = await FoodItem.getById(foodId);

      if (!food) {
        return res.status(404).json({ message: 'Food not found' });
      }

      // Check if user owns this custom food
      if (food.created_by !== req.user.id) {
        return res.status(403).json({ message: 'You can only delete your own custom foods' });
      }

      await FoodItem.delete(foodId);

      res.json({ message: 'Food deleted successfully' });
    } catch (err) {
      console.error('Delete custom food error:', err);
      res.status(500).json({ message: 'Failed to delete food' });
    }
  }

  // ===== MEALS =====

  static async createMeal(req, res) {
    try {
      const {
        meal_type, meal_time, items, notes = null
      } = req.body;

      if (!meal_type || !meal_time || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: 'Meal type, time, and at least one food item are required'
        });
      }

      // Calculate meal totals
      let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

      // First, get all food items to calculate totals
      for (const item of items) {
        const { food_item_id, quantity, custom_food_name = null } = item;

        let calories = 0, protein = 0, carbs = 0, fat = 0;

        if (custom_food_name) {
          // Custom food entered directly (not from database)
          calories = item.custom_calories || 0;
          protein = item.custom_protein || 0;
          carbs = item.custom_carbs || 0;
          fat = item.custom_fat || 0;
        } else {
          // Food from database
          const food = await FoodItem.getById(food_item_id);
          if (!food) {
            return res.status(400).json({ message: `Food item with ID ${food_item_id} not found` });
          }

          calories = food.calories;
          protein = food.protein;
          carbs = food.carbs;
          fat = food.fat;

          // Track as favorite
          await UserFavoriteFood.addOrUpdate(req.user.id, food_item_id);
        }

        totalCalories += calories * quantity;
        totalProtein += protein * quantity;
        totalCarbs += carbs * quantity;
        totalFat += fat * quantity;
      }

      // Create the meal
      const mealId = await Meal.create(req.user.id, {
        meal_type,
        meal_time,
        notes,
        total_calories: Math.round(totalCalories),
        total_protein: Math.round(totalProtein * 100) / 100,
        total_carbs: Math.round(totalCarbs * 100) / 100,
        total_fat: Math.round(totalFat * 100) / 100
      });

      // Add meal items
      for (const item of items) {
        const { food_item_id, quantity, serving_unit, custom_food_name = null } = item;

        let customCalories = null, customProtein = null, customCarbs = null, customFat = null;

        if (custom_food_name) {
          customCalories = item.custom_calories || 0;
          customProtein = item.custom_protein || 0;
          customCarbs = item.custom_carbs || 0;
          customFat = item.custom_fat || 0;
        }

        await Meal.addMealItem(mealId, {
          food_item_id: food_item_id || null,
          quantity,
          serving_unit,
          custom_food_name,
          custom_calories: customCalories,
          custom_protein: customProtein,
          custom_carbs: customCarbs,
          custom_fat: customFat
        });
      }

      const meal = await Meal.getById(mealId, req.user.id);

      res.status(201).json({
        message: 'Meal logged successfully',
        meal
      });
    } catch (err) {
      console.error('Create meal error:', err);
      res.status(500).json({ message: 'Failed to log meal' });
    }
  }

  static async getMeals(req, res) {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required' });
      }

      const meals = await Meal.getByUserAndDate(req.user.id, date);

      // Calculate daily totals
      const dailyTotals = meals.reduce((acc, meal) => {
        acc.calories += meal.total_calories || 0;
        acc.protein += parseFloat(meal.total_protein) || 0;
        acc.carbs += parseFloat(meal.total_carbs) || 0;
        acc.fat += parseFloat(meal.total_fat) || 0;
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

      res.json({
        meals,
        summary: dailyTotals
      });
    } catch (err) {
      console.error('Get meals error:', err);
      res.status(500).json({ message: 'Failed to fetch meals' });
    }
  }

  static async getMealById(req, res) {
    try {
      const { id } = req.params;
      const meal = await Meal.getById(id, req.user.id);

      if (!meal) {
        return res.status(404).json({ message: 'Meal not found' });
      }

      res.json(meal);
    } catch (err) {
      console.error('Get meal error:', err);
      res.status(500).json({ message: 'Failed to fetch meal' });
    }
  }

  static async updateMeal(req, res) {
    try {
      const { id } = req.params;
      const {
        meal_type, meal_time, items, notes
      } = req.body;

      const existingMeal = await Meal.getById(id, req.user.id);
      if (!existingMeal) {
        return res.status(404).json({ message: 'Meal not found' });
      }

      if (items && Array.isArray(items)) {
        // Recalculate totals
        let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;

        for (const item of items) {
          const { food_item_id, quantity, custom_food_name = null } = item;

          if (custom_food_name) {
            totalCalories += (item.custom_calories || 0) * quantity;
            totalProtein += (item.custom_protein || 0) * quantity;
            totalCarbs += (item.custom_carbs || 0) * quantity;
            totalFat += (item.custom_fat || 0) * quantity;
          } else if (food_item_id) {
            const food = await FoodItem.getById(food_item_id);
            if (food) {
              totalCalories += food.calories * quantity;
              totalProtein += food.protein * quantity;
              totalCarbs += food.carbs * quantity;
              totalFat += food.fat * quantity;
            }
          }
        }

        // Update meal totals
        await Meal.update(id, req.user.id, {
          meal_type,
          meal_time,
          notes,
          total_calories: Math.round(totalCalories),
          total_protein: Math.round(totalProtein * 100) / 100,
          total_carbs: Math.round(totalCarbs * 100) / 100,
          total_fat: Math.round(totalFat * 100) / 100
        });

        // Delete existing items and add new ones
        await Meal.removeMealItems(id, req.user.id);
        
        for (const item of items) {
          await Meal.addMealItem(id, item);
        }
      } else {
        // Update only meal details
        await Meal.update(id, req.user.id, {
          meal_type,
          meal_time,
          notes,
          total_calories: existingMeal.total_calories,
          total_protein: existingMeal.total_protein,
          total_carbs: existingMeal.total_carbs,
          total_fat: existingMeal.total_fat
        });
      }

      const updatedMeal = await Meal.getById(id, req.user.id);

      res.json({
        message: 'Meal updated successfully',
        meal: updatedMeal
      });
    } catch (err) {
      console.error('Update meal error:', err);
      res.status(500).json({ message: 'Failed to update meal' });
    }
  }

  static async deleteMeal(req, res) {
    try {
      const { id } = req.params;

      const existingMeal = await Meal.getById(id, req.user.id);
      if (!existingMeal) {
        return res.status(404).json({ message: 'Meal not found' });
      }

      await Meal.delete(id, req.user.id);

      res.json({ message: 'Meal deleted successfully' });
    } catch (err) {
      console.error('Delete meal error:', err);
      res.status(500).json({ message: 'Failed to delete meal' });
    }
  }

  static async getWeeklyMealSummary(req, res) {
    try {
      const { start_date } = req.query;

      if (!start_date) {
        return res.status(400).json({ message: 'Start date is required' });
      }

      const summary = await Meal.getWeeklySummary(req.user.id, start_date);

      // Fill in missing dates
      const startDate = new Date(start_date);
      const result = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const dayData = summary.find(s => 
          new Date(s.date).toISOString().split('T')[0] === dateStr
        );

        result.push({
          date: dateStr,
          total_calories: dayData?.total_calories || 0,
          total_protein: dayData?.total_protein || 0,
          total_carbs: dayData?.total_carbs || 0,
          total_fat: dayData?.total_fat || 0,
          meal_count: dayData?.meal_count || 0
        });
      }

      res.json(result);
    } catch (err) {
      console.error('Get weekly meal summary error:', err);
      res.status(500).json({ message: 'Failed to fetch weekly summary' });
    }
  }

  // ===== FAVORITES =====

  static async getUserFavorites(req, res) {
    try {
      const { limit = 20 } = req.query;
      const favorites = await UserFavoriteFood.getUserFavorites(req.user.id, limit);
      res.json(favorites);
    } catch (err) {
      console.error('Get favorites error:', err);
      res.status(500).json({ message: 'Failed to fetch favorites' });
    }
  }

  static async addToFavorites(req, res) {
    try {
      const { foodId } = req.params;

      const food = await FoodItem.getById(foodId);
      if (!food) {
        return res.status(404).json({ message: 'Food not found' });
      }

      await UserFavoriteFood.addOrUpdate(req.user.id, foodId);

      res.json({ message: 'Added to favorites' });
    } catch (err) {
      console.error('Add to favorites error:', err);
      res.status(500).json({ message: 'Failed to add to favorites' });
    }
  }

  static async removeFromFavorites(req, res) {
    try {
      const { foodId } = req.params;

      await UserFavoriteFood.remove(req.user.id, foodId);

      res.json({ message: 'Removed from favorites' });
    } catch (err) {
      console.error('Remove from favorites error:', err);
      res.status(500).json({ message: 'Failed to remove from favorites' });
    }
  }
}

module.exports = MealController;