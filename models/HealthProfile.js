const db = require('../config/db');

class HealthProfile {

  static async createOrUpdate(userId, data) {
    const {
      age,
      gender,
      height,
      weight,
      blood_type,
      activity_level,
      health_goal,
      activity_types,
      blood_pressure,
      glucose,
      cholesterol,
      has_diabetes,
      has_hypertension,
      has_heart_condition,
      smoker,
      alcohol_consumer,
      medications,
      allergies,
      medical_conditions
    } = data;

    // Check if profile exists
    const [existing] = await db.query(
      `SELECT id FROM health_profiles WHERE user_id=?`,
      [userId]
    );

    if (existing.length > 0) {
      // UPDATE
      await db.query(
        `UPDATE health_profiles SET
          age=?, gender=?, height=?, weight=?, blood_type=?,
          activity_level=?, health_goal=?, activity_types=?,
          blood_pressure=?, glucose=?, cholesterol=?,
          has_diabetes=?, has_hypertension=?, has_heart_condition=?,
          smoker=?, alcohol_consumer=?,
          medications=?, allergies=?, medical_conditions=?
         WHERE user_id=?`,
        [
          age, gender, height, weight, blood_type,
          activity_level, health_goal, activity_types,
          blood_pressure, glucose, cholesterol,
          has_diabetes, has_hypertension, has_heart_condition,
          smoker, alcohol_consumer,
          medications, allergies, medical_conditions,
          userId
        ]
      );
    } else {
      // INSERT
      await db.query(
        `INSERT INTO health_profiles (
          user_id, age, gender, height, weight, blood_type,
          activity_level, health_goal, activity_types,
          blood_pressure, glucose, cholesterol,
          has_diabetes, has_hypertension, has_heart_condition,
          smoker, alcohol_consumer,
          medications, allergies, medical_conditions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, age, gender, height, weight, blood_type,
          activity_level, health_goal, activity_types,
          blood_pressure, glucose, cholesterol,
          has_diabetes, has_hypertension, has_heart_condition,
          smoker, alcohol_consumer,
          medications, allergies, medical_conditions
        ]
      );
    }
  }

  static async getByUser(userId) {
    const [rows] = await db.query(
      `SELECT * FROM health_profiles WHERE user_id=?`,
      [userId]
    );
    return rows[0];
  }
}

module.exports = HealthProfile;
