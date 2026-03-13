// routes/mealRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');
const validatePagination = require('../middlewares/validatePagination');
const { logLimiter } = require('../middlewares/rateLimiter');
const MealController = require('../controllers/mealController');
const validateMealInput = require('../middlewares/validateMealInput');

// Food categories
router.get('/categories', auth, MealController.getCategories);

// Food items
router.get('/foods/search', auth, MealController.searchFoods);
router.get('/foods/popular', auth, MealController.getPopularFoods);
router.get('/foods/category/:categoryId', auth, MealController.getFoodsByCategory);
router.get('/foods/custom', auth, MealController.getUserCustomFoods);
router.post('/foods/custom', auth, logLimiter, MealController.createCustomFood);
router.put('/foods/custom/:foodId', auth, MealController.updateCustomFood);
router.delete('/foods/custom/:foodId', auth, MealController.deleteCustomFood);

// Favorites (MUST come BEFORE /:id route)
router.get('/favorites', auth, MealController.getUserFavorites);
router.post('/favorites/:foodId', auth, MealController.addToFavorites);
router.delete('/favorites/:foodId', auth, MealController.removeFromFavorites);

// Meals summary (MUST come BEFORE /:id route)
router.get('/summary/weekly', auth, MealController.getWeeklyMealSummary);

// Meals
router.post('/', auth, logLimiter, validateMealInput, MealController.createMeal);
router.get('/', auth, MealController.getMeals);

// Meal by ID (MUST come LAST)
router.get('/:id', auth, MealController.getMealById);
router.put('/:id', auth, MealController.updateMeal);
router.delete('/:id', auth, MealController.deleteMeal);

module.exports = router;