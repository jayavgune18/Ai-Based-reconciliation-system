const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai-recon-db', {
      // Connection timeout options
      serverSelectionTimeoutMS: 15000,      // 15 seconds to select server
      socketTimeoutMS: 45000,               // 45 seconds for socket operations
      connectTimeoutMS: 10000,              // 10 seconds initial connection
      
      // Connection pooling
      maxPoolSize: 10,                      // Max connections in pool
      minPoolSize: 2,                       // Min connections to maintain
      
      // Retry settings
      retryWrites: true,                    // Enable retry writes
      retryReads: true,                     // Enable retry reads
      
      // Family and DNS
      family: 4                             // Use IPv4
    });
    
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.db.name}`);
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB error: ${err.message}`);
    });
    
    return conn;
  } catch (error) {
    console.error(`❌ Database Connection Error: ${error.message}`);
    console.log('⚠️ Retrying connection in 5 seconds...');
    
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
