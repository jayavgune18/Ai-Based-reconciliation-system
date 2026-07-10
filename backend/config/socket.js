const socketIO = require('socket.io');

let io;

const initSocket = (server) => {
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    'https://recon-system-frontend.onrender.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5000'
  ].filter(Boolean);

  io = socketIO(server, {
    cors: {
      origin: function(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'), false);
        }
      },
      methods: ['GET', 'POST', 'PUT'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.IO: ${socket.id}`);

    socket.on('join_job', (jobId) => {
      socket.join(jobId);
      console.log(`User joined job room: ${jobId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Helper to broadcast processing logs or fraud alerts
const notifyJobUpdate = (jobId, data) => {
  if (io) {
    io.to(jobId).emit('job_progress', data);
  }
};

const broadcastFraudAlert = (alertData) => {
  if (io) {
    io.emit('fraud_alert', alertData);
  }
};

module.exports = {
  initSocket,
  getIO,
  notifyJobUpdate,
  broadcastFraudAlert
};