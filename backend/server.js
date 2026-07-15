require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const passport = require('./config/passport');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reconRoutes = require('./routes/reconRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize Express App
const app = express();
const server = http.createServer(app);

// 1. Establish Mongoose DB Connection
connectDB();

// 2. Setup Security & Core Middlewares
// Helmet for security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  referrerPolicy: { policy: 'same-origin' },
}));

// CORS - Explicit configuration for production
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'https://recon-system-frontend.onrender.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5000'
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Compression middleware for gzip/brotli
app.use(compression());

// Request logging (use combined format in production, dev format otherwise)
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// MongoDB sanitization (prevents NoSQL injection)
app.use(mongoSanitize());

// Global API rate limiting
app.use('/api/', apiLimiter);

// Initialize Passport
app.use(passport.initialize());

// 3. Initialize WebSocket Server
initSocket(server);

// 4. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reconciliation', reconRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);


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
  console.log(`🔥 SERVER RUNNING IN ${process.env.NODE_ENV || 'development'} MODE ON PORT ${PORT}`);
  console.log(`🚀 API Gateway active at: http://localhost:${PORT}/`);
});

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} signal received. Starting graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed.');
    // Close MongoDB connection
    const mongoose = require('mongoose');
    mongoose.connection.close(false).then(() => {
      console.log('MongoDB connection closed.');
      process.exit(0);
    }).catch((err) => {
      console.error('Error closing MongoDB connection:', err.message);
      process.exit(1);
    });
  });

  // Force shutdown after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

// Handle unhandled rejections (promise rejections not caught)
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Rejection Error: ${err.message}`);
  console.error(err.stack);
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions (synchronous errors not caught)
process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception Error: ${err.message}`);
  console.error(err.stack);
  gracefulShutdown('uncaughtException');
});

// Handle SIGTERM and SIGINT for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));