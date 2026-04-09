const db = require('../config/db');

class WorkoutDetail {
    static async create(userId, data) {
        const {
            workout_type_id = null,
            custom_workout_name = null,
            workout_time,
            duration_minutes,
            intensity,
            distance = null,
            heart_rate = null,
            feeling = null,
            notes = null,
            calories_burned = null
        } = data;

        if (!workout_type_id && !custom_workout_name) {
            throw new Error('Either workout type or custom workout name is required');
        }

        // Ensure workout_time is stored as a proper date
        const workoutDate = workout_time instanceof Date ? workout_time : new Date(workout_time);

        const [result] = await db.query(
            `INSERT INTO workout_details 
             (user_id, workout_type_id, custom_workout_name, workout_time, duration_minutes,
              intensity, distance, heart_rate, feeling, notes, calories_burned)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId, workout_type_id, custom_workout_name, workoutDate, duration_minutes,
                intensity, distance, heart_rate, feeling, notes, calories_burned
            ]
        );

        await this.updateStats(userId, workoutDate);

        return result.insertId;
    }

    static async getById(id, userId) {
        const [rows] = await db.query(
            `SELECT wd.*, wt.name as workout_type_name
             FROM workout_details wd
             LEFT JOIN workout_types wt ON wd.workout_type_id = wt.id
             WHERE wd.id = ? AND wd.user_id = ?`,
            [id, userId]
        );
        return rows[0];
    }

    static async getByUser(userId, filters = {}) {
        let sql = `
            SELECT wd.*, wt.name as workout_type_name,
                   DATE(wd.workout_time) as workout_date
            FROM workout_details wd
            LEFT JOIN workout_types wt ON wd.workout_type_id = wt.id
            WHERE wd.user_id = ?
        `;
        const params = [userId];

        if (filters.start_date) {
            const startDate = filters.start_date instanceof Date 
                ? filters.start_date 
                : new Date(filters.start_date);
            sql += ` AND DATE(wd.workout_time) >= ?`;
            params.push(startDate.toISOString().split('T')[0]);
        }

        if (filters.end_date) {
            const endDate = filters.end_date instanceof Date 
                ? filters.end_date 
                : new Date(filters.end_date);
            sql += ` AND DATE(wd.workout_time) <= ?`;
            params.push(endDate.toISOString().split('T')[0]);
        }

        if (filters.intensity) {
            sql += ` AND wd.intensity = ?`;
            params.push(filters.intensity);
        }

        if (filters.workout_type_id) {
            sql += ` AND wd.workout_type_id = ?`;
            params.push(filters.workout_type_id);
        }

        sql += ` ORDER BY wd.workout_time DESC`;
        
        if (filters.limit) {
            sql += ` LIMIT ?`;
            params.push(parseInt(filters.limit));
        }

        if (filters.offset) {
            sql += ` OFFSET ?`;
            params.push(parseInt(filters.offset));
        }

        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async update(id, userId, data) {
        const updates = [];
        const params = [];

        const allowedFields = [
            'workout_type_id', 'custom_workout_name', 'workout_time', 'duration_minutes',
            'intensity', 'distance', 'heart_rate', 'feeling', 'notes', 'calories_burned'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = ?`);
                let value = data[field];
                if (field === 'workout_time' && value instanceof Date) {
                    value = value;
                }
                params.push(value);
            }
        }

        if (updates.length === 0) return;

        params.push(id, userId);
        await db.query(
            `UPDATE workout_details SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
            params
        );

        const workout = await this.getById(id, userId);
        if (workout) {
            await this.updateStats(userId, workout.workout_time);
        }
    }

    static async delete(id, userId) {
        const workout = await this.getById(id, userId);
        if (!workout) return;

        await db.query(
            `DELETE FROM workout_details WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        await this.updateStats(userId, workout.workout_time);
    }

    static async getDailyStats(userId, date) {
        // Format date as YYYY-MM-DD for MySQL DATE() function
        const dateStr = date instanceof Date 
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
            : date;
        
        const [rows] = await db.query(
            `SELECT 
                COUNT(*) as workout_count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(calories_burned), 0) as total_calories,
                COALESCE(SUM(distance), 0) as total_distance,
                AVG(heart_rate) as avg_heart_rate
             FROM workout_details
             WHERE user_id = ? AND DATE(workout_time) = ?`,
            [userId, dateStr]
        );
        return rows[0];
    }

    static async getWeeklyStats(userId, startDate) {
        // Calculate end date (7 days from start)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        
        const [rows] = await db.query(
            `SELECT 
                DATE(workout_time) as date,
                COUNT(*) as workout_count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(calories_burned), 0) as total_calories,
                COALESCE(SUM(distance), 0) as total_distance,
                AVG(heart_rate) as avg_heart_rate
             FROM workout_details
             WHERE user_id = ? AND DATE(workout_time) BETWEEN ? AND ?
             GROUP BY DATE(workout_time)
             ORDER BY date ASC`,
            [userId, startDateStr, endDateStr]
        );
        return rows;
    }

    static async getMonthlyStats(userId, year, month) {
        const [rows] = await db.query(
            `SELECT 
                DATE(workout_time) as date,
                COUNT(*) as workout_count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(calories_burned), 0) as total_calories,
                COALESCE(SUM(distance), 0) as total_distance
             FROM workout_details
             WHERE user_id = ? 
               AND YEAR(workout_time) = ? 
               AND MONTH(workout_time) = ?
             GROUP BY DATE(workout_time)
             ORDER BY date ASC`,
            [userId, year, month]
        );
        return rows;
    }

    static async getIntensityDistribution(userId, startDate = null, endDate = null) {
        let sql = `
            SELECT 
                intensity,
                COUNT(*) as count,
                COALESCE(SUM(duration_minutes), 0) as total_duration
            FROM workout_details
            WHERE user_id = ?
        `;
        const params = [userId];

        if (startDate) {
            const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            sql += ` AND DATE(workout_time) >= ?`;
            params.push(startStr);
        }

        if (endDate) {
            const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
            sql += ` AND DATE(workout_time) <= ?`;
            params.push(endStr);
        }

        sql += ` GROUP BY intensity ORDER BY 
            FIELD(intensity, 'low', 'moderate', 'high', 'very_high')`;

        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async getWorkoutTypeStats(userId, startDate = null, endDate = null) {
        let sql = `
            SELECT 
                COALESCE(wt.name, wd.custom_workout_name) as workout_name,
                COUNT(*) as count,
                COALESCE(SUM(wd.duration_minutes), 0) as total_duration,
                COALESCE(SUM(wd.calories_burned), 0) as total_calories,
                AVG(wd.heart_rate) as avg_heart_rate
            FROM workout_details wd
            LEFT JOIN workout_types wt ON wd.workout_type_id = wt.id
            WHERE wd.user_id = ?
        `;
        const params = [userId];

        if (startDate) {
            const startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
            sql += ` AND DATE(wd.workout_time) >= ?`;
            params.push(startStr);
        }

        if (endDate) {
            const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
            sql += ` AND DATE(wd.workout_time) <= ?`;
            params.push(endStr);
        }

        sql += ` GROUP BY workout_name ORDER BY count DESC LIMIT 10`;

        const [rows] = await db.query(sql, params);
        return rows;
    }

    static async updateStats(userId, workoutTime) {
        const date = workoutTime instanceof Date 
            ? workoutTime 
            : new Date(workoutTime);
        
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as workout_count,
                COALESCE(SUM(duration_minutes), 0) as total_duration,
                COALESCE(SUM(calories_burned), 0) as total_calories,
                COALESCE(SUM(distance), 0) as total_distance,
                AVG(heart_rate) as avg_heart_rate
             FROM workout_details
             WHERE user_id = ? AND DATE(workout_time) = ?`,
            [userId, dateStr]
        );

        const { workout_count, total_duration, total_calories, total_distance, avg_heart_rate } = stats[0];

        await db.query(
            `INSERT INTO workout_stats 
             (user_id, stats_date, total_duration_minutes, total_calories_burned, 
              total_distance, workout_count, avg_heart_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_duration_minutes = VALUES(total_duration_minutes),
             total_calories_burned = VALUES(total_calories_burned),
             total_distance = VALUES(total_distance),
             workout_count = VALUES(workout_count),
             avg_heart_rate = VALUES(avg_heart_rate),
             updated_at = CURRENT_TIMESTAMP`,
            [userId, dateStr, total_duration, total_calories, total_distance, workout_count, avg_heart_rate]
        );
    }

    static async calculateCalories(duration_minutes, intensity, weight_kg = 70) {
        const metValues = {
            'low': 3.5,
            'moderate': 5.0,
            'high': 7.0,
            'very_high': 9.0
        };
        
        const met = metValues[intensity] || 5.0;
        const hours = duration_minutes / 60;
        
        return Math.round(met * weight_kg * hours);
    }
}

module.exports = WorkoutDetail;