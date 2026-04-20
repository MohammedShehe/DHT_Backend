// controllers/sleepActivityController.js
const SleepActivity = require('../models/SleepActivity');

class SleepActivityController {
    // Create or update sleep log
    static async logSleep(req, res) {
        try {
            const {
                bedtime,
                wake_time,
                interruptions = 0,
                sleep_quality,
                sleep_date,
                notes
            } = req.body;

            // Validate required fields
            if (!bedtime || !wake_time || !sleep_quality || !sleep_date) {
                return res.status(400).json({ 
                    message: 'Bedtime, wake time, sleep quality, and sleep date are required' 
                });
            }

            // Validate bedtime and wake_time format (HH:MM:SS or HH:MM)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
            if (!timeRegex.test(bedtime) || !timeRegex.test(wake_time)) {
                return res.status(400).json({ 
                    message: 'Invalid time format. Use HH:MM or HH:MM:SS' 
                });
            }

            // Validate interruptions
            if (interruptions < 0) {
                return res.status(400).json({ message: 'Interruptions cannot be negative' });
            }

            // Validate sleep date
            const sleepDateObj = new Date(sleep_date);
            if (isNaN(sleepDateObj.getTime())) {
                return res.status(400).json({ message: 'Invalid sleep date format' });
            }

            // Validate sleep quality
            const validQualities = ['Poor', 'Fair', 'Good', 'Excellent'];
            if (!validQualities.includes(sleep_quality)) {
                return res.status(400).json({ 
                    message: 'Invalid sleep quality. Must be Poor, Fair, Good, or Excellent' 
                });
            }

            const result = await SleepActivity.createOrUpdate(req.user.id, {
                bedtime,
                wake_time,
                interruptions: parseInt(interruptions),
                sleep_quality,
                sleep_date,
                notes: notes || null
            });

            // Update weekly stats for the week containing this date
            const weekStart = new Date(sleepDateObj);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            await SleepActivity.updateWeeklyStats(req.user.id, weekStart);

            res.status(201).json({
                message: result.message,
                sleep_log: await SleepActivity.getByDate(req.user.id, sleep_date)
            });

        } catch (err) {
            console.error('Log sleep error:', err);
            res.status(500).json({ message: err.message || 'Failed to log sleep activity' });
        }
    }

    // Get sleep log for a specific date
    static async getByDate(req, res) {
        try {
            const { date } = req.params;
            
            if (!date) {
                return res.status(400).json({ message: 'Date parameter is required' });
            }

            const sleepLog = await SleepActivity.getByDate(req.user.id, date);
            
            if (!sleepLog) {
                return res.status(404).json({ message: 'No sleep log found for this date' });
            }

            res.json(sleepLog);

        } catch (err) {
            console.error('Get sleep log error:', err);
            res.status(500).json({ message: 'Failed to fetch sleep log' });
        }
    }

    // Get sleep logs for date range
    static async getByDateRange(req, res) {
        try {
            const { start_date, end_date, limit, offset } = req.query;
            
            if (!start_date || !end_date) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const logs = await SleepActivity.getByDateRange(
                req.user.id, 
                start_date, 
                end_date,
                limit ? parseInt(limit) : null,
                offset ? parseInt(offset) : null
            );

            res.json({
                total: logs.length,
                logs: logs
            });

        } catch (err) {
            console.error('Get sleep logs range error:', err);
            res.status(500).json({ message: 'Failed to fetch sleep logs' });
        }
    }

    // Delete sleep log
    static async deleteSleepLog(req, res) {
        try {
            const { date } = req.params;
            
            if (!date) {
                return res.status(400).json({ message: 'Date parameter is required' });
            }

            const deleted = await SleepActivity.delete(req.user.id, date);
            
            if (!deleted) {
                return res.status(404).json({ message: 'No sleep log found for this date' });
            }

            // Update weekly stats
            const sleepDateObj = new Date(date);
            const weekStart = new Date(sleepDateObj);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            await SleepActivity.updateWeeklyStats(req.user.id, weekStart);

            res.json({ message: 'Sleep log deleted successfully' });

        } catch (err) {
            console.error('Delete sleep log error:', err);
            res.status(500).json({ message: 'Failed to delete sleep log' });
        }
    }

    // Get weekly stats by day of week (for graph)
    static async getWeeklyStatsByDay(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            if (!start_date || !end_date) {
                return res.status(400).json({ message: 'Start date and end date are required' });
            }

            const stats = await SleepActivity.getWeeklyStatsByDay(req.user.id, start_date, end_date);
            
            // Format for chart display
            const formattedStats = stats.map(stat => ({
                day_of_week: stat.day_of_week,
                day_name: stat.day_name,
                avg_hours: parseFloat(stat.avg_hours) || 0,
                avg_interruptions: parseFloat(stat.avg_interruptions) || 0,
                quality_distribution: {
                    excellent: stat.excellent_count || 0,
                    good: stat.good_count || 0,
                    fair: stat.fair_count || 0,
                    poor: stat.poor_count || 0
                },
                most_common_bedtime: stat.most_common_bedtime,
                most_common_waketime: stat.most_common_waketime
            }));

            res.json(formattedStats);

        } catch (err) {
            console.error('Get weekly stats error:', err);
            res.status(500).json({ message: 'Failed to fetch weekly sleep statistics' });
        }
    }

    // Get daily stats for chart (last N days)
    static async getDailyChartData(req, res) {
        try {
            const { days = 30 } = req.query;
            
            const data = await SleepActivity.getDailyStatsForChart(req.user.id, parseInt(days));
            
            const chartData = {
                labels: data.map(d => d.formatted_date),
                datasets: {
                    hours: data.map(d => parseFloat(d.total_hours) || 0),
                    interruptions: data.map(d => d.interruptions || 0),
                    quality: data.map(d => d.sleep_quality)
                },
                raw_data: data
            };

            res.json(chartData);

        } catch (err) {
            console.error('Get chart data error:', err);
            res.status(500).json({ message: 'Failed to fetch chart data' });
        }
    }

    // Get summary statistics
    static async getSummary(req, res) {
        try {
            const { period = 'month' } = req.query;
            
            let startDate, endDate = new Date().toISOString().split('T')[0];
            
            switch(period) {
                case 'week':
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() - 7);
                    startDate = startDate.toISOString().split('T')[0];
                    break;
                case 'month':
                    startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 1);
                    startDate = startDate.toISOString().split('T')[0];
                    break;
                case 'quarter':
                    startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 3);
                    startDate = startDate.toISOString().split('T')[0];
                    break;
                default:
                    startDate = new Date();
                    startDate.setMonth(startDate.getMonth() - 1);
                    startDate = startDate.toISOString().split('T')[0];
            }

            const summary = await SleepActivity.getSummaryStats(req.user.id, startDate, endDate);
            
            // Calculate quality percentages
            const total = summary.total_logs || 1;
            
            res.json({
                period: period,
                start_date: startDate,
                end_date: endDate,
                total_logs: summary.total_logs || 0,
                average_sleep_hours: parseFloat(summary.avg_hours) || 0,
                average_interruptions: parseFloat(summary.avg_interruptions) || 0,
                best_sleep_hours: parseFloat(summary.max_hours) || 0,
                worst_sleep_hours: parseFloat(summary.min_hours) || 0,
                quality_distribution: {
                    excellent: { count: summary.excellent_count || 0, percentage: Math.round((summary.excellent_count || 0) / total * 100) },
                    good: { count: summary.good_count || 0, percentage: Math.round((summary.good_count || 0) / total * 100) },
                    fair: { count: summary.fair_count || 0, percentage: Math.round((summary.fair_count || 0) / total * 100) },
                    poor: { count: summary.poor_count || 0, percentage: Math.round((summary.poor_count || 0) / total * 100) }
                },
                most_common_quality: summary.most_common_quality || 'No data'
            });

        } catch (err) {
            console.error('Get summary error:', err);
            res.status(500).json({ message: 'Failed to fetch summary statistics' });
        }
    }

    // Get weekly comparison
    static async getWeeklyComparison(req, res) {
        try {
            // Current week (last 7 days)
            const currentEnd = new Date();
            const currentStart = new Date();
            currentStart.setDate(currentStart.getDate() - 7);
            
            // Previous week (7-14 days ago)
            const previousEnd = new Date(currentStart);
            const previousStart = new Date(currentStart);
            previousStart.setDate(previousStart.getDate() - 7);
            
            const comparison = await SleepActivity.getWeeklyComparison(
                req.user.id,
                currentStart.toISOString().split('T')[0],
                currentEnd.toISOString().split('T')[0],
                previousStart.toISOString().split('T')[0],
                previousEnd.toISOString().split('T')[0]
            );
            
            // Calculate changes
            const hoursChange = comparison.current.avg_hours - comparison.previous.avg_hours;
            const interruptionsChange = comparison.current.avg_interruptions - comparison.previous.avg_interruptions;
            
            res.json({
                current_week: {
                    avg_hours: parseFloat(comparison.current.avg_hours) || 0,
                    avg_interruptions: parseFloat(comparison.current.avg_interruptions) || 0,
                    total_logs: comparison.current.total_logs || 0
                },
                previous_week: {
                    avg_hours: parseFloat(comparison.previous.avg_hours) || 0,
                    avg_interruptions: parseFloat(comparison.previous.avg_interruptions) || 0,
                    total_logs: comparison.previous.total_logs || 0
                },
                changes: {
                    hours: hoursChange,
                    hours_percentage: comparison.previous.avg_hours ? Math.round((hoursChange / comparison.previous.avg_hours) * 100) : 0,
                    interruptions: interruptionsChange,
                    interruptions_percentage: comparison.previous.avg_interruptions ? Math.round((interruptionsChange / comparison.previous.avg_interruptions) * 100) : 0
                }
            });

        } catch (err) {
            console.error('Get weekly comparison error:', err);
            res.status(500).json({ message: 'Failed to fetch weekly comparison' });
        }
    }

    // Get trend data for graphs
    static async getTrends(req, res) {
        try {
            const { weeks = 12 } = req.query;
            
            const trendData = await SleepActivity.getTrendData(req.user.id, parseInt(weeks));
            
            res.json({
                weeks: trendData.map(t => ({
                    week: t.week_label,
                    avg_hours: parseFloat(t.avg_total_hours) || 0,
                    avg_interruptions: parseFloat(t.avg_interruptions) || 0,
                    total_logs: t.total_logs || 0,
                    quality_counts: {
                        excellent: t.excellent_count || 0,
                        good: t.good_count || 0,
                        fair: t.fair_count || 0,
                        poor: t.poor_count || 0
                    }
                }))
            });

        } catch (err) {
            console.error('Get trends error:', err);
            res.status(500).json({ message: 'Failed to fetch trend data' });
        }
    }

    // Get bedtime consistency score
    static async getConsistency(req, res) {
        try {
            const { days = 30 } = req.query;
            
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));
            const startDateStr = startDate.toISOString().split('T')[0];
            
            const consistency = await SleepActivity.getBedtimeConsistency(
                req.user.id,
                startDateStr,
                endDate
            );
            
            let message = '';
            if (consistency.consistency_percentage >= 80) {
                message = 'Excellent! You have a very consistent sleep schedule.';
            } else if (consistency.consistency_percentage >= 60) {
                message = 'Good consistency. Try to maintain regular bedtimes.';
            } else if (consistency.consistency_percentage >= 40) {
                message = 'Your sleep schedule varies. Consider setting a fixed bedtime.';
            } else {
                message = 'Your sleep schedule is irregular. A consistent bedtime can improve sleep quality.';
            }
            
            res.json({
                consistency_score: consistency.consistency_percentage,
                bedtime_variance_minutes: consistency.bedtime_variance_minutes,
                message: message,
                has_data: consistency.has_data
            });

        } catch (err) {
            console.error('Get consistency error:', err);
            res.status(500).json({ message: 'Failed to fetch consistency data' });
        }
    }

    // Get all available sleep quality types (for frontend dropdown)
    static async getQualityTypes(req, res) {
        try {
            const qualityTypes = [
                { value: 'Poor', label: 'Poor', color: '#EF4444', description: 'Woke up tired, had trouble sleeping' },
                { value: 'Fair', label: 'Fair', color: '#F59E0B', description: 'OK sleep, could be better' },
                { value: 'Good', label: 'Good', color: '#10B981', description: 'Slept well, felt rested' },
                { value: 'Excellent', label: 'Excellent', color: '#3B82F6', description: 'Perfect sleep, woke up refreshed' }
            ];
            
            res.json(qualityTypes);
        } catch (err) {
            console.error('Get quality types error:', err);
            res.status(500).json({ message: 'Failed to fetch quality types' });
        }
    }
}

module.exports = SleepActivityController;