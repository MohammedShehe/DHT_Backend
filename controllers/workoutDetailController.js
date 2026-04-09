const WorkoutDetail = require('../models/WorkoutDetail');
const WorkoutType = require('../models/WorkoutType');
const db = require('../config/db');

class WorkoutDetailController {
    // Get all workout types (predefined + user custom)
    static async getWorkoutTypes(req, res) {
        try {
            const types = await WorkoutType.getAll(req.user.id);
            res.json(types);
        } catch (err) {
            console.error('Get workout types error:', err);
            res.status(500).json({ message: 'Failed to fetch workout types' });
        }
    }

    static async createWorkoutType(req, res) {
        try {
            const { name } = req.body;
            
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Workout type name is required' });
            }

            const existing = await WorkoutType.getByName(name.trim(), req.user.id);
            if (existing) {
                return res.status(400).json({ message: 'Workout type already exists' });
            }

            const id = await WorkoutType.create(name.trim(), req.user.id);
            res.status(201).json({
                message: 'Workout type created successfully',
                workout_type: { id, name, is_custom: true }
            });
        } catch (err) {
            console.error('Create workout type error:', err);
            res.status(500).json({ message: 'Failed to create workout type' });
        }
    }

    static async deleteWorkoutType(req, res) {
        try {
            const { id } = req.params;
            await WorkoutType.delete(id, req.user.id);
            res.json({ message: 'Workout type deleted successfully' });
        } catch (err) {
            console.error('Delete workout type error:', err);
            res.status(500).json({ message: 'Failed to delete workout type' });
        }
    }

    static async logWorkout(req, res) {
        try {
            const {
                workout_type_id,
                custom_workout_name,
                workout_time,
                duration_minutes,
                intensity,
                distance,
                heart_rate,
                feeling,
                notes
            } = req.body;

            if (!workout_time || !duration_minutes || !intensity) {
                return res.status(400).json({ 
                    message: 'Workout time, duration, and intensity are required' 
                });
            }

            if (duration_minutes <= 0 || duration_minutes > 1440) {
                return res.status(400).json({ 
                    message: 'Duration must be between 1 and 1440 minutes' 
                });
            }

            const validIntensities = ['low', 'moderate', 'high', 'very_high'];
            if (!validIntensities.includes(intensity)) {
                return res.status(400).json({ 
                    message: 'Invalid intensity. Allowed: low, moderate, high, very_high' 
                });
            }

            if (feeling) {
                const validFeelings = ['very_bad', 'bad', 'neutral', 'good', 'excellent'];
                if (!validFeelings.includes(feeling)) {
                    return res.status(400).json({ 
                        message: 'Invalid feeling. Allowed: very_bad, bad, neutral, good, excellent' 
                    });
                }
            }

            if (heart_rate && (heart_rate < 30 || heart_rate > 250)) {
                return res.status(400).json({ 
                    message: 'Heart rate must be between 30 and 250' 
                });
            }

            if (distance && distance < 0) {
                return res.status(400).json({ 
                    message: 'Distance cannot be negative' 
                });
            }

            // Parse workout_time and convert to local date for storage
            let workoutDate;
            try {
                const parsedTime = new Date(workout_time);
                // Store as local date without timezone conversion
                workoutDate = new Date(
                    parsedTime.getFullYear(),
                    parsedTime.getMonth(),
                    parsedTime.getDate(),
                    parsedTime.getHours(),
                    parsedTime.getMinutes(),
                    parsedTime.getSeconds()
                );
            } catch (e) {
                workoutDate = new Date(workout_time);
            }

            const [user] = await db.query(
                `SELECT weight FROM health_profiles WHERE user_id = ?`,
                [req.user.id]
            );
            
            const weightKg = user[0]?.weight || 70;
            const calories_burned = await WorkoutDetail.calculateCalories(
                duration_minutes, 
                intensity, 
                weightKg
            );

            let finalWorkoutTypeId = workout_type_id;
            let finalCustomName = custom_workout_name;

            if (custom_workout_name && !workout_type_id) {
                finalWorkoutTypeId = await WorkoutType.getOrCreate(custom_workout_name, req.user.id);
                finalCustomName = null;
            }

            const workoutId = await WorkoutDetail.create(req.user.id, {
                workout_type_id: finalWorkoutTypeId,
                custom_workout_name: finalCustomName,
                workout_time: workoutDate,
                duration_minutes,
                intensity,
                distance: distance || null,
                heart_rate: heart_rate || null,
                feeling: feeling || null,
                notes: notes || null,
                calories_burned
            });

            const workout = await WorkoutDetail.getById(workoutId, req.user.id);

            res.status(201).json({
                message: 'Workout logged successfully',
                workout,
                calories_burned
            });
        } catch (err) {
            console.error('Log workout error:', err);
            res.status(500).json({ message: 'Failed to log workout' });
        }
    }

    static async getWorkouts(req, res) {
        try {
            const { start_date, end_date, intensity, workout_type_id, limit, offset } = req.query;
            
            const workouts = await WorkoutDetail.getByUser(req.user.id, {
                start_date,
                end_date,
                intensity,
                workout_type_id: workout_type_id ? parseInt(workout_type_id) : null,
                limit: limit ? parseInt(limit) : null,
                offset: offset ? parseInt(offset) : null
            });

            // Convert workout times to local for response
            const workoutsWithLocalTime = workouts.map(workout => ({
                ...workout,
                workout_time: workout.workout_time
            }));

            res.json(workoutsWithLocalTime);
        } catch (err) {
            console.error('Get workouts error:', err);
            res.status(500).json({ message: 'Failed to fetch workouts' });
        }
    }

    static async getWorkoutById(req, res) {
        try {
            const { id } = req.params;
            const workout = await WorkoutDetail.getById(id, req.user.id);
            
            if (!workout) {
                return res.status(404).json({ message: 'Workout not found' });
            }
            
            res.json(workout);
        } catch (err) {
            console.error('Get workout error:', err);
            res.status(500).json({ message: 'Failed to fetch workout' });
        }
    }

    static async updateWorkout(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const existing = await WorkoutDetail.getById(id, req.user.id);
            if (!existing) {
                return res.status(404).json({ message: 'Workout not found' });
            }

            if (updateData.workout_time) {
                try {
                    const parsedTime = new Date(updateData.workout_time);
                    updateData.workout_time = new Date(
                        parsedTime.getFullYear(),
                        parsedTime.getMonth(),
                        parsedTime.getDate(),
                        parsedTime.getHours(),
                        parsedTime.getMinutes(),
                        parsedTime.getSeconds()
                    );
                } catch (e) {
                    updateData.workout_time = new Date(updateData.workout_time);
                }
            }

            if (updateData.custom_workout_name && !updateData.workout_type_id) {
                updateData.workout_type_id = await WorkoutType.getOrCreate(
                    updateData.custom_workout_name, 
                    req.user.id
                );
                updateData.custom_workout_name = null;
            }

            if (updateData.duration_minutes !== undefined || updateData.intensity !== undefined) {
                const duration = updateData.duration_minutes || existing.duration_minutes;
                const intensity = updateData.intensity || existing.intensity;
                
                const [user] = await db.query(
                    `SELECT weight FROM health_profiles WHERE user_id = ?`,
                    [req.user.id]
                );
                const weightKg = user[0]?.weight || 70;
                
                updateData.calories_burned = await WorkoutDetail.calculateCalories(
                    duration, 
                    intensity, 
                    weightKg
                );
            }

            await WorkoutDetail.update(id, req.user.id, updateData);
            
            const updated = await WorkoutDetail.getById(id, req.user.id);
            res.json({
                message: 'Workout updated successfully',
                workout: updated
            });
        } catch (err) {
            console.error('Update workout error:', err);
            res.status(500).json({ message: 'Failed to update workout' });
        }
    }

    static async deleteWorkout(req, res) {
        try {
            const { id } = req.params;
            await WorkoutDetail.delete(id, req.user.id);
            res.json({ message: 'Workout deleted successfully' });
        } catch (err) {
            console.error('Delete workout error:', err);
            res.status(500).json({ message: 'Failed to delete workout' });
        }
    }

    static async getDailyStats(req, res) {
        try {
            const { date } = req.query;
            
            if (!date) {
                return res.status(400).json({ message: 'Date is required' });
            }

            // Parse date as local date
            const [year, month, day] = date.split('-').map(Number);
            const localDate = new Date(year, month - 1, day);
            
            const stats = await WorkoutDetail.getDailyStats(req.user.id, localDate);
            
            res.json({
                date: localDate.toISOString().split('T')[0],
                ...stats
            });
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

            // Parse start_date as local date
            const [year, month, day] = start_date.split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            
            const stats = await WorkoutDetail.getWeeklyStats(req.user.id, startDate);
            
            // Fill in missing dates with proper local date handling
            const result = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + i);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                
                const dayData = stats.find(s => {
                    const statDate = new Date(s.date);
                    return statDate.getFullYear() === date.getFullYear() &&
                           statDate.getMonth() === date.getMonth() &&
                           statDate.getDate() === date.getDate();
                });
                
                result.push({
                    date: dateStr,
                    workout_count: dayData?.workout_count || 0,
                    total_duration: dayData?.total_duration || 0,
                    total_calories: dayData?.total_calories || 0,
                    total_distance: parseFloat(dayData?.total_distance) || 0,
                    avg_heart_rate: Math.round(dayData?.avg_heart_rate) || null
                });
            }
            
            res.json(result);
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

            const stats = await WorkoutDetail.getMonthlyStats(req.user.id, year, month);
            
            res.json(stats);
        } catch (err) {
            console.error('Get monthly stats error:', err);
            res.status(500).json({ message: 'Failed to fetch monthly stats' });
        }
    }

    static async getIntensityDistribution(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            let startDate = null, endDate = null;
            
            if (start_date) {
                const [y, m, d] = start_date.split('-').map(Number);
                startDate = new Date(y, m - 1, d);
            }
            
            if (end_date) {
                const [y, m, d] = end_date.split('-').map(Number);
                endDate = new Date(y, m - 1, d);
            }
            
            const distribution = await WorkoutDetail.getIntensityDistribution(
                req.user.id,
                startDate,
                endDate
            );
            
            res.json(distribution);
        } catch (err) {
            console.error('Get intensity distribution error:', err);
            res.status(500).json({ message: 'Failed to fetch intensity distribution' });
        }
    }

    static async getWorkoutTypeStats(req, res) {
        try {
            const { start_date, end_date } = req.query;
            
            let startDate = null, endDate = null;
            
            if (start_date) {
                const [y, m, d] = start_date.split('-').map(Number);
                startDate = new Date(y, m - 1, d);
            }
            
            if (end_date) {
                const [y, m, d] = end_date.split('-').map(Number);
                endDate = new Date(y, m - 1, d);
            }
            
            const stats = await WorkoutDetail.getWorkoutTypeStats(
                req.user.id,
                startDate,
                endDate
            );
            
            res.json(stats);
        } catch (err) {
            console.error('Get workout type stats error:', err);
            res.status(500).json({ message: 'Failed to fetch workout type stats' });
        }
    }

    static async getSummary(req, res) {
        try {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekAgoStr = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
            
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);
            const monthAgoStr = `${monthAgo.getFullYear()}-${String(monthAgo.getMonth() + 1).padStart(2, '0')}-${String(monthAgo.getDate()).padStart(2, '0')}`;

            const [todayStats] = await Promise.all([
                WorkoutDetail.getDailyStats(req.user.id, today),
                WorkoutDetail.getWeeklyStats(req.user.id, weekAgo),
                WorkoutDetail.getIntensityDistribution(req.user.id, monthAgo, today),
                WorkoutDetail.getWorkoutTypeStats(req.user.id, monthAgo, today)
            ]);

            const weeklySummary = await WorkoutDetail.getWeeklyStats(req.user.id, weekAgo);
            
            // Format weekly summary with proper dates
            const formattedWeeklySummary = weeklySummary.map(stat => ({
                ...stat,
                date: stat.date instanceof Date 
                    ? `${stat.date.getFullYear()}-${String(stat.date.getMonth() + 1).padStart(2, '0')}-${String(stat.date.getDate()).padStart(2, '0')}`
                    : stat.date
            }));

            res.json({
                today: todayStats,
                weekly_summary: formattedWeeklySummary,
                intensity_distribution: await WorkoutDetail.getIntensityDistribution(req.user.id, monthAgo, today),
                top_workouts: await WorkoutDetail.getWorkoutTypeStats(req.user.id, monthAgo, today)
            });
        } catch (err) {
            console.error('Get summary error:', err);
            res.status(500).json({ message: 'Failed to fetch workout summary' });
        }
    }
}

module.exports = WorkoutDetailController;