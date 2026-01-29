const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Default route
app.get('/', (req, res) => res.send('Digital Health Tracker API running'));

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
