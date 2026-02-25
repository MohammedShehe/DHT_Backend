const HealthProfile = require('../models/HealthProfile');

class HealthController {
  static async saveProfile(req, res) {
    try {
      const requiredFields = ['age', 'gender', 'height', 'weight'];
      for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null) {
          return res.status(400).json({ message: `${field} is required` });
        }
      }

      if (req.body.age < 1 || req.body.age > 150) {
        return res.status(400).json({ message: "Age must be between 1 and 150" });
      }

      await HealthProfile.createOrUpdate(req.user.id, req.body);
      res.json({ message: "Health profile saved successfully" });
    } catch (err) {
      console.error('Save health profile error:', err);
      res.status(500).json({ message: "Failed to save health profile" });
    }
  }

  static async getProfile(req, res) {
    try {
      const profile = await HealthProfile.getByUser(req.user.id);
      if (!profile) {
        return res.status(404).json({ message: "Health profile not found" });
      }
      res.json(profile);
    } catch (err) {
      console.error('Get health profile error:', err);
      res.status(500).json({ message: "Failed to fetch health profile" });
    }
  }
}

module.exports = HealthController;