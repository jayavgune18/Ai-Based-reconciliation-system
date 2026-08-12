const mongoose = require('mongoose');

let retryCount = 0;
const MAX_RETRIES = 3;

const connectDB = async () => {
  try {
    // Support both MONGO_URI and MONGODB_URI environment variables
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    // Log diagnostic info
    console.log(`🔍 NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
    console.log(`🔍 MONGO_URI defined: ${!!process.env.MONGO_URI}`);
    console.log(`🔍 MONGODB_URI defined: ${!!process.env.MONGODB_URI}`);
    
    if (!mongoUri) {
      console.error('❌ CRITICAL: No MongoDB URI found! Set MONGO_URI or MONGODB_URI in environment variables.');
      console.error('   In Render dashboard: Environment > Environment Variables > Add MONGO_URI');
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      // In development, fallback to localhost
      console.log('⚠️  Falling back to localhost MongoDB for development...');
    }
    
    const uri = mongoUri || 'mongodb://localhost:27017/ai-recon-db';
    
    const conn = await mongoose.connect(uri, {
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
    retryCount = 0; // Reset retry counter on successful connection
    
    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB error: ${err.message}`);
    });
    
    return conn;
  } catch (error) {
    retryCount++;
    console.error(`❌ Database Connection Error (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
    
    if (retryCount >= MAX_RETRIES) {
      console.error('❌ Max retries reached. Could not connect to MongoDB.');
      console.error('   Please verify your MongoDB connection string in Render dashboard.');
      throw error; // Throw so server.js can handle it
    } else {
      console.log(`⚠️ Retrying connection in 5 seconds... (attempt ${retryCount}/${MAX_RETRIES})`);
      // Wait 5 seconds then retry - return a promise that resolves on success
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB();
    }
  }
};

module.exports = connectDB;
