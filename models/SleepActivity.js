// models/SleepActivity.js
const db = require('../config/db');

class SleepActivity {
    // Calculate total hours between bedtime and wake time (handles overnight sleep)
    static calculateTotalHours(bedtime, wake_time) {
        try {
            // Parse time strings (format: "HH:MM:SS" or "HH:MM")
            const parseTimeToMinutes = (timeStr) => {
                const parts = timeStr.split(':');
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);
                return (hours * 60) + minutes;
            };
            
            const bedtimeMinutes = parseTimeToMinutes(bedtime);
            const wakeTimeMinutes = parseTimeToMinutes(wake_time);
            
            let totalMinutes;
            if (wakeTimeMinutes > bedtimeMinutes) {
                // Wake time is later on the same day
                totalMinutes = wakeTimeMinutes - bedtimeMinutes;
            } else {
                // Overnight sleep (wake time is next day)
                totalMinutes = (24 * 60 - bedtimeMinutes) + wakeTimeMinutes;
            }
            
            const totalHours = totalMinutes / 60;
            
            // Round to 2 decimal places
            const rounded = Math.round(totalHours * 100) / 100;
            
            return isNaN(rounded) ? 0 : rounded;
        } catch (error) {
            console.error('Error calculating total hours:', error);
            return 0;
        }
    }

    // Create or update sleep log for a specific date
    static async createOrUpdate(userId, data) {
        const {
            bedtime,
            wake_time,
            interruptions = 0,
            sleep_quality,
            sleep_date,
            notes = null
        } = data;

        // Validate sleep quality
        const validQualities = ['Poor', 'Fair', 'Good', 'Excellent'];
        if (!validQualities.includes(sleep_quality)) {
            throw new Error('Invalid sleep quality. Must be Poor, Fair, Good, or Excellent');
        }

        // Calculate total hours
        const total_hours = this.calculateTotalHours(bedtime, wake_time);

        // Check if log exists for this date
        const [existing] = await db.query(
            `SELECT id FROM sleep_activity_logs WHERE user_id = ? AND sleep_date = ?`,
            [userId, sleep_date]
        );

        if (existing.length > 0) {
            // Update existing log
            await db.query(
                `UPDATE sleep_activity_logs 
                 SET bedtime = ?, wake_time = ?, interruptions = ?, 
                     sleep_quality = ?, notes = ?, total_hours = ?
                 WHERE user_id = ? AND sleep_date = ?`,
                [bedtime, wake_time, interruptions, sleep_quality, notes, total_hours, userId, sleep_date]
            );
            
            // Update weekly stats
            const sleepDateObj = new Date(sleep_date);
            const weekStart = new Date(sleepDateObj);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            await this.updateWeeklyStats(userId, weekStart);
            
            return { id: existing[0].id, message: 'Sleep log updated successfully' };
        } else {
            // Insert new log
            const [result] = await db.query(
                `INSERT INTO sleep_activity_logs 
                 (user_id, bedtime, wake_time, interruptions, sleep_quality, sleep_date, notes, total_hours)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [userId, bedtime, wake_time, interruptions, sleep_quality, sleep_date, notes, total_hours]
            );
            
            // Update weekly stats
            const sleepDateObj = new Date(sleep_date);
            const weekStart = new Date(sleepDateObj);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            await this.updateWeeklyStats(userId, weekStart);
            
            return { id: result.insertId, message: 'Sleep log created successfully' };
        }
    }

    // Get sleep log by ID
    static async getById(id, userId) {
        const [rows] = await db.query(
            `SELECT id, user_id, bedtime, wake_time, interruptions, sleep_quality, 
                    sleep_date, total_hours, notes, created_at, updated_at
             FROM sleep_activity_logs
             WHERE id = ? AND user_id = ?`,
            [id, userId]
        );
        return rows[0];
    }

    // Get sleep log for specific date
    static async getByDate(userId, sleepDate) {
        const [rows] = await db.query(
            `SELECT id, user_id, bedtime, wake_time, interruptions, sleep_quality, 
                    sleep_date, total_hours, notes, created_at, updated_at
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date = ?`,
            [userId, sleepDate]
        );
        return rows[0];
    }

    // Get sleep logs for date range
    static async getByDateRange(userId, startDate, endDate, limit = null, offset = null) {
        let query = `
            SELECT id, user_id, bedtime, wake_time, interruptions, sleep_quality, 
                   sleep_date, total_hours, notes, DATE_FORMAT(sleep_date, '%Y-%m-%d') as sleep_date_formatted,
                   created_at, updated_at
            FROM sleep_activity_logs
            WHERE user_id = ? AND sleep_date BETWEEN ? AND ?
            ORDER BY sleep_date DESC
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

    // Delete sleep log
    static async delete(userId, sleepDate) {
        const [result] = await db.query(
            `DELETE FROM sleep_activity_logs WHERE user_id = ? AND sleep_date = ?`,
            [userId, sleepDate]
        );
        
        // Update weekly stats after deletion
        if (result.affectedRows > 0) {
            const sleepDateObj = new Date(sleepDate);
            const weekStart = new Date(sleepDateObj);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            await this.updateWeeklyStats(userId, weekStart);
        }
        
        return result.affectedRows > 0;
    }

    // Get weekly stats by day of week
    static async getWeeklyStatsByDay(userId, startDate, endDate) {
        const [rows] = await db.query(
            `SELECT 
                DAYOFWEEK(sleep_date) as day_of_week,
                DATE_FORMAT(sleep_date, '%W') as day_name,
                COUNT(*) as log_count,
                ROUND(AVG(total_hours), 2) as avg_hours,
                ROUND(AVG(interruptions), 1) as avg_interruptions,
                SUM(CASE WHEN sleep_quality = 'Excellent' THEN 1 ELSE 0 END) as excellent_count,
                SUM(CASE WHEN sleep_quality = 'Good' THEN 1 ELSE 0 END) as good_count,
                SUM(CASE WHEN sleep_quality = 'Fair' THEN 1 ELSE 0 END) as fair_count,
                SUM(CASE WHEN sleep_quality = 'Poor' THEN 1 ELSE 0 END) as poor_count
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?
             GROUP BY DAYOFWEEK(sleep_date), DATE_FORMAT(sleep_date, '%W')
             ORDER BY DAYOFWEEK(sleep_date)`,
            [userId, startDate, endDate]
        );
        return rows;
    }

    // Get daily stats for chart (last N days)
    static async getDailyStatsForChart(userId, days = 30) {
        const [rows] = await db.query(
            `SELECT 
                sleep_date,
                DATE_FORMAT(sleep_date, '%a, %b %d') as formatted_date,
                total_hours,
                interruptions,
                sleep_quality,
                bedtime,
                wake_time
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY sleep_date ASC`,
            [userId, days]
        );
        return rows;
    }

    // Get summary stats for a date range
    static async getSummaryStats(userId, startDate, endDate) {
        const [rows] = await db.query(
            `SELECT 
                COUNT(*) as total_logs,
                ROUND(AVG(total_hours), 2) as avg_hours,
                ROUND(AVG(interruptions), 1) as avg_interruptions,
                MIN(total_hours) as min_hours,
                MAX(total_hours) as max_hours,
                SUM(CASE WHEN sleep_quality = 'Excellent' THEN 1 ELSE 0 END) as excellent_count,
                SUM(CASE WHEN sleep_quality = 'Good' THEN 1 ELSE 0 END) as good_count,
                SUM(CASE WHEN sleep_quality = 'Fair' THEN 1 ELSE 0 END) as fair_count,
                SUM(CASE WHEN sleep_quality = 'Poor' THEN 1 ELSE 0 END) as poor_count
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?`,
            [userId, startDate, endDate]
        );
        
        // Get most common quality separately
        const [qualityResult] = await db.query(
            `SELECT sleep_quality, COUNT(*) as count
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?
             GROUP BY sleep_quality
             ORDER BY count DESC
             LIMIT 1`,
            [userId, startDate, endDate]
        );
        
        const result = rows[0];
        result.most_common_quality = qualityResult[0]?.sleep_quality || null;
        
        return result;
    }

    // Get weekly comparison (current week vs previous week)
    static async getWeeklyComparison(userId, currentStartDate, currentEndDate, previousStartDate, previousEndDate) {
        const [current] = await db.query(
            `SELECT 
                ROUND(AVG(total_hours), 2) as avg_hours,
                ROUND(AVG(interruptions), 1) as avg_interruptions,
                COUNT(*) as total_logs
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?`,
            [userId, currentStartDate, currentEndDate]
        );

        const [previous] = await db.query(
            `SELECT 
                ROUND(AVG(total_hours), 2) as avg_hours,
                ROUND(AVG(interruptions), 1) as avg_interruptions,
                COUNT(*) as total_logs
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?`,
            [userId, previousStartDate, previousEndDate]
        );

        return {
            current: current[0] || { avg_hours: 0, avg_interruptions: 0, total_logs: 0 },
            previous: previous[0] || { avg_hours: 0, avg_interruptions: 0, total_logs: 0 }
        };
    }

    // Update or create weekly stats (for performance optimization)
    static async updateWeeklyStats(userId, weekStartDate) {
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        const weekStartStr = weekStartDate.toISOString().split('T')[0];
        const weekEndStr = weekEndDate.toISOString().split('T')[0];

        // Get most common bedtime and waketime for the week
        const [bedtimeResult] = await db.query(
            `SELECT bedtime, COUNT(*) as count
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?
             GROUP BY bedtime
             ORDER BY count DESC
             LIMIT 1`,
            [userId, weekStartStr, weekEndStr]
        );
        
        const [waketimeResult] = await db.query(
            `SELECT wake_time, COUNT(*) as count
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?
             GROUP BY wake_time
             ORDER BY count DESC
             LIMIT 1`,
            [userId, weekStartStr, weekEndStr]
        );

        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as total_logs,
                ROUND(AVG(total_hours), 2) as avg_total_hours,
                ROUND(AVG(interruptions), 1) as avg_interruptions,
                SUM(CASE WHEN sleep_quality = 'Excellent' THEN 1 ELSE 0 END) as excellent_count,
                SUM(CASE WHEN sleep_quality = 'Good' THEN 1 ELSE 0 END) as good_count,
                SUM(CASE WHEN sleep_quality = 'Fair' THEN 1 ELSE 0 END) as fair_count,
                SUM(CASE WHEN sleep_quality = 'Poor' THEN 1 ELSE 0 END) as poor_count
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?`,
            [userId, weekStartStr, weekEndStr]
        );

        const data = stats[0];
        
        await db.query(
            `INSERT INTO sleep_activity_stats 
             (user_id, stats_week, avg_bedtime, avg_waketime, avg_total_hours, 
              avg_interruptions, total_logs, excellent_count, good_count, fair_count, poor_count)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             avg_bedtime = VALUES(avg_bedtime),
             avg_waketime = VALUES(avg_waketime),
             avg_total_hours = VALUES(avg_total_hours),
             avg_interruptions = VALUES(avg_interruptions),
             total_logs = VALUES(total_logs),
             excellent_count = VALUES(excellent_count),
             good_count = VALUES(good_count),
             fair_count = VALUES(fair_count),
             poor_count = VALUES(poor_count),
             updated_at = CURRENT_TIMESTAMP`,
            [
                userId, weekStartStr, 
                bedtimeResult[0]?.bedtime || null, 
                waketimeResult[0]?.wake_time || null,
                data.avg_total_hours || 0, 
                data.avg_interruptions || 0,
                data.total_logs || 0, 
                data.excellent_count || 0,
                data.good_count || 0, 
                data.fair_count || 0, 
                data.poor_count || 0
            ]
        );
    }

    // Get trend data for the last N weeks
    static async getTrendData(userId, weeks = 12) {
        const [rows] = await db.query(
            `SELECT 
                stats_week,
                DATE_FORMAT(stats_week, '%b %d') as week_label,
                avg_total_hours,
                avg_interruptions,
                total_logs,
                excellent_count,
                good_count,
                fair_count,
                poor_count
             FROM sleep_activity_stats
             WHERE user_id = ? AND stats_week >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
             ORDER BY stats_week ASC`,
            [userId, weeks]
        );
        return rows;
    }

    // Get bedtime consistency (standard deviation of bedtime)
    static async getBedtimeConsistency(userId, startDate, endDate) {
        const [rows] = await db.query(
            `SELECT 
                STD(TIME_TO_SEC(bedtime)) as bedtime_stddev,
                STD(TIME_TO_SEC(wake_time)) as waketime_stddev,
                VARIANCE(TIME_TO_SEC(bedtime)) as bedtime_variance
             FROM sleep_activity_logs
             WHERE user_id = ? AND sleep_date BETWEEN ? AND ?`,
            [userId, startDate, endDate]
        );
        
        const stddev = rows[0].bedtime_stddev;
        const consistency = stddev ? Math.max(0, 100 - (stddev / 3600 * 100)) : 100;
        
        return {
            consistency_percentage: Math.round(Math.min(100, consistency)),
            bedtime_variance_minutes: Math.round(rows[0].bedtime_variance / 60) || 0,
            has_data: rows[0].bedtime_stddev !== null
        };
    }
}

module.exports = SleepActivity;