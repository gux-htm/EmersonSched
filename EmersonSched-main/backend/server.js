const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();

// Middleware
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ===== ROUTES =====
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/timing', require('./routes/timing'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/rooms', require('./routes/rooms'));

// ✅ Add this BEFORE 404 handler
const requestRoutes = require('./routes/requestRoutes');
app.use('/api/course-requests', requestRoutes);

const notificationRoutes = require('./routes/notificationRoutes');
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'EmersonSched API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res
    .status(500)
    .json({ error: 'Internal server error', message: err.message });
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log('=================================');
  console.log('🎓 EmersonSched API Server');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log('=================================');
});

module.exports = app;
