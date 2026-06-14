require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middlewares/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const reconRoutes = require('./routes/reconRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// 1. Establish Mongoose DB Connection
connectDB();

// 2. Setup Security & Core Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading local file directories in dev if needed
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*', // Use environment variable for CORS origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Initialize WebSocket Server
initSocket(server);

// 4. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reconciliation', reconRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Antigravity Financial Reconciliation API System is fully functional.'
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  const mongoStatus = require('mongoose').connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const mongoStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      status: mongoStatusMap[mongoStatus],
      connected: mongoStatus === 1
    },
    uptime: process.uptime()
  });
});

// 5. Global Exception Handler Middleware
app.use(errorHandler);

// Start listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🔥 SERVER RUNNING IN ${process.env.NODE_ENV || 'development'} MODE ON PORT ${PORT}`);
  console.log(`🚀 API Gateway active at: http://localhost:${PORT}/`);
  console.log(`===================================================`);
});

// Graceful shutdowns
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection Error: ${err.message}`);
});
