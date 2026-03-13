// models/UserFavoriteFood.js
const db = require('../config/db');

class UserFavoriteFood {
  static async addOrUpdate(userId, foodItemId) {
    const [existing] = await db.query(
      `SELECT id FROM user_favorite_foods WHERE user_id = ? AND food_item_id = ?`,
      [userId, foodItemId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE user_favorite_foods 
         SET last_used = CURRENT_TIMESTAMP, use_count = use_count + 1
         WHERE user_id = ? AND food_item_id = ?`,
        [userId, foodItemId]
      );
    } else {
      await db.query(
        `INSERT INTO user_favorite_foods (user_id, food_item_id) VALUES (?, ?)`,
        [userId, foodItemId]
      );
    }
  }

  static async getUserFavorites(userId, limit = 20) {
    const [rows] = await db.query(
      `SELECT f.*, uf.last_used, uf.use_count,
              fc.name as category_name, fc.icon as category_icon
       FROM user_favorite_foods uf
       JOIN food_items f ON uf.food_item_id = f.id
       LEFT JOIN food_categories fc ON f.category_id = fc.id
       WHERE uf.user_id = ?
       ORDER BY uf.use_count DESC, uf.last_used DESC
       LIMIT ?`,
      [userId, parseInt(limit)]  // FIXED: Added parseInt() to convert string to number
    );

    return rows;
  }

  static async remove(userId, foodItemId) {
    await db.query(
      `DELETE FROM user_favorite_foods WHERE user_id = ? AND food_item_id = ?`,
      [userId, foodItemId]
    );
  }
}

module.exports = UserFavoriteFood;