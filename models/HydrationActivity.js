// models/HydrationActivity.js (UPDATED - Fix date handling)
const db = require('../config/db');

class HydrationActivity {
    // Helper: Convert local date to UTC for storage
    static localDateToUTC(dateStr) {
        // dateStr format: YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create date in local timezone (noon to avoid DST issues)
        const localDate = new Date(year, month - 1, day, 12, 0, 0);
        // Return YYYY-MM-DD in UTC
        return localDate.toISOString().split('T')[0];
    }

    // Helper: Get current local date
    static getCurrentLocalDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Drink type labels and colors for frontend
    static getDrinkTypes() {
        return [
            { value: 'water', label: '💧 Water', color: '#3B82F6', icon: 'local_drink' },
            { value: 'sports_drink', label: '⚡ Sports Drink', color: '#10B981', icon: 'bolt' },
            { value: 'juice', label: '🍊 Juice', color: '#F59E0B', icon: 'apple' },
            { value: 'tea', label: '🍵 Tea', color: '#8B5CF6', icon: 'local_cafe' },
            { value: 'coffee', label: '☕ Coffee', color: '#78350F', icon: 'coffee' },
            { value: 'milk', label: '🥛 Milk', color: '#EC4899', icon: 'egg' },
            { value: 'soda', label: '🥤 Soda', color: '#EF4444', icon: 'local_drink' },
            { value: 'other', label: '🧃 Other', color: '#6B7280', icon: 'more_horiz' }
        ];
    }

    // Preset amounts in ml
    static getPresetAmounts() {
        return [
            { value: 250, label: '250ml', icon: '🌊' },
            { value: 500, label: '500ml', icon: '💧' },
            { value: 750, label: '750ml', icon: '💧💧' },
            { value: 1000, label: '1000ml (1L)', icon: '💧💧💧' }
        ];
    }

    // Create or update hydration goal
    static async setGoal(userId, dailyTargetMl) {
        const [existing] = await db.query(
            `SELECT id FROM hydration_activity_goals WHERE user_id = ?`,
            [userId]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE hydration_activity_goals SET daily_target_ml = ? WHERE user_id = ?`,
                [dailyTargetMl, userId]
            );
            return { message: 'Goal updated successfully' };
        } else {
            await db.query(
                `INSERT INTO hydration_activity_goals (user_id, daily_target_ml) VALUES (?, ?)`,
                [userId, dailyTargetMl]
            );
            return { message: 'Goal created successfully' };
        }
    }

    // Get user's hydration goal
    static async getGoal(userId) {
        const [rows] = await db.query(
            `SELECT * FROM hydration_activity_goals WHERE user_id = ?`,
            [userId]
        );
        return rows[0];
    }

    // Delete hydration goal
    static async deleteGoal(userId) {
        await db.query(
            `DELETE FROM hydration_activity_goals WHERE user_id = ?`,
            [userId]
        );
        return { message: 'Goal deleted successfully' };
    }

    // Log hydration entry (FIXED: Proper date handling)
    static async logHydration(userId, data) {
        const {
            amount_ml,
            drink_type,
            custom_drink_name = null,
            consumption_time,
            log_date,
            notes = null
        } = data;

        // Validate amount
        if (amount_ml <= 0 || amount_ml > 5000) {
            throw new Error('Amount must be between 1 and 5000 ml');
        }

        // Validate drink type
        const validTypes = ['water', 'sports_drink', 'juice', 'tea', 'coffee', 'milk', 'soda', 'other'];
        if (!validTypes.includes(drink_type)) {
            throw new Error('Invalid drink type');
        }

        // If drink_type is 'other', custom_drink_name is required
        if (drink_type === 'other' && !custom_drink_name) {
            throw new Error('Custom drink name is required for "other" type');
        }

        // Validate time format
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!timeRegex.test(consumption_time)) {
            throw new Error('Invalid time format. Use HH:MM or HH:MM:SS');
        }

        // FIX: Convert local date to proper format without timezone shift
        // Use the date as-is from the client (already in YYYY-MM-DD format)
        const localDate = log_date;
        
        // Insert log
        const [result] = await db.query(
            `INSERT INTO hydration_activity_logs 
             (user_id, amount_ml, drink_type, custom_drink_name, consumption_time, log_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, amount_ml, drink_type, custom_drink_name, consumption_time, localDate, notes]
        );

        // Update daily stats
        await this.updateDailyStats(userId, localDate);

        return { id: result.insertId, message: 'Hydration logged successfully' };
    }

    // Get hydration logs for a specific date (FIXED: Date comparison)
    static async getByDate(userId, date) {
        const [rows] = await db.query(
            `SELECT id, amount_ml, drink_type, custom_drink_name, 
                    consumption_time, DATE(log_date) as log_date, notes, created_at
             FROM hydration_activity_logs
             WHERE user_id = ? AND DATE(log_date) = ?
             ORDER BY consumption_time ASC`,
            [userId, date]
        );
        return rows;
    }

    // Get hydration logs for date range (FIXED: Date comparison)
    static async getByDateRange(userId, startDate, endDate, limit = null, offset = null) {
        let query = `
            SELECT id, amount_ml, drink_type, custom_drink_name, 
                   consumption_time, DATE(log_date) as log_date, notes, created_at
            FROM hydration_activity_logs
            WHERE user_id = ? AND DATE(log_date) BETWEEN ? AND ?
            ORDER BY log_date DESC, consumption_time DESC
        `;
        const params = [userId, startDate, endDate];

        if (limit !== null) {
            query += ` LIMIT ?`;
            params.push(parseInt(limit));
        }

        if (offset !== null) {
            query += ` OFFSET ?`;
            params.push(parseInt(offset));
        }

        const [rows] = await db.query(query, params);
        return rows;
    }

    // Get single hydration log by ID
    static async getById(id, userId) {
        const [rows] = await db.query(
            `SELECT *, DATE(log_date) as log_date FROM hydration_activity_logs WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        return rows[0];
    }

    // Update hydration log (FIXED: Date handling)
    static async updateLog(id, userId, data) {
        const {
            amount_ml,
            drink_type,
            custom_drink_name,
            consumption_time,
            log_date,
            notes
        } = data;

        // Get old log date for stats update
        const oldLog = await this.getById(id, userId);
        if (!oldLog) {
            throw new Error('Log not found');
        }

        const updates = [];
        const params = [];

        if (amount_ml !== undefined) {
            updates.push('amount_ml = ?');
            params.push(amount_ml);
        }
        if (drink_type !== undefined) {
            updates.push('drink_type = ?');
            params.push(drink_type);
        }
        if (custom_drink_name !== undefined) {
            updates.push('custom_drink_name = ?');
            params.push(custom_drink_name);
        }
        if (consumption_time !== undefined) {
            updates.push('consumption_time = ?');
            params.push(consumption_time);
        }
        if (log_date !== undefined) {
            updates.push('log_date = ?');
            params.push(log_date);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }

        if (updates.length === 0) return;

        params.push(id, userId);
        await db.query(
            `UPDATE hydration_activity_logs SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
            params
        );

        // Update stats for both old and new dates
        await this.updateDailyStats(userId, oldLog.log_date);
        if (log_date && log_date !== oldLog.log_date) {
            await this.updateDailyStats(userId, log_date);
        } else if (log_date === undefined) {
            await this.updateDailyStats(userId, oldLog.log_date);
        }

        return { message: 'Hydration log updated successfully' };
    }

    // Delete hydration log
    static async deleteLog(id, userId) {
        const log = await this.getById(id, userId);
        if (!log) {
            throw new Error('Log not found');
        }

        await db.query(
            `DELETE FROM hydration_activity_logs WHERE id = ? AND user_id = ?`,
            [id, userId]
        );

        // Update stats for that date
        await this.updateDailyStats(userId, log.log_date);

        return { message: 'Hydration log deleted successfully' };
    }

    // Update daily stats (aggregate data for faster queries)
    static async updateDailyStats(userId, date) {
        const [stats] = await db.query(
            `SELECT 
                COALESCE(SUM(amount_ml), 0) as total_ml,
                COUNT(*) as total_entries,
                SUM(CASE WHEN drink_type = 'water' THEN amount_ml ELSE 0 END) as water_ml,
                SUM(CASE WHEN drink_type = 'sports_drink' THEN amount_ml ELSE 0 END) as sports_drink_ml,
                SUM(CASE WHEN drink_type = 'juice' THEN amount_ml ELSE 0 END) as juice_ml,
                SUM(CASE WHEN drink_type = 'tea' THEN amount_ml ELSE 0 END) as tea_ml,
                SUM(CASE WHEN drink_type = 'coffee' THEN amount_ml ELSE 0 END) as coffee_ml,
                SUM(CASE WHEN drink_type = 'milk' THEN amount_ml ELSE 0 END) as milk_ml,
                SUM(CASE WHEN drink_type = 'soda' THEN amount_ml ELSE 0 END) as soda_ml,
                SUM(CASE WHEN drink_type = 'other' THEN amount_ml ELSE 0 END) as other_ml
             FROM hydration_activity_logs
             WHERE user_id = ? AND DATE(log_date) = ?`,
            [userId, date]
        );

        const data = stats[0];

        await db.query(
            `INSERT INTO hydration_activity_stats 
             (user_id, stats_date, total_ml, total_entries, water_ml, sports_drink_ml, 
              juice_ml, tea_ml, coffee_ml, milk_ml, soda_ml, other_ml)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             total_ml = VALUES(total_ml),
             total_entries = VALUES(total_entries),
             water_ml = VALUES(water_ml),
             sports_drink_ml = VALUES(sports_drink_ml),
             juice_ml = VALUES(juice_ml),
             tea_ml = VALUES(tea_ml),
             coffee_ml = VALUES(coffee_ml),
             milk_ml = VALUES(milk_ml),
             soda_ml = VALUES(soda_ml),
             other_ml = VALUES(other_ml),
             updated_at = CURRENT_TIMESTAMP`,
            [
                userId, date, data.total_ml, data.total_entries,
                data.water_ml, data.sports_drink_ml, data.juice_ml,
                data.tea_ml, data.coffee_ml, data.milk_ml,
                data.soda_ml, data.other_ml
            ]
        );
    }

    // Get daily stats for a specific date (FIXED: Date handling)
    static async getDailyStats(userId, date) {
        // Try to get from stats table first
        let [rows] = await db.query(
            `SELECT * FROM hydration_activity_stats WHERE user_id = ? AND stats_date = ?`,
            [userId, date]
        );

        if (rows.length === 0) {
            // Calculate on the fly if not in stats
            await this.updateDailyStats(userId, date);
            [rows] = await db.query(
                `SELECT * FROM hydration_activity_stats WHERE user_id = ? AND stats_date = ?`,
                [userId, date]
            );
        }

        const goal = await this.getGoal(userId);
        const stats = rows[0] || { total_ml: 0, total_entries: 0 };

        return {
            date,
            total_ml: stats.total_ml || 0,
            total_entries: stats.total_entries || 0,
            daily_target_ml: goal?.daily_target_ml || 2500,
            percentage: Math.min(Math.floor(((stats.total_ml || 0) / (goal?.daily_target_ml || 2500)) * 100), 100),
            remaining_ml: Math.max((goal?.daily_target_ml || 2500) - (stats.total_ml || 0), 0),
            completed: (stats.total_ml || 0) >= (goal?.daily_target_ml || 2500),
            breakdown: {
                water: stats.water_ml || 0,
                sports_drink: stats.sports_drink_ml || 0,
                juice: stats.juice_ml || 0,
                tea: stats.tea_ml || 0,
                coffee: stats.coffee_ml || 0,
                milk: stats.milk_ml || 0,
                soda: stats.soda_ml || 0,
                other: stats.other_ml || 0
            }
        };
    }

    // Get weekly stats (7 days) for graph (FIXED: Date handling)
    static async getWeeklyStats(userId, startDate) {
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        // Format dates as YYYY-MM-DD strings
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Get daily stats from stats table
        const [rows] = await db.query(
            `SELECT * FROM hydration_activity_stats 
             WHERE user_id = ? AND stats_date BETWEEN ? AND ?
             ORDER BY stats_date ASC`,
            [userId, startDateStr, endDateStr]
        );

        // Fill in missing dates
        const result = [];
        const goal = await this.getGoal(userId);
        const dailyTarget = goal?.daily_target_ml || 2500;

        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayData = rows.find(r => {
                const rowDate = r.stats_date instanceof Date 
                    ? r.stats_date.toISOString().split('T')[0] 
                    : r.stats_date;
                return rowDate === dateStr;
            });
            
            result.push({
                date: dateStr,
                day_name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                total_ml: dayData?.total_ml || 0,
                total_entries: dayData?.total_entries || 0,
                daily_target: dailyTarget,
                percentage: Math.min(Math.floor(((dayData?.total_ml || 0) / dailyTarget) * 100), 100),
                breakdown: {
                    water: dayData?.water_ml || 0,
                    sports_drink: dayData?.sports_drink_ml || 0,
                    juice: dayData?.juice_ml || 0,
                    tea: dayData?.tea_ml || 0,
                    coffee: dayData?.coffee_ml || 0,
                    milk: dayData?.milk_ml || 0,
                    soda: dayData?.soda_ml || 0,
                    other: dayData?.other_ml || 0
                }
            });
        }

        return result;
    }

    // Rest of the methods remain the same...
    static async getMonthlyStats(userId, year, month) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const [rows] = await db.query(
            `SELECT stats_date, total_ml, total_entries, water_ml, sports_drink_ml,
                    juice_ml, tea_ml, coffee_ml, milk_ml, soda_ml, other_ml
             FROM hydration_activity_stats 
             WHERE user_id = ? AND stats_date BETWEEN ? AND ?
             ORDER BY stats_date ASC`,
            [userId, startDateStr, endDateStr]
        );

        const goal = await this.getGoal(userId);
        const dailyTarget = goal?.daily_target_ml || 2500;

        return rows.map(row => ({
            date: row.stats_date,
            total_ml: row.total_ml || 0,
            total_entries: row.total_entries || 0,
            percentage: Math.min(Math.floor(((row.total_ml || 0) / dailyTarget) * 100), 100),
            breakdown: {
                water: row.water_ml || 0,
                sports_drink: row.sports_drink_ml || 0,
                juice: row.juice_ml || 0,
                tea: row.tea_ml || 0,
                coffee: row.coffee_ml || 0,
                milk: row.milk_ml || 0,
                soda: row.soda_ml || 0,
                other: row.other_ml || 0
            }
        }));
    }

    static async getDrinkTypeDistribution(userId, startDate, endDate) {
        const [rows] = await db.query(
            `SELECT 
                drink_type,
                SUM(amount_ml) as total_ml,
                COUNT(*) as entry_count
             FROM hydration_activity_logs
             WHERE user_id = ? AND DATE(log_date) BETWEEN ? AND ?
             GROUP BY drink_type
             ORDER BY total_ml DESC`,
            [userId, startDate, endDate]
        );

        const drinkTypes = this.getDrinkTypes();
        const drinkTypeMap = {};
        drinkTypes.forEach(dt => {
            drinkTypeMap[dt.value] = dt;
        });

        return rows.map(row => ({
            drink_type: row.drink_type,
            label: drinkTypeMap[row.drink_type]?.label || row.drink_type,
            color: drinkTypeMap[row.drink_type]?.color || '#6B7280',
            icon: drinkTypeMap[row.drink_type]?.icon || 'local_drink',
            total_ml: row.total_ml,
            entry_count: row.entry_count,
            percentage: 0
        }));
    }

    static async getHourlyDistribution(userId, date) {
        const [rows] = await db.query(
            `SELECT 
                HOUR(consumption_time) as hour,
                SUM(amount_ml) as total_ml,
                COUNT(*) as entry_count
             FROM hydration_activity_logs
             WHERE user_id = ? AND DATE(log_date) = ?
             GROUP BY HOUR(consumption_time)
             ORDER BY hour ASC`,
            [userId, date]
        );

        const hourlyData = [];
        for (let i = 0; i < 24; i++) {
            const hourData = rows.find(r => r.hour === i);
            hourlyData.push({
                hour: i,
                label: `${i.toString().padStart(2, '0')}:00`,
                total_ml: hourData?.total_ml || 0,
                entry_count: hourData?.entry_count || 0
            });
        }

        return hourlyData;
    }

    static async getSummaryStats(userId, period = 'week') {
        let startDate, endDate = new Date();
        const todayStr = endDate.toISOString().split('T')[0];
        
        switch(period) {
            case 'today':
                startDate = endDate;
                break;
            case 'week':
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const [rows] = await db.query(
            `SELECT 
                COUNT(*) as total_entries,
                SUM(amount_ml) as total_ml,
                AVG(amount_ml) as avg_per_entry,
                COUNT(DISTINCT DATE(log_date)) as days_with_data
             FROM hydration_activity_logs
             WHERE user_id = ? AND DATE(log_date) BETWEEN ? AND ?`,
            [userId, startDateStr, endDateStr]
        );

        const goal = await this.getGoal(userId);
        const dailyTarget = goal?.daily_target_ml || 2500;

        const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const avgDaily = rows[0].total_ml / daysInPeriod;

        return {
            period,
            start_date: startDateStr,
            end_date: endDateStr,
            total_entries: rows[0].total_entries || 0,
            total_ml: rows[0].total_ml || 0,
            avg_daily_ml: Math.round(avgDaily),
            avg_per_entry: Math.round(rows[0].avg_per_entry || 0),
            days_with_data: rows[0].days_with_data || 0,
            daily_target: dailyTarget,
            achievement_percentage: Math.min(Math.floor((avgDaily / dailyTarget) * 100), 100)
        };
    }

    static async getTrends(userId, weeks = 12) {
        const [rows] = await db.query(
            `SELECT 
                DATE(log_date) as date,
                SUM(amount_ml) as total_ml,
                COUNT(*) as entry_count,
                SUM(CASE WHEN drink_type = 'water' THEN amount_ml ELSE 0 END) as water_ml,
                SUM(CASE WHEN drink_type != 'water' THEN amount_ml ELSE 0 END) as other_ml
             FROM hydration_activity_logs
             WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
             GROUP BY DATE(log_date)
             ORDER BY date ASC`,
            [userId, weeks]
        );

        const goal = await this.getGoal(userId);
        const dailyTarget = goal?.daily_target_ml || 2500;

        return rows.map(row => ({
            date: row.date,
            total_ml: row.total_ml,
            entry_count: row.entry_count,
            water_ml: row.water_ml,
            other_ml: row.other_ml,
            percentage: Math.min(Math.floor((row.total_ml / dailyTarget) * 100), 100),
            target_ml: dailyTarget
        }));
    }
}

module.exports = HydrationActivity;