// config/fcm.js - Firebase Admin SDK configuration using environment variables
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      // Replace escaped newlines with real newlines
      privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

// Get messaging instance
const messaging = admin.messaging();

module.exports = { admin, messaging };