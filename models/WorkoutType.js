const db = require('../config/db');

class WorkoutType {
    static async getAll(userId = null) {
        let sql = `
            SELECT * FROM workout_types 
            WHERE is_custom = 0 
        `;
        const params = [];
        
        if (userId) {
            sql += ` OR (is_custom = 1 AND created_by = ?)`;
            params.push(userId);
        }
        
        sql += ` ORDER BY name ASC`;
        
        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async getById(id, userId = null) {
        let sql = `SELECT * FROM workout_types WHERE id = ?`;
        const params = [id];
        
        if (userId) {
            sql += ` AND (is_custom = 0 OR created_by = ?)`;
            params.push(userId);
        }
        
        const [rows] = await db.query(sql, params);
        return rows[0];
    }

    static async create(name, userId) {
        const [result] = await db.query(
            `INSERT INTO workout_types (name, is_custom, created_by) VALUES (?, 1, ?)`,
            [name.trim(), userId]
        );
        return result.insertId;
    }

    static async delete(id, userId) {
        await db.query(
            `DELETE FROM workout_types WHERE id = ? AND is_custom = 1 AND created_by = ?`,
            [id, userId]
        );
    }

    static async getOrCreate(name, userId) {
        const existing = await this.getByName(name, userId);
        if (existing) return existing.id;
        
        return await this.create(name, userId);
    }

    static async getByName(name, userId) {
        const [rows] = await db.query(
            `SELECT * FROM workout_types WHERE name = ? AND (is_custom = 0 OR created_by = ?)`,
            [name.trim(), userId]
        );
        return rows[0];
    }
}

module.exports = WorkoutType;