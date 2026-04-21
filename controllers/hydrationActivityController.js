// controllers/hydrationActivityController.js
const HydrationActivity = require('../models/HydrationActivity');

class HydrationActivityController {
    // Get drink types (for frontend dropdown)
    static async getDrinkTypes(req, res) {
        try {
            const types = HydrationActivity.getDrinkTypes();
            res.json(types);
        } catch (err) {
            console.error('Get drink types error:', err);
            res.status(500).json({ message: 'Failed to fetch drink types' });
        }
    }

    // Get preset amounts (for frontend buttons)
    static async getPresetAmounts(req, res) {
        try {
            const amounts = HydrationActivity.getPresetAmounts();
            res.json(amounts);
        } catch (err) {
            console.error('Get preset amounts error:', err);
            res.status(500).json({ message: 'Failed to fetch preset amounts' });
        }
    }

    // ===== GOAL MANAGEMENT =====
    
    static async setGoal(req, res) {
        try {
            const { daily_target_ml } = req.body;

            if (!daily_target_ml || daily_target_ml <= 0) {
                return res.status(400).json({ message: 'Invalid daily target. Must be greater than 0.' });
            }

            if (daily_target_ml > 10000) {
                return res.status(400).json({ message: 'Daily target cannot exceed 10000ml (10L).' });
            }

            const result = await HydrationActivity.setGoal(req.user.id, daily_target_ml);
            res.json(result);
        } catch (err) {
            console.error('Set hydration goal error:', err);
            res.status(500).json({ message: 'Failed to set hydration goal' });
        }
    }

    static async getGoal(req, res) {
        try {
            const goal = await HydrationActivity.getGoal(req.user.id);
            
            if (!goal) {
                return res.status(404).json({ message: 'No hydration goal set' });
            }

            res.json(goal);
        } catch (err) {
            console.error('Get hydration goal error:', err);
            res.status(500).json({ message: 'Failed to fetch hydration goal' });
        }
    }

    static async deleteGoal(req, res) {
        try {
            const result = await HydrationActivity.deleteGoal(req.user.id);
            res.json(result);
        } catch (err) {
            console.error('Delete hydration goal error:', err);
            res.status(500).json({ message: 'Failed to delete hydration goal' });
        }
    }

    // ===== HYDRATION LOGGING =====

    static async logHydration(req, res) {
        try {
            const {
                amount_ml,
                drink_type,
                custom_drink_name,
                consumption_time,
                log_date,
                notes
            } = req.body;

            // Validate required fields
            if (!amount_ml) {
                return res.status(400).json({ message: 'Amount is required' });
            }
            if (!drink_type) {
                return res.status(400).json({ message: 'Drink type is required' });
            }
            if (!consumption_time) {
                return res.status(400).json({ message: 'Consumption time is required' });
            }
            if (!log_date) {
                return res.status(400).json({ message: 'Log date is required' });
            }

            // Validate amount range
            if (amount_ml < 50 || amount_ml > 5000) {
                return res.status(400).json({ message: 'Amount must be between 50ml and 5000ml' });
            }

            const result = await HydrationActivity.logHydration(req.user.id, {
                amount_ml,
                drink_type,
                custom_drink_name,
                consumption_time,
                log_date,
                notes
            });

            res.status(201).json({
                message: result.message,
                log_id: result.id
            });
        } catch (err) {
            console.error('Log hydration error:', err);
            res.status(500).json({ message: err.message || 'Failed to log hydration' });
        }
    }

    // ===== GET LOGS =====

    static async getByDate(req, res) {
        try {
            const { date } = req.params;
            
            if (!date) {
                return res.status(400).json({ message: 'Date parameter is required' });
            }

            const logs = await HydrationActivity.getByDate(req.user.id, date);
            res.json(logs);
        } catch (err) {
            console.error('Get hydration logs error:', err);
            res.status(500).json({ message: 'Failed to fetch hydration logs' });
        }
    }

    static async getByDateRange(req, res) {
        try {
            const { start_date, end_date, limit, offset } = req.query;
            
            if (!start_date || !end_date) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const logs = await HydrationActivity.getByDateRange(
                req.user.id,
                start_date,
                end_date,
                limit ? parseInt(limit) : null,
                offset ? parseInt(offset) : null
            );

            res.json({
                total: logs.length,
                logs
            });
        } catch (err) {
            console.error('Get hydration range error:', err);
            res.status(500).json({ message: 'Failed to fetch hydration logs' });
        }
    }

    static async getLogById(req, res) {
        try {
            const { id } = req.params;
            const log = await HydrationActivity.getById(id, req.user.id);
            
            if (!log) {
                return res.status(404).json({ message: 'Hydration log not found' });
            }

            res.json(log);
        } catch (err) {
            console.error('Get hydration log error:', err);
            res.status(500).json({ message: 'Failed to fetch hydration log' });
        }
    }

    // ===== UPDATE/DELETE =====

    static async updateLog(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            await HydrationActivity.updateLog(id, req.user.id, updateData);
            
            res.json({ message: 'Hydration log updated successfully' });
        } catch (err) {
            console.error('Update hydration log error:', err);
            res.status(500).json({ message: err.message || 'Failed to update hydration log' });
        }
    }

    static async deleteLog(req, res) {
        try {
            const { id } = req.params;
            await HydrationActivity.deleteLog(id, req.user.id);
            res.json({ message: 'Hydration log deleted successfully' });
        } catch (err) {
            console.error('Delete hydration log error:', err);
            res.status(500).json({ message: err.message || 'Failed to delete hydration log' });
        }
    }

    // ===== STATISTICS & ANALYTICS =====

    static async getDailyStats(req, res) {
        try {
            const { date } = req.query;
            
            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            const stats = await HydrationActivity.getDailyStats(req.user.id, date);
            res.json(stats);
        } catch (err) {
            console.error('Get daily stats error:', err);
            res.status(500).json({ message: 'Failed to fetch daily stats' });
        }
    }

    static async getWeeklyStats(req, res) {
        try {
            const { start_date } = req.query;
            
            if (!start_date) {
                return res.status(400).json({ message: 'Start date is required' });
            }

            const startDate = new Date(start_date);
            const stats = await HydrationActivity.getWeeklyStats(req.user.id, startDate);
            
            // Calculate weekly total and average
            const weeklyTotal = stats.reduce((sum, day) => sum + day.total_ml, 0);
            const weeklyAverage = Math.round(weeklyTotal / 7);
            const goal = await HydrationActivity.getGoal(req.user.id);
            
            res.json({
                weekly_data: stats,
                weekly_total_ml: weeklyTotal,
                weekly_average_ml: weeklyAverage,
                daily_target: goal?.daily_target_ml || 2500,
                weekly_achievement: Math.min(Math.floor((weeklyAverage / (goal?.daily_target_ml || 2500)) * 100), 100)
            });
        } catch (err) {
            console.error('Get weekly stats error:', err);
            res.status(500).json({ message: 'Failed to fetch weekly stats' });
        }
    }

    static async getMonthlyStats(req, res) {
        try {
            const { year, month } = req.query;
            
            if (!year || !month) {
                return res.status(400).json({ message: 'Year and month are required' });
            }

            const stats = await HydrationActivity.getMonthlyStats(req.user.id, parseInt(year), parseInt(month));
            
            const monthlyTotal = stats.reduce((sum, day) => sum + day.total_ml, 0);
            const daysInMonth = new Date(year, month, 0).getDate();
            const monthlyAverage = Math.round(monthlyTotal / daysInMonth);
            const goal = await HydrationActivity.getGoal(req.user.id);
            
            res.json({
                monthly_data: stats,
                monthly_total_ml: monthlyTotal,
                monthly_average_ml: monthlyAverage,
                daily_target: goal?.daily_target_ml || 2500,
                month_achievement: Math.min(Math.floor((monthlyAverage / (goal?.daily_target_ml || 2500)) * 100), 100),
                days_with_data: stats.filter(day => day.total_ml > 0).length,
                total_days: daysInMonth
            });
        } catch (err) {
            console.error('Get monthly stats error:', err);
            res.status(500).json({ message: 'Failed to fetch monthly stats' });
        }
    }

    static async getDrinkTypeDistribution(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            if (!start_date || !end_date) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const distribution = await HydrationActivity.getDrinkTypeDistribution(
                req.user.id,
                start_date,
                end_date
            );
            
            // Calculate percentages
            const total = distribution.reduce((sum, item) => sum + item.total_ml, 0);
            const distributionWithPercentage = distribution.map(item => ({
                ...item,
                percentage: total > 0 ? Math.round((item.total_ml / total) * 100) : 0
            }));
            
            res.json(distributionWithPercentage);
        } catch (err) {
            console.error('Get drink type distribution error:', err);
            res.status(500).json({ message: 'Failed to fetch drink type distribution' });
        }
    }

    static async getHourlyDistribution(req, res) {
        try {
            const { date } = req.query;
            
            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            const distribution = await HydrationActivity.getHourlyDistribution(req.user.id, date);
            res.json(distribution);
        } catch (err) {
            console.error('Get hourly distribution error:', err);
            res.status(500).json({ message: 'Failed to fetch hourly distribution' });
        }
    }

    static async getSummaryStats(req, res) {
        try {
            const { period = 'week' } = req.query;
            const validPeriods = ['today', 'week', 'month'];
            
            if (!validPeriods.includes(period)) {
                return res.status(400).json({ message: 'Invalid period. Use today, week, or month' });
            }

            const stats = await HydrationActivity.getSummaryStats(req.user.id, period);
            res.json(stats);
        } catch (err) {
            console.error('Get summary stats error:', err);
            res.status(500).json({ message: 'Failed to fetch summary statistics' });
        }
    }

    static async getTrends(req, res) {
        try {
            const { weeks = 12 } = req.query;
            
            const trends = await HydrationActivity.getTrends(req.user.id, parseInt(weeks));
            
            res.json({
                weeks: weeks,
                data: trends,
                summary: {
                    total_ml: trends.reduce((sum, day) => sum + day.total_ml, 0),
                    avg_daily_ml: Math.round(trends.reduce((sum, day) => sum + day.total_ml, 0) / trends.length) || 0,
                    best_day: trends.reduce((best, day) => day.total_ml > best.total_ml ? day : best, { total_ml: 0 }),
                    water_percentage: trends.length > 0 
                        ? Math.round((trends.reduce((sum, day) => sum + day.water_ml, 0) / trends.reduce((sum, day) => sum + day.total_ml, 0)) * 100)
                        : 0
                }
            });
        } catch (err) {
            console.error('Get trends error:', err);
            res.status(500).json({ message: 'Failed to fetch trend data' });
        }
    }

    // Dashboard overview (combines today's stats and weekly chart data)
    static async getDashboard(req, res) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            const weekStartStr = weekStart.toISOString().split('T')[0];

            const [todayStats, weeklyStats, goal, drinkTypes] = await Promise.all([
                HydrationActivity.getDailyStats(req.user.id, today),
                HydrationActivity.getWeeklyStats(req.user.id, weekStart),
                HydrationActivity.getGoal(req.user.id),
                HydrationActivity.getDrinkTypeDistribution(req.user.id, weekStartStr, today)
            ]);

            res.json({
                today: todayStats,
                weekly: weeklyStats,
                goal: goal || { daily_target_ml: 2500 },
                drink_type_distribution: drinkTypes,
                recommendations: this.generateRecommendations(todayStats, weeklyStats, goal)
            });
        } catch (err) {
            console.error('Get dashboard error:', err);
            res.status(500).json({ message: 'Failed to fetch dashboard data' });
        }
    }

    // Helper method for recommendations
    static generateRecommendations(todayStats, weeklyStats, goal) {
        const recommendations = [];
        const dailyTarget = goal?.daily_target_ml || 2500;

        if (todayStats.total_ml < dailyTarget) {
            const remaining = dailyTarget - todayStats.total_ml;
            recommendations.push({
                type: 'hydration_reminder',
                message: `You need ${remaining}ml more to reach today's hydration goal.`,
                priority: 'high'
            });
        }

        if (todayStats.total_ml === 0) {
            recommendations.push({
                type: 'start_hydrating',
                message: "You haven't logged any hydration today. Start with a glass of water!",
                priority: 'high'
            });
        }

        const weeklyAverage = weeklyStats.weekly_average_ml || 0;
        if (weeklyAverage < dailyTarget && weeklyStats.weekly_data?.length >= 5) {
            recommendations.push({
                type: 'weekly_improvement',
                message: `Your average daily intake this week is ${weeklyAverage}ml. Try to increase it to ${dailyTarget}ml.`,
                priority: 'medium'
            });
        }

        return recommendations;
    }
}

module.exports = HydrationActivityController;