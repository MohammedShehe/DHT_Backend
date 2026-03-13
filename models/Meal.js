// models/Meal.js
const db = require('../config/db');

class Meal {
  static async create(userId, data) {
    const {
      meal_type, meal_time, notes = null,
      total_calories, total_protein, total_carbs, total_fat,
      photo_url = null
    } = data;

    const [result] = await db.query(
      `INSERT INTO meals 
       (user_id, meal_type, meal_time, notes, total_calories, total_protein, total_carbs, total_fat, photo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, meal_type, meal_time, notes,
        total_calories, total_protein, total_carbs, total_fat, photo_url
      ]
    );

    return result.insertId;
  }

  static async getById(id, userId) {
    const [rows] = await db.query(
      `SELECT m.*, 
              COALESCE(
                (SELECT CONCAT('[', 
                  GROUP_CONCAT(
                    JSON_OBJECT(
                      'id', mi.id,
                      'food_item_id', mi.food_item_id,
                      'food_name', COALESCE(mi.custom_food_name, f.name),
                      'quantity', mi.quantity,
                      'serving_unit', mi.serving_unit,
                      'calories', COALESCE(mi.custom_calories, f.calories),
                      'protein', COALESCE(mi.custom_protein, f.protein),
                      'carbs', COALESCE(mi.custom_carbs, f.carbs),
                      'fat', COALESCE(mi.custom_fat, f.fat)
                    )
                  ), ']')
                 FROM meal_items mi
                 LEFT JOIN food_items f ON mi.food_item_id = f.id
                 WHERE mi.meal_id = m.id), '[]'
              ) as items
       FROM meals m
       WHERE m.id = ? AND m.user_id = ?`,
      [id, userId]
    );

    if (rows[0]) {
      try {
        rows[0].items = JSON.parse(rows[0].items);
      } catch (e) {
        rows[0].items = [];
      }
    }

    return rows[0];
  }

  static async getByUserAndDate(userId, date) {
    const [rows] = await db.query(
      `SELECT m.*,
              COALESCE(
                (SELECT CONCAT('[', 
                  GROUP_CONCAT(
                    JSON_OBJECT(
                      'id', mi.id,
                      'food_item_id', mi.food_item_id,
                      'food_name', COALESCE(mi.custom_food_name, f.name),
                      'quantity', mi.quantity,
                      'serving_unit', mi.serving_unit,
                      'calories', COALESCE(mi.custom_calories, f.calories),
                      'protein', COALESCE(mi.custom_protein, f.protein),
                      'carbs', COALESCE(mi.custom_carbs, f.carbs),
                      'fat', COALESCE(mi.custom_fat, f.fat)
                    )
                  ), ']')
                 FROM meal_items mi
                 LEFT JOIN food_items f ON mi.food_item_id = f.id
                 WHERE mi.meal_id = m.id), '[]'
              ) as items
       FROM meals m
       WHERE m.user_id = ? AND DATE(m.meal_time) = DATE(?)
       ORDER BY m.meal_time DESC`,
      [userId, date]
    );

    return rows.map(meal => {
      try {
        meal.items = JSON.parse(meal.items);
      } catch (e) {
        meal.items = [];
      }
      return meal;
    });
  }

  static async getWeeklySummary(userId, startDate) {
    const [rows] = await db.query(
      `SELECT 
        DATE(meal_time) as date,
        SUM(total_calories) as total_calories,
        SUM(total_protein) as total_protein,
        SUM(total_carbs) as total_carbs,
        SUM(total_fat) as total_fat,
        COUNT(DISTINCT id) as meal_count
       FROM meals
       WHERE user_id = ? AND meal_time >= ?
       GROUP BY DATE(meal_time)
       ORDER BY date ASC`,
      [userId, startDate]
    );

    return rows;
  }

  static async update(id, userId, data) {
    const {
      meal_type, meal_time, notes,
      total_calories, total_protein, total_carbs, total_fat,
      photo_url
    } = data;

    await db.query(
      `UPDATE meals 
       SET meal_type = ?, meal_time = ?, notes = ?,
           total_calories = ?, total_protein = ?, total_carbs = ?, total_fat = ?,
           photo_url = COALESCE(?, photo_url)
       WHERE id = ? AND user_id = ?`,
      [
        meal_type, meal_time, notes,
        total_calories, total_protein, total_carbs, total_fat,
        photo_url, id, userId
      ]
    );
  }

  static async delete(id, userId) {
    await db.query(
      `DELETE FROM meals WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  }

  static async addMealItem(mealId, data) {
    const {
      food_item_id = null,
      quantity,
      serving_unit,
      custom_food_name = null,
      custom_calories = null,
      custom_protein = null,
      custom_carbs = null,
      custom_fat = null,
      notes = null
    } = data;

    // Validate that either food_item_id is provided OR custom food details are provided
    if (!food_item_id && !custom_food_name) {
      throw new Error('Either food_item_id or custom_food_name must be provided');
    }

    // If it's a custom food, ensure nutritional values are provided
    if (custom_food_name && (!custom_calories || !custom_protein || !custom_carbs || !custom_fat)) {
      throw new Error('Custom food must include calories, protein, carbs, and fat');
    }

    const [result] = await db.query(
      `INSERT INTO meal_items 
       (meal_id, food_item_id, quantity, serving_unit, custom_food_name,
        custom_calories, custom_protein, custom_carbs, custom_fat, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mealId,
        food_item_id,  // This will be NULL for custom foods
        parseFloat(quantity),
        serving_unit,
        custom_food_name,
        custom_calories ? parseInt(custom_calories) : null,
        custom_protein ? parseFloat(custom_protein) : null,
        custom_carbs ? parseFloat(custom_carbs) : null,
        custom_fat ? parseFloat(custom_fat) : null,
        notes
      ]
    );

    return result.insertId;
  }

  static async removeMealItems(mealId, userId) {
    // Verify meal belongs to user
    const [meal] = await db.query(
      `SELECT id FROM meals WHERE id = ? AND user_id = ?`,
      [mealId, userId]
    );

    if (meal.length === 0) {
      throw new Error('Meal not found or access denied');
    }

    await db.query(
      `DELETE FROM meal_items WHERE meal_id = ?`,
      [mealId]
    );
  }

  static async removeMealItem(itemId, mealId, userId) {
    // Verify meal belongs to user
    const [meal] = await db.query(
      `SELECT id FROM meals WHERE id = ? AND user_id = ?`,
      [mealId, userId]
    );

    if (meal.length === 0) {
      throw new Error('Meal not found or access denied');
    }

    await db.query(
      `DELETE FROM meal_items WHERE id = ? AND meal_id = ?`,
      [itemId, mealId]
    );
  }

  static async updateMealTotals(mealId) {
    // Recalculate meal totals based on items
    const [items] = await db.query(
      `SELECT 
        SUM(COALESCE(custom_calories, f.calories) * quantity) as total_calories,
        SUM(COALESCE(custom_protein, f.protein) * quantity) as total_protein,
        SUM(COALESCE(custom_carbs, f.carbs) * quantity) as total_carbs,
        SUM(COALESCE(custom_fat, f.fat) * quantity) as total_fat
       FROM meal_items mi
       LEFT JOIN food_items f ON mi.food_item_id = f.id
       WHERE mi.meal_id = ?`,
      [mealId]
    );

    if (items[0]) {
      await db.query(
        `UPDATE meals 
         SET total_calories = ?, total_protein = ?, total_carbs = ?, total_fat = ?
         WHERE id = ?`,
        [
          Math.round(items[0].total_calories || 0),
          parseFloat(items[0].total_protein || 0).toFixed(2),
          parseFloat(items[0].total_carbs || 0).toFixed(2),
          parseFloat(items[0].total_fat || 0).toFixed(2),
          mealId
        ]
      );
    }
  }
}

module.exports = Meal;