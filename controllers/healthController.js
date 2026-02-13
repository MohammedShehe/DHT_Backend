const HealthProfile = require('../models/HealthProfile');

class HealthController {

  static async saveProfile(req, res) {
    try {
      await HealthProfile.createOrUpdate(req.user.id, req.body);
      res.json({ message: "Health profile saved successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to save health profile" });
    }
  }

  static async getProfile(req, res) {
    try {
      const profile = await HealthProfile.getByUser(req.user.id);
      res.json(profile);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch health profile" });
    }
  }
}

module.exports = HealthController;
