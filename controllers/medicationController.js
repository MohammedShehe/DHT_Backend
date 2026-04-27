// controllers/medicationController.js
const Medication = require('../models/Medication');

class MedicationController {
  // Get valid units (for frontend dropdown)
  static async getValidUnits(req, res) {
    try {
      res.json({
        units: Medication.getValidUnits(),
        units_with_labels: [
          { value: 'mg', label: 'mg (milligram)', category: 'mass' },
          { value: 'g', label: 'g (gram)', category: 'mass' },
          { value: 'mcg', label: 'mcg (microgram)', category: 'mass' },
          { value: 'ml', label: 'ml (milliliter)', category: 'volume' },
          { value: 'IU', label: 'IU (International Unit)', category: 'units' },
          { value: 'tablet', label: 'Tablet', category: 'solid' },
          { value: 'capsule', label: 'Capsule', category: 'solid' },
          { value: 'drop', label: 'Drop', category: 'liquid' },
          { value: 'puff', label: 'Puff', category: 'inhalation' }
        ]
      });
    } catch (err) {
      console.error('Get units error:', err);
      res.status(500).json({ message: 'Failed to fetch units' });
    }
  }

  // Get valid statuses
  static async getValidStatuses(req, res) {
    try {
      res.json({
        statuses: Medication.getValidStatuses(),
        statuses_with_labels: [
          { value: 'taken', label: 'Taken', color: '#10B981', icon: 'check_circle' },
          { value: 'late', label: 'Late', color: '#F59E0B', icon: 'schedule' },
          { value: 'missed', label: 'Missed', color: '#EF4444', icon: 'cancel' },
          { value: 'skipped', label: 'Skipped', color: '#6B7280', icon: 'skip_next' }
        ]
      });
    } catch (err) {
      console.error('Get statuses error:', err);
      res.status(500).json({ message: 'Failed to fetch statuses' });
    }
  }

  // Get color presets (for frontend)
  static async getColorPresets(req, res) {
    try {
      const colorPresets = [
        { value: '#3B82F6', label: 'Blue', name: 'blue' },
        { value: '#EF4444', label: 'Red', name: 'red' },
        { value: '#10B981', label: 'Green', name: 'green' },
        { value: '#F59E0B', label: 'Amber', name: 'amber' },
        { value: '#8B5CF6', label: 'Purple', name: 'purple' },
        { value: '#EC4899', label: 'Pink', name: 'pink' },
        { value: '#06B6D4', label: 'Cyan', name: 'cyan' },
        { value: '#F97316', label: 'Orange', name: 'orange' },
        { value: '#14B8A6', label: 'Teal', name: 'teal' },
        { value: '#6B7280', label: 'Gray', name: 'gray' }
      ];
      res.json(colorPresets);
    } catch (err) {
      console.error('Get color presets error:', err);
      res.status(500).json({ message: 'Failed to fetch color presets' });
    }
  }

  // ===== MEDICATION CRUD =====

  // Create medication
  static async createMedication(req, res) {
    try {
      const {
        name,
        dosage,
        unit,
        color,
        start_date,
        end_date,
        instructions,
        prescribed_by,
        notes,
        schedules
      } = req.body;

      // Validate required fields
      if (!name || !dosage || !unit || !start_date) {
        return res.status(400).json({ 
          message: 'Name, dosage, unit, and start date are required' 
        });
      }

      if (dosage <= 0) {
        return res.status(400).json({ message: 'Dosage must be greater than 0' });
      }

      if (end_date && new Date(end_date) < new Date(start_date)) {
        return res.status(400).json({ message: 'End date cannot be before start date' });
      }

      const medicationId = await Medication.create(req.user.id, {
        name,
        dosage: parseFloat(dosage),
        unit,
        color,
        start_date,
        end_date: end_date || null,
        instructions,
        prescribed_by,
        notes,
        schedules: schedules || []
      });

      const medication = await Medication.getById(medicationId, req.user.id);

      res.status(201).json({
        message: 'Medication created successfully',
        medication
      });
    } catch (err) {
      console.error('Create medication error:', err);
      res.status(500).json({ message: err.message || 'Failed to create medication' });
    }
  }

  // Get all medications for user
  static async getMedications(req, res) {
    try {
      const { filter = 'active' } = req.query;
      const medications = await Medication.getUserMedications(req.user.id, filter);
      res.json(medications);
    } catch (err) {
      console.error('Get medications error:', err);
      res.status(500).json({ message: 'Failed to fetch medications' });
    }
  }

  // Get medication by ID
  static async getMedicationById(req, res) {
    try {
      const { id } = req.params;
      const medication = await Medication.getById(id, req.user.id);

      if (!medication) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      res.json(medication);
    } catch (err) {
      console.error('Get medication error:', err);
      res.status(500).json({ message: 'Failed to fetch medication' });
    }
  }

  // Update medication
  static async updateMedication(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const existing = await Medication.getById(id, req.user.id);
      if (!existing) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      if (updates.dosage && updates.dosage <= 0) {
        return res.status(400).json({ message: 'Dosage must be greater than 0' });
      }

      if (updates.end_date && new Date(updates.end_date) < new Date(updates.start_date || existing.start_date)) {
        return res.status(400).json({ message: 'End date cannot be before start date' });
      }

      await Medication.update(id, req.user.id, updates);

      const updated = await Medication.getById(id, req.user.id);

      res.json({
        message: 'Medication updated successfully',
        medication: updated
      });
    } catch (err) {
      console.error('Update medication error:', err);
      res.status(500).json({ message: err.message || 'Failed to update medication' });
    }
  }

  // Delete medication (soft delete)
  static async deleteMedication(req, res) {
    try {
      const { id } = req.params;

      const existing = await Medication.getById(id, req.user.id);
      if (!existing) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      await Medication.delete(id, req.user.id);

      res.json({ message: 'Medication deleted successfully' });
    } catch (err) {
      console.error('Delete medication error:', err);
      res.status(500).json({ message: 'Failed to delete medication' });
    }
  }

  // ===== SCHEDULE MANAGEMENT =====

  // Add schedule to medication
  static async addSchedule(req, res) {
    try {
      const { medicationId } = req.params;
      const { time_of_day, days_of_week, dosage_override, unit_override } = req.body;

      if (!time_of_day) {
        return res.status(400).json({ message: 'Time of day is required' });
      }

      const scheduleId = await Medication.addScheduleToMedication(
        medicationId, 
        req.user.id, 
        { time_of_day, days_of_week, dosage_override, unit_override }
      );

      const medication = await Medication.getById(medicationId, req.user.id);

      res.status(201).json({
        message: 'Schedule added successfully',
        medication
      });
    } catch (err) {
      console.error('Add schedule error:', err);
      res.status(500).json({ message: err.message || 'Failed to add schedule' });
    }
  }

  // Delete schedule
  static async deleteSchedule(req, res) {
    try {
      const { medicationId, scheduleId } = req.params;

      await Medication.deleteSchedule(scheduleId, medicationId, req.user.id);

      const medication = await Medication.getById(medicationId, req.user.id);

      res.json({
        message: 'Schedule deleted successfully',
        medication
      });
    } catch (err) {
      console.error('Delete schedule error:', err);
      res.status(500).json({ message: err.message || 'Failed to delete schedule' });
    }
  }

  // ===== ADHERENCE LOGGING =====

  // Log medication intake
  static async logIntake(req, res) {
    try {
      const {
        medication_id,
        schedule_id,
        log_date,
        log_time,
        status,
        actual_time,
        notes
      } = req.body;

      if (!medication_id || !log_date || !log_time) {
        return res.status(400).json({ 
          message: 'Medication ID, log date, and log time are required' 
        });
      }

      const result = await Medication.logIntake(req.user.id, {
        medication_id,
        schedule_id,
        log_date,
        log_time,
        status: status || 'taken',
        actual_time,
        notes
      });

      res.status(201).json(result);
    } catch (err) {
      console.error('Log intake error:', err);
      res.status(500).json({ message: err.message || 'Failed to log medication intake' });
    }
  }

  // Update log status
  static async updateLogStatus(req, res) {
    try {
      const { logId } = req.params;
      const { status, actual_time } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      const result = await Medication.updateLogStatus(logId, req.user.id, status, actual_time);

      res.json(result);
    } catch (err) {
      console.error('Update log status error:', err);
      res.status(500).json({ message: err.message || 'Failed to update log status' });
    }
  }

  // Get logs by date
  static async getLogsByDate(req, res) {
    try {
      const { date } = req.params;

      if (!date) {
        return res.status(400).json({ message: 'Date parameter is required' });
      }

      const logs = await Medication.getLogsByDate(req.user.id, date);
      res.json(logs);
    } catch (err) {
      console.error('Get logs by date error:', err);
      res.status(500).json({ message: 'Failed to fetch logs' });
    }
  }

  // Get logs by date range
  static async getLogsByDateRange(req, res) {
    try {
      const { start_date, end_date, medication_id } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const logs = await Medication.getLogsByDateRange(
        req.user.id,
        start_date,
        end_date,
        medication_id
      );

      res.json({
        total: logs.length,
        logs
      });
    } catch (err) {
      console.error('Get logs range error:', err);
      res.status(500).json({ message: 'Failed to fetch logs' });
    }
  }

  // ===== STATISTICS & ANALYTICS =====

  // Get adherence rate for a medication
  static async getAdherenceRate(req, res) {
    try {
      const { medicationId } = req.params;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const adherence = await Medication.getAdherenceRate(
        req.user.id,
        medicationId,
        start_date,
        end_date
      );

      res.json(adherence);
    } catch (err) {
      console.error('Get adherence rate error:', err);
      res.status(500).json({ message: err.message || 'Failed to fetch adherence rate' });
    }
  }

  // Get all adherence rates for user
  static async getAllAdherenceRates(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const rates = await Medication.getAllAdherenceRates(
        req.user.id,
        start_date,
        end_date
      );

      // Calculate overall average
      const overall = rates.length > 0
        ? Math.round(rates.reduce((sum, r) => sum + r.adherence_rate, 0) / rates.length)
        : 100;

      res.json({
        overall_adherence: overall,
        medications: rates
      });
    } catch (err) {
      console.error('Get all adherence rates error:', err);
      res.status(500).json({ message: 'Failed to fetch adherence rates' });
    }
  }

  // Get daily summary for dashboard
  static async getDailySummary(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      const summary = await Medication.getDailySummary(req.user.id, targetDate);

      res.json(summary);
    } catch (err) {
      console.error('Get daily summary error:', err);
      res.status(500).json({ message: 'Failed to fetch daily summary' });
    }
  }

  // Get missed doses
  static async getMissedDoses(req, res) {
    try {
      const { date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      const missed = await Medication.getMissedDoses(req.user.id, targetDate);

      res.json(missed);
    } catch (err) {
      console.error('Get missed doses error:', err);
      res.status(500).json({ message: 'Failed to fetch missed doses' });
    }
  }

  // Get medication stats for chart
  static async getMedicationStats(req, res) {
    try {
      const { medicationId } = req.params;
      const { period = 'week' } = req.query;

      const stats = await Medication.getMedicationStats(req.user.id, medicationId, period);

      res.json({
        medication_id: medicationId,
        period: period,
        data: stats,
        summary: {
          total_doses: stats.reduce((sum, d) => sum + d.total_doses, 0),
          total_taken: stats.reduce((sum, d) => sum + d.taken, 0),
          total_late: stats.reduce((sum, d) => sum + d.late, 0),
          total_missed: stats.reduce((sum, d) => sum + d.missed, 0),
          total_skipped: stats.reduce((sum, d) => sum + d.skipped, 0),
          average_adherence: Math.round(stats.reduce((sum, d) => sum + d.adherence_rate, 0) / stats.length)
        }
      });
    } catch (err) {
      console.error('Get medication stats error:', err);
      res.status(500).json({ message: 'Failed to fetch medication stats' });
    }
  }

  // Get upcoming doses for today
  static async getUpcomingDoses(req, res) {
    try {
      const doses = await Medication.getUpcomingDoses(req.user.id);
      res.json(doses);
    } catch (err) {
      console.error('Get upcoming doses error:', err);
      res.status(500).json({ message: 'Failed to fetch upcoming doses' });
    }
  }

  // Get medication details for specific date
  static async getMedicationDetailsForDate(req, res) {
    try {
      const { medicationId, date } = req.params;

      if (!medicationId || !date) {
        return res.status(400).json({ message: 'Medication ID and date are required' });
      }

      const details = await Medication.getMedicationDetailsForDate(
        req.user.id,
        medicationId,
        date
      );

      if (!details) {
        return res.status(404).json({ message: 'Medication not found' });
      }

      res.json(details);
    } catch (err) {
      console.error('Get medication details error:', err);
      res.status(500).json({ message: 'Failed to fetch medication details' });
    }
  }
}

module.exports = MedicationController;