// models/FoodCategory.js
const db = require('../config/db');

class FoodCategory {
  static async getAll() {
    const [rows] = await db.query(
      `SELECT * FROM food_categories ORDER BY display_order, name`
    );
    return rows;
  }

  static async getById(id) {
    const [rows] = await db.query(
      `SELECT * FROM food_categories WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  static async getByName(name) {
    const [rows] = await db.query(
      `SELECT * FROM food_categories WHERE name = ?`,
      [name]
    );
    return rows[0];
  }

  static async initializeDefaultCategories() {
    const defaultCategories = [
      { name: 'Breakfast', icon: 'breakfast_dining', color: '#FF9800', display_order: 1 },
      { name: 'Lunch', icon: 'lunch_dining', color: '#4CAF50', display_order: 2 },
      { name: 'Dinner', icon: 'dinner_dining', color: '#9C27B0', display_order: 3 },
      { name: 'Snacks', icon: 'cookie', color: '#FF5722', display_order: 4 },
      { name: 'Fruits', icon: 'apple', color: '#E91E63', display_order: 5 },
      { name: 'Vegetables', icon: 'eco', color: '#8BC34A', display_order: 6 },
      { name: 'Protein', icon: 'fitness_center', color: '#F44336', display_order: 7 },
      { name: 'Grains', icon: 'grain', color: '#795548', display_order: 8 },
      { name: 'Dairy', icon: 'egg', color: '#2196F3', display_order: 9 },
      { name: 'Beverages', icon: 'local_drink', color: '#00BCD4', display_order: 10 },
      { name: 'Fast Food', icon: 'fastfood', color: '#FF6D00', display_order: 11 },
      { name: 'Desserts', icon: 'cake', color: '#D81B60', display_order: 12 },
      { name: 'Other', icon: 'category', color: '#607D8B', display_order: 13 }
    ];

    for (const cat of defaultCategories) {
      const existing = await this.getByName(cat.name);
      if (!existing) {
        await db.query(
          `INSERT INTO food_categories (name, icon, color, display_order) VALUES (?, ?, ?, ?)`,
          [cat.name, cat.icon, cat.color, cat.display_order]
        );
      }
    }
  }
}

module.exports = FoodCategory;