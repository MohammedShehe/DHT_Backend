// models/Medication.js
const db = require('../config/db');

class Medication {
  // Get all valid units
  static getValidUnits() {
    return ['mg', 'g', 'mcg', 'ml', 'IU', 'tablet', 'capsule', 'drop', 'puff'];
  }

  // Get all valid statuses
  static getValidStatuses() {
    return ['taken', 'missed', 'skipped', 'late'];
  }

  // Create a new medication
  static async create(userId, data) {
    const {
      name,
      dosage,
      unit,
      color = '#3B82F6',
      start_date,
      end_date = null,
      instructions = null,
      prescribed_by = null,
      notes = null,
      schedules = []
    } = data;

    // Validate unit
    if (!this.getValidUnits().includes(unit)) {
      throw new Error(`Invalid unit. Must be one of: ${this.getValidUnits().join(', ')}`);
    }

    const [result] = await db.query(
      `INSERT INTO user_medications 
       (user_id, name, dosage, unit, color, start_date, end_date, instructions, prescribed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name.trim(), dosage, unit, color, start_date, end_date, instructions, prescribed_by, notes]
    );

    const medicationId = result.insertId;

    // Add schedules
    for (const schedule of schedules) {
      await this.addSchedule(medicationId, schedule);
    }

    return medicationId;
  }

  // Add schedule to medication
  static async addSchedule(medicationId, schedule) {
    const { time_of_day, days_of_week = 'all', dosage_override = null, unit_override = null } = schedule;

    await db.query(
      `INSERT INTO medication_schedules 
       (medication_id, time_of_day, days_of_week, dosage_override, unit_override)
       VALUES (?, ?, ?, ?, ?)`,
      [medicationId, time_of_day, days_of_week, dosage_override, unit_override]
    );
  }

  // Get medication by ID
  static async getById(id, userId) {
    const [medications] = await db.query(
      `SELECT m.*, 
              CASE WHEN m.end_date IS NULL OR m.end_date >= CURDATE() THEN 1 ELSE 0 END as is_active
       FROM user_medications m
       WHERE m.id = ? AND m.user_id = ?`,
      [id, userId]
    );

    if (medications.length === 0) return null;

    const medication = medications[0];

    // Get schedules
    const [schedules] = await db.query(
      `SELECT * FROM medication_schedules WHERE medication_id = ? ORDER BY time_of_day ASC`,
      [id]
    );
    medication.schedules = schedules;

    return medication;
  }

  // Get all medications for a user
  static async getUserMedications(userId, filter = 'active') {
    let query = `
      SELECT m.*, 
             CASE WHEN m.end_date IS NULL OR m.end_date >= CURDATE() THEN 1 ELSE 0 END as is_active
      FROM user_medications m
      WHERE m.user_id = ?
    `;
    const params = [userId];

    if (filter === 'active') {
      query += ` AND (m.end_date IS NULL OR m.end_date >= CURDATE())`;
    } else if (filter === 'inactive') {
      query += ` AND m.end_date IS NOT NULL AND m.end_date < CURDATE()`;
    }

    query += ` ORDER BY m.created_at DESC`;

    const [medications] = await db.query(query, params);

    // Get schedules for each medication
    for (const medication of medications) {
      const [schedules] = await db.query(
        `SELECT * FROM medication_schedules WHERE medication_id = ? ORDER BY time_of_day ASC`,
        [medication.id]
      );
      medication.schedules = schedules;
    }

    return medications;
  }

  // Update medication
  static async update(id, userId, data) {
    const {
      name,
      dosage,
      unit,
      color,
      start_date,
      end_date,
      instructions,
      prescribed_by,
      notes
    } = data;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (dosage !== undefined) {
      updates.push('dosage = ?');
      params.push(dosage);
    }
    if (unit !== undefined) {
      if (!this.getValidUnits().includes(unit)) {
        throw new Error(`Invalid unit. Must be one of: ${this.getValidUnits().join(', ')}`);
      }
      updates.push('unit = ?');
      params.push(unit);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      params.push(color);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date || null);
    }
    if (instructions !== undefined) {
      updates.push('instructions = ?');
      params.push(instructions);
    }
    if (prescribed_by !== undefined) {
      updates.push('prescribed_by = ?');
      params.push(prescribed_by);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) return;

    params.push(id, userId);
    await db.query(
      `UPDATE user_medications SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );
  }

  // Delete medication (soft delete by setting end_date to yesterday)
  static async delete(id, userId) {
    await db.query(
      `UPDATE user_medications SET end_date = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id = ? AND user_id = ?`,
      [id, userId]
    );
  }

  // Delete schedule
  static async deleteSchedule(scheduleId, medicationId, userId) {
    // Verify medication belongs to user
    const [med] = await db.query(
      `SELECT id FROM user_medications WHERE id = ? AND user_id = ?`,
      [medicationId, userId]
    );
    
    if (med.length === 0) {
      throw new Error('Medication not found');
    }

    await db.query(
      `DELETE FROM medication_schedules WHERE id = ? AND medication_id = ?`,
      [scheduleId, medicationId]
    );
  }

  // Add schedule to existing medication
  static async addScheduleToMedication(medicationId, userId, schedule) {
    // Verify medication belongs to user
    const [med] = await db.query(
      `SELECT id FROM user_medications WHERE id = ? AND user_id = ?`,
      [medicationId, userId]
    );
    
    if (med.length === 0) {
      throw new Error('Medication not found');
    }

    const { time_of_day, days_of_week = 'all', dosage_override = null, unit_override = null } = schedule;

    const [result] = await db.query(
      `INSERT INTO medication_schedules 
       (medication_id, time_of_day, days_of_week, dosage_override, unit_override)
       VALUES (?, ?, ?, ?, ?)`,
      [medicationId, time_of_day, days_of_week, dosage_override, unit_override]
    );

    return result.insertId;
  }

  // Log medication intake
  static async logIntake(userId, data) {
    const {
      medication_id,
      schedule_id = null,
      log_date,
      log_time,
      status = 'taken',
      actual_time = null,
      notes = null
    } = data;

    // Validate status
    if (!this.getValidStatuses().includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${this.getValidStatuses().join(', ')}`);
    }

    // Check if medication exists and belongs to user
    const [med] = await db.query(
      `SELECT id, name FROM user_medications WHERE id = ? AND user_id = ?`,
      [medication_id, userId]
    );

    if (med.length === 0) {
      throw new Error('Medication not found');
    }

    // Check if schedule exists if provided
    if (schedule_id) {
      const [schedule] = await db.query(
        `SELECT id FROM medication_schedules WHERE id = ? AND medication_id = ?`,
        [schedule_id, medication_id]
      );
      if (schedule.length === 0) {
        throw new Error('Schedule not found for this medication');
      }
    }

    // Check for duplicate log
    const [existing] = await db.query(
      `SELECT id FROM medication_adherence_logs 
       WHERE medication_id = ? AND schedule_id = ? AND log_date = ? AND log_time = ?`,
      [medication_id, schedule_id, log_date, log_time]
    );

    if (existing.length > 0) {
      // Update existing
      await db.query(
        `UPDATE medication_adherence_logs 
         SET status = ?, actual_time = ?, notes = ?
         WHERE id = ?`,
        [status, actual_time, notes, existing[0].id]
      );
      return { id: existing[0].id, message: 'Log updated successfully' };
    }

    // Insert new log
    const [result] = await db.query(
      `INSERT INTO medication_adherence_logs 
       (user_id, medication_id, schedule_id, log_date, log_time, status, actual_time, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, medication_id, schedule_id, log_date, log_time, status, actual_time, notes]
    );

    return { id: result.insertId, message: 'Medication intake logged successfully' };
  }

  // Get adherence logs for a date
  static async getLogsByDate(userId, date) {
    const [logs] = await db.query(
      `SELECT l.*, m.name as medication_name, m.dosage, m.unit, m.color,
              s.time_of_day as scheduled_time, s.dosage_override, s.unit_override
       FROM medication_adherence_logs l
       JOIN user_medications m ON l.medication_id = m.id
       LEFT JOIN medication_schedules s ON l.schedule_id = s.id
       WHERE l.user_id = ? AND l.log_date = ?
       ORDER BY l.log_time ASC`,
      [userId, date]
    );

    return logs;
  }

  // Get logs for date range
  static async getLogsByDateRange(userId, startDate, endDate, medicationId = null) {
    let query = `
      SELECT l.*, m.name as medication_name, m.dosage, m.unit, m.color,
             s.time_of_day as scheduled_time
      FROM medication_adherence_logs l
      JOIN user_medications m ON l.medication_id = m.id
      LEFT JOIN medication_schedules s ON l.schedule_id = s.id
      WHERE l.user_id = ? AND l.log_date BETWEEN ? AND ?
    `;
    const params = [userId, startDate, endDate];

    if (medicationId) {
      query += ` AND l.medication_id = ?`;
      params.push(medicationId);
    }

    query += ` ORDER BY l.log_date DESC, l.log_time ASC`;

    const [logs] = await db.query(query, params);
    return logs;
  }

  // Get adherence rate for a medication over a period
  static async getAdherenceRate(userId, medicationId, startDate, endDate) {
    // Get expected doses for the period based on schedules
    const [medication] = await db.query(
      `SELECT * FROM user_medications WHERE id = ? AND user_id = ?`,
      [medicationId, userId]
    );

    if (medication.length === 0) {
      throw new Error('Medication not found');
    }

    const med = medication[0];

    // Get schedules
    const [schedules] = await db.query(
      `SELECT * FROM medication_schedules WHERE medication_id = ?`,
      [medicationId]
    );

    // Get actual logs
    const [logs] = await db.query(
      `SELECT l.*, DATE(l.log_date) as log_date_only
       FROM medication_adherence_logs l
       WHERE l.medication_id = ? AND l.log_date BETWEEN ? AND ?
       AND l.status IN ('taken', 'late')`,
      [medicationId, startDate, endDate]
    );

    // Calculate expected doses
    const start = new Date(startDate);
    const end = new Date(endDate);
    let expectedCount = 0;
    let takenCount = logs.length;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      // Check if medication was active on this date
      const medStart = new Date(med.start_date);
      if (currentDate < medStart) continue;
      
      if (med.end_date) {
        const medEnd = new Date(med.end_date);
        if (currentDate > medEnd) continue;
      }

      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

      for (const schedule of schedules) {
        let shouldTake = false;
        
        if (schedule.days_of_week === 'all') {
          shouldTake = true;
        } else if (schedule.days_of_week === 'weekdays') {
          shouldTake = dayOfWeek >= 1 && dayOfWeek <= 5;
        } else if (schedule.days_of_week === 'weekends') {
          shouldTake = dayOfWeek === 0 || dayOfWeek === 6;
        } else {
          const days = schedule.days_of_week.split(',');
          shouldTake = days.includes(dayNames[dayOfWeek]);
        }

        if (shouldTake) {
          expectedCount++;
        }
      }
    }

    const adherenceRate = expectedCount > 0 ? (takenCount / expectedCount) * 100 : 0;

    return {
      medication_id: medicationId,
      medication_name: med.name,
      start_date: startDate,
      end_date: endDate,
      expected_doses: expectedCount,
      taken_doses: takenCount,
      missed_doses: expectedCount - takenCount,
      adherence_rate: Math.round(adherenceRate),
      schedules: schedules
    };
  }

  // Get adherence rate for all active medications
  static async getAllAdherenceRates(userId, startDate, endDate) {
    const [medications] = await db.query(
      `SELECT id, name FROM user_medications 
       WHERE user_id = ? AND (end_date IS NULL OR end_date >= ?)
       AND start_date <= ?`,
      [userId, startDate, endDate]
    );

    const results = [];
    for (const med of medications) {
      const rate = await this.getAdherenceRate(userId, med.id, startDate, endDate);
      results.push(rate);
    }

    return results;
  }

  // Get daily adherence summary for dashboard
  static async getDailySummary(userId, date) {
    // Get all active medications for this date
    const [medications] = await db.query(
      `SELECT m.*, 
              CASE WHEN m.end_date IS NULL OR m.end_date >= ? THEN 1 ELSE 0 END as is_active
       FROM user_medications m
       WHERE m.user_id = ? AND m.start_date <= ?
       AND (m.end_date IS NULL OR m.end_date >= ?)`,
      [date, userId, date, date]
    );

    const summary = {
      date: date,
      total_medications: medications.length,
      total_doses_taken: 0,
      total_doses_expected: 0,
      medications: []
    };

    for (const med of medications) {
      // Get schedules for this medication
      const [schedules] = await db.query(
        `SELECT * FROM medication_schedules WHERE medication_id = ?`,
        [med.id]
      );

      const dayOfWeek = new Date(date).getDay();
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      
      const expectedDoses = [];
      for (const schedule of schedules) {
        let shouldTake = false;
        
        if (schedule.days_of_week === 'all') {
          shouldTake = true;
        } else if (schedule.days_of_week === 'weekdays') {
          shouldTake = dayOfWeek >= 1 && dayOfWeek <= 5;
        } else if (schedule.days_of_week === 'weekends') {
          shouldTake = dayOfWeek === 0 || dayOfWeek === 6;
        } else {
          const days = schedule.days_of_week.split(',');
          shouldTake = days.includes(dayNames[dayOfWeek]);
        }

        if (shouldTake) {
          expectedDoses.push({
            schedule_id: schedule.id,
            scheduled_time: schedule.time_of_day,
            dosage: schedule.dosage_override || med.dosage,
            unit: schedule.unit_override || med.unit
          });
        }
      }

      // Get taken doses for this date
      const [takenLogs] = await db.query(
        `SELECT l.*, s.time_of_day as scheduled_time
         FROM medication_adherence_logs l
         LEFT JOIN medication_schedules s ON l.schedule_id = s.id
         WHERE l.medication_id = ? AND l.user_id = ? AND l.log_date = ?
         AND l.status IN ('taken', 'late')`,
        [med.id, userId, date]
      );

      const takenDoses = takenLogs.map(log => ({
        schedule_id: log.schedule_id,
        taken_time: log.log_time,
        scheduled_time: log.scheduled_time,
        status: log.status
      }));

      summary.total_doses_expected += expectedDoses.length;
      summary.total_doses_taken += takenDoses.length;

      summary.medications.push({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        unit: med.unit,
        color: med.color,
        expected_doses: expectedDoses,
        taken_doses: takenDoses,
        adherence_rate: expectedDoses.length > 0 ? (takenDoses.length / expectedDoses.length) * 100 : 100,
        is_complete: takenDoses.length >= expectedDoses.length
      });
    }

    summary.overall_adherence = summary.total_doses_expected > 0 
      ? Math.round((summary.total_doses_taken / summary.total_doses_expected) * 100) 
      : 100;

    return summary;
  }

  // Get missed doses that need attention
  static async getMissedDoses(userId, date) {
    const [missedLogs] = await db.query(
      `SELECT l.*, m.name as medication_name, m.dosage, m.unit, m.color,
              s.time_of_day as scheduled_time
       FROM medication_adherence_logs l
       JOIN user_medications m ON l.medication_id = m.id
       LEFT JOIN medication_schedules s ON l.schedule_id = s.id
       WHERE l.user_id = ? AND l.log_date = ? AND l.status = 'missed'`,
      [userId, date]
    );

    return missedLogs;
  }

  // Update log status (mark as taken from missed)
  static async updateLogStatus(logId, userId, status, actualTime = null) {
    if (!this.getValidStatuses().includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${this.getValidStatuses().join(', ')}`);
    }

    await db.query(
      `UPDATE medication_adherence_logs 
       SET status = ?, actual_time = COALESCE(?, actual_time)
       WHERE id = ? AND user_id = ?`,
      [status, actualTime, logId, userId]
    );

    return { message: 'Log status updated successfully' };
  }

  // Get medication stats for chart
  static async getMedicationStats(userId, medicationId, period = 'week') {
    let startDate;
    const endDate = new Date().toISOString().split('T')[0];

    switch(period) {
      case 'week':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    const [logs] = await db.query(
      `SELECT 
        DATE(log_date) as date,
        COUNT(*) as total_doses,
        SUM(CASE WHEN status = 'taken' THEN 1 ELSE 0 END) as taken,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped
       FROM medication_adherence_logs
       WHERE medication_id = ? AND user_id = ? AND log_date BETWEEN ? AND ?
       GROUP BY DATE(log_date)
       ORDER BY date ASC`,
      [medicationId, userId, startDateStr, endDate]
    );

    // Fill in missing dates
    const result = [];
    const currentDate = new Date(startDateStr);
    const end = new Date(endDate);

    while (currentDate <= end) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = logs.find(l => l.date === dateStr);
      
      result.push({
        date: dateStr,
        total_doses: dayData?.total_doses || 0,
        taken: dayData?.taken || 0,
        late: dayData?.late || 0,
        missed: dayData?.missed || 0,
        skipped: dayData?.skipped || 0,
        adherence_rate: dayData?.total_doses > 0 
          ? Math.round(((dayData.taken || 0) / dayData.total_doses) * 100)
          : 100
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  // Get upcoming doses for today
  static async getUpcomingDoses(userId, currentTime = null) {
    const today = new Date().toISOString().split('T')[0];
    const now = currentTime || new Date().toTimeString().slice(0, 5);

    const [doses] = await db.query(
      `SELECT m.id as medication_id, m.name, m.dosage, m.unit, m.color,
              s.id as schedule_id, s.time_of_day as scheduled_time,
              CASE WHEN s.dosage_override IS NOT NULL THEN s.dosage_override ELSE m.dosage END as actual_dosage,
              CASE WHEN s.unit_override IS NOT NULL THEN s.unit_override ELSE m.unit END as actual_unit
       FROM user_medications m
       JOIN medication_schedules s ON m.id = s.medication_id
       WHERE m.user_id = ? 
         AND (m.end_date IS NULL OR m.end_date >= ?)
         AND m.start_date <= ?
         AND s.time_of_day >= ?
       ORDER BY s.time_of_day ASC
       LIMIT 10`,
      [userId, today, today, now]
    );

    return doses;
  }

  // Get medication details for a specific date (what was supposed to be taken vs what was taken)
  static async getMedicationDetailsForDate(userId, medicationId, date) {
    const medication = await this.getById(medicationId, userId);
    if (!medication) return null;

    const dayOfWeek = new Date(date).getDay();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const expectedDoses = [];
    for (const schedule of medication.schedules) {
      let shouldTake = false;
      
      if (schedule.days_of_week === 'all') {
        shouldTake = true;
      } else if (schedule.days_of_week === 'weekdays') {
        shouldTake = dayOfWeek >= 1 && dayOfWeek <= 5;
      } else if (schedule.days_of_week === 'weekends') {
        shouldTake = dayOfWeek === 0 || dayOfWeek === 6;
      } else {
        const days = schedule.days_of_week.split(',');
        shouldTake = days.includes(dayNames[dayOfWeek]);
      }

      if (shouldTake) {
        expectedDoses.push({
          schedule_id: schedule.id,
          scheduled_time: schedule.time_of_day,
          dosage: schedule.dosage_override || medication.dosage,
          unit: schedule.unit_override || medication.unit
        });
      }
    }

    // Get taken doses
    const [takenLogs] = await db.query(
      `SELECT * FROM medication_adherence_logs 
       WHERE medication_id = ? AND user_id = ? AND log_date = ?
       ORDER BY log_time ASC`,
      [medicationId, userId, date]
    );

    return {
      medication: {
        id: medication.id,
        name: medication.name,
        color: medication.color,
        instructions: medication.instructions,
        prescribed_by: medication.prescribed_by,
        notes: medication.notes
      },
      date: date,
      expected_doses: expectedDoses,
      taken_doses: takenLogs.map(log => ({
        schedule_id: log.schedule_id,
        taken_time: log.log_time,
        status: log.status,
        actual_time: log.actual_time,
        notes: log.notes
      })),
      is_complete: takenLogs.length >= expectedDoses.length,
      adherence_rate: expectedDoses.length > 0 
        ? Math.round((takenLogs.length / expectedDoses.length) * 100)
        : 100
    };
  }
}

module.exports = Medication;