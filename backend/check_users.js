const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ai-recon-db';
console.log('Connecting to:', mongoUri);

mongoose.connect(mongoUri).then(async () => {
  console.log('Connected to MongoDB');
  
  const User = require('./models/User');
  const users = await User.find({}).select('name email role isActive');
  console.log('\nUsers in database:', JSON.stringify(users, null, 2));
  console.log('Total users:', users.length);
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});