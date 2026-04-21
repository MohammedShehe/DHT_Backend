// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import rate limiter
const { globalLimiter } = require('./middlewares/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const accountRoutes =require('./routes/accountRoutes');
const healthRoutes = require('./routes/healthRoutes');
const stepRoutes = require('./routes/stepRoutes');
const waterRoutes = require('./routes/waterRoutes');
const sleepRoutes = require('./routes/sleepRoutes');
const meditationRoutes = require('./routes/meditationRoutes');
const workoutRoutes = require('./routes/workoutRoutes');
const calorieRoutes = require('./routes/calorieRoutes');
const goalRoutes = require('./routes/goalRoutes');
const notificationScheduler = require('./services/notificationScheduler');
const notificationRoutes = require('./routes/notificationRoutes');
const mealRoutes = require('./routes/mealRoutes');
const workoutDetailRoutes = require('./routes/workoutDetailRoutes');
const sleepActivityRoutes = require('./routes/sleepActivityRoutes');
const hydrationActivityRoutes = require('./routes/hydrationActivityRoutes');


// Import food models for initialization
const FoodCategory = require('./models/FoodCategory');
const FoodItem = require('./models/FoodItem');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Body parsers with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply global rate limiter to all API routes
app.use('/api', globalLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/steps', stepRoutes);
app.use('/api/water', waterRoutes);
app.use('/api/sleep', sleepRoutes);
app.use('/api/meditation', meditationRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/calories', calorieRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/workout-details', workoutDetailRoutes);
app.use('/api/sleep-activity', sleepActivityRoutes);
app.use('/api/hydration-activity', hydrationActivityRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Digital Health Tracker API',
    version: '2.0.0',
    documentation: '/api-docs' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  // Multer error handling
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'File too large. Maximum size is 5MB.' 
      });
    }
    return res.status(400).json({ 
      message: 'File upload error: ' + err.message 
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Default error
  res.status(500).json({ 
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Initialize food database
async function initializeFoodDatabase() {
  try {
    console.log('🍽️ Initializing food database...');
    await FoodCategory.initializeDefaultCategories();
    await FoodItem.initializeDefaultFoods();
    console.log('✅ Food database initialized with default categories and foods');
  } catch (err) {
    console.error('❌ Error initializing food database:', err);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Initialize food database
  await initializeFoodDatabase();
  
  // Start notification scheduler
  notificationScheduler.start();
  
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

module.exports = app;