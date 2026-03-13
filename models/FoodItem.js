// models/FoodItem.js
const db = require('../config/db');

class FoodItem {
  static async create(data, userId = null) {
    const {
      name, brand = '', category_id, calories, protein, carbs, fat,
      fiber = null, sugar = null, sodium = null,
      serving_size = null, serving_unit = 'g', is_custom = false
    } = data;

    const [result] = await db.query(
      `INSERT INTO food_items 
       (name, brand, category_id, calories, protein, carbs, fat, fiber, sugar, sodium,
        serving_size, serving_unit, is_custom, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), brand.trim(), category_id, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit,
        is_custom ? 1 : 0, is_custom ? userId : null
      ]
    );

    return result.insertId;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `SELECT f.*, fc.name as category_name, fc.icon as category_icon
       FROM food_items f
       LEFT JOIN food_categories fc ON f.category_id = fc.id
       WHERE f.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async search(query, categoryId = null, userId = null, limit = 50) {
    let sql = `
      SELECT f.*, fc.name as category_name, fc.icon as category_icon
      FROM food_items f
      LEFT JOIN food_categories fc ON f.category_id = fc.id
      WHERE 1=1
    `;
    const params = [];

    if (query && query.trim()) {
      sql += ` AND (f.name LIKE ? OR f.brand LIKE ?)`;
      params.push(`%${query.trim()}%`, `%${query.trim()}%`);
    }

    if (categoryId) {
      sql += ` AND f.category_id = ?`;
      params.push(parseInt(categoryId)); // Ensure it's a number
    }

    // Show user's custom foods first, then global foods
    sql += ` ORDER BY f.is_custom DESC, f.name ASC LIMIT ?`;
    params.push(parseInt(limit)); // Ensure it's a number

    const [rows] = await db.query(sql, params);
    return rows;
  }

  static async getByCategory(categoryId, limit = 100) {
    const [rows] = await db.query(
      `SELECT f.*, fc.name as category_name, fc.icon as category_icon
       FROM food_items f
       LEFT JOIN food_categories fc ON f.category_id = fc.id
       WHERE f.category_id = ?
       ORDER BY f.name ASC
       LIMIT ?`,
      [parseInt(categoryId), parseInt(limit)]
    );
    return rows;
  }

  static async getUserCustomFoods(userId) {
    const [rows] = await db.query(
      `SELECT f.*, fc.name as category_name, fc.icon as category_icon
       FROM food_items f
       LEFT JOIN food_categories fc ON f.category_id = fc.id
       WHERE f.is_custom = 1 AND f.created_by = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getPopularFoods(limit = 20) {
    const [rows] = await db.query(
      `SELECT f.*, fc.name as category_name, fc.icon as category_icon
       FROM food_items f
       LEFT JOIN food_categories fc ON f.category_id = fc.id
       WHERE f.is_custom = 0
       ORDER BY f.created_at DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    return rows;
  }

  static async update(id, data) {
    const {
      name, brand, calories, protein, carbs, fat,
      fiber, sugar, sodium, serving_size, serving_unit
    } = data;

    await db.query(
      `UPDATE food_items 
       SET name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
           fiber = ?, sugar = ?, sodium = ?, serving_size = ?, serving_unit = ?
       WHERE id = ?`,
      [
        name, brand, calories, protein, carbs, fat,
        fiber, sugar, sodium, serving_size, serving_unit, id
      ]
    );
  }

  static async delete(id) {
    await db.query(`DELETE FROM food_items WHERE id = ?`, [id]);
  }

  static async incrementPopularity(id) {
    await db.query(
      `UPDATE food_items SET use_count = use_count + 1 WHERE id = ?`,
      [id]
    );
  }

  static async initializeDefaultFoods() {
    // First, get all category IDs
    const [categories] = await db.query(`SELECT id, name FROM food_categories`);
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    const defaultFoods = [
      // Breakfast
      { name: 'Oatmeal', category: 'Breakfast', calories: 150, protein: 5, carbs: 27, fat: 3, serving_size: '1 cup cooked', serving_unit: 'cup' },
      { name: 'Scrambled Eggs', category: 'Breakfast', calories: 140, protein: 10, carbs: 1, fat: 10, serving_size: '2 eggs', serving_unit: 'piece' },
      { name: 'Greek Yogurt', category: 'Breakfast', calories: 100, protein: 17, carbs: 6, fat: 0, serving_size: '150g', serving_unit: 'g' },
      { name: 'Banana', category: 'Fruits', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, serving_size: '1 medium', serving_unit: 'piece' },
      { name: 'Whole Wheat Toast', category: 'Breakfast', calories: 80, protein: 4, carbs: 14, fat: 1, serving_size: '1 slice', serving_unit: 'slice' },

      // Lunch
      { name: 'Grilled Chicken Breast', category: 'Protein', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: '100g', serving_unit: 'g' },
      { name: 'Brown Rice', category: 'Grains', calories: 215, protein: 5, carbs: 45, fat: 1.8, serving_size: '1 cup cooked', serving_unit: 'cup' },
      { name: 'Quinoa', category: 'Grains', calories: 220, protein: 8, carbs: 39, fat: 3.6, serving_size: '1 cup cooked', serving_unit: 'cup' },
      { name: 'Salmon Fillet', category: 'Protein', calories: 200, protein: 22, carbs: 0, fat: 12, serving_size: '100g', serving_unit: 'g' },
      { name: 'Caesar Salad', category: 'Lunch', calories: 330, protein: 8, carbs: 10, fat: 28, serving_size: '1 bowl', serving_unit: 'bowl' },

      // Dinner
      { name: 'Steak', category: 'Protein', calories: 250, protein: 26, carbs: 0, fat: 17, serving_size: '100g', serving_unit: 'g' },
      { name: 'Baked Potato', category: 'Vegetables', calories: 160, protein: 4, carbs: 37, fat: 0.2, serving_size: '1 medium', serving_unit: 'piece' },
      { name: 'Steamed Broccoli', category: 'Vegetables', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, serving_size: '1 cup', serving_unit: 'cup' },
      { name: 'Spaghetti', category: 'Grains', calories: 220, protein: 8, carbs: 43, fat: 1.3, serving_size: '1 cup cooked', serving_unit: 'cup' },

      // Snacks
      { name: 'Apple', category: 'Fruits', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving_size: '1 medium', serving_unit: 'piece' },
      { name: 'Almonds', category: 'Snacks', calories: 160, protein: 6, carbs: 6, fat: 14, serving_size: '1 oz', serving_unit: 'oz' },
      { name: 'Protein Bar', category: 'Snacks', calories: 200, protein: 15, carbs: 22, fat: 8, serving_size: '1 bar', serving_unit: 'piece' },
      { name: 'Hummus', category: 'Snacks', calories: 70, protein: 2, carbs: 6, fat: 5, serving_size: '2 tbsp', serving_unit: 'tbsp' },

      // Fruits
      { name: 'Orange', category: 'Fruits', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, serving_size: '1 medium', serving_unit: 'piece' },
      { name: 'Strawberries', category: 'Fruits', calories: 49, protein: 1, carbs: 11.7, fat: 0.5, serving_size: '1 cup', serving_unit: 'cup' },
      { name: 'Blueberries', category: 'Fruits', calories: 85, protein: 1.1, carbs: 21, fat: 0.5, serving_size: '1 cup', serving_unit: 'cup' },

      // Vegetables
      { name: 'Spinach', category: 'Vegetables', calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, serving_size: '1 cup', serving_unit: 'cup' },
      { name: 'Carrots', category: 'Vegetables', calories: 50, protein: 1.1, carbs: 12, fat: 0.3, serving_size: '1 cup', serving_unit: 'cup' },
      { name: 'Bell Peppers', category: 'Vegetables', calories: 30, protein: 1, carbs: 7, fat: 0.3, serving_size: '1 cup', serving_unit: 'cup' },

      // Dairy
      { name: 'Milk', category: 'Dairy', calories: 103, protein: 8, carbs: 12, fat: 2.4, serving_size: '1 cup', serving_unit: 'cup' },
      { name: 'Cheddar Cheese', category: 'Dairy', calories: 113, protein: 7, carbs: 0.4, fat: 9, serving_size: '1 slice', serving_unit: 'slice' },
      { name: 'Cottage Cheese', category: 'Dairy', calories: 110, protein: 13, carbs: 5, fat: 5, serving_size: '1/2 cup', serving_unit: 'cup' },

      // Beverages
      { name: 'Water', category: 'Beverages', calories: 0, protein: 0, carbs: 0, fat: 0, serving_size: '1 glass', serving_unit: 'glass' },
      { name: 'Coffee', category: 'Beverages', calories: 2, protein: 0.3, carbs: 0, fat: 0, serving_size: '1 cup', serving_unit: 'cup' },
      { name: 'Orange Juice', category: 'Beverages', calories: 110, protein: 2, carbs: 26, fat: 0, serving_size: '1 cup', serving_unit: 'cup' }
    ];

    for (const food of defaultFoods) {
      const categoryId = categoryMap[food.category];
      
      if (categoryId) {
        // Check if food already exists
        const [existing] = await db.query(
          `SELECT id FROM food_items WHERE name = ? AND category_id = ? AND is_custom = 0`,
          [food.name, categoryId]
        );

        if (existing.length === 0) {
          await db.query(
            `INSERT INTO food_items 
             (name, category_id, calories, protein, carbs, fat, serving_size, serving_unit, is_custom)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
            [
              food.name, categoryId, food.calories, food.protein,
              food.carbs, food.fat, food.serving_size, food.serving_unit
            ]
          );
        }
      }
    }
  }
}

module.exports = FoodItem;