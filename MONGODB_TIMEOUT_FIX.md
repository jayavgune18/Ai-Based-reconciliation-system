# MongoDB Connection Timeout Troubleshooting Guide

## ❌ Error: "Operation `users.findOne()` buffering timed out after 10000ms"

This error occurs when Mongoose cannot connect to MongoDB or the connection is unstable. Here's how to fix it:

---

## 🔍 Quick Diagnostics

### Step 1: Check MongoDB Status
```powershell
# Check if MongoDB is running
Get-Process mongod -ErrorAction SilentlyContinue

# If not running, start MongoDB:
# Windows: mongod --dbpath C:\data\db
# Or use MongoDB Compass
```

### Step 2: Verify Connection
```bash
# From backend directory
curl http://localhost:5000/health
```

Expected output:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "connected": true
  }
}
```

### Step 3: Check .env Configuration
```bash
# Verify backend/.env contains:
PORT=5000
MONGO_URI=mongodb://localhost:27017/ai-recon-db
JWT_SECRET=supersecretkeychangeinproduction123!@#
NODE_ENV=development
```

---

## 🛠️ Common Solutions

### Solution 1: MongoDB Not Running
**Windows:**
```powershell
# Start MongoDB service
net start MongoDB

# Or start mongod directly
mongod --dbpath C:\data\db
```

**Linux/Mac:**
```bash
brew services start mongodb-community
# or
sudo systemctl start mongod
```

### Solution 2: Connection Pool Issues
The configuration has been updated with:
- **socketTimeoutMS**: 45,000ms (increased from default)
- **serverSelectionTimeoutMS**: 15,000ms (increased from 5,000ms)
- **maxPoolSize**: 10 (connection pooling)
- **retryWrites**: true (automatic retry)

### Solution 3: Port Conflict
If port 27017 is in use:
```powershell
# Find process using port 27017
netstat -ano | findstr :27017

# Kill the process (if needed)
taskkill /PID <PID> /F
```

### Solution 4: MongoDB Atlas (Cloud)
If using MongoDB Atlas instead of local:
1. Update `.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ai-recon-db?retryWrites=true&w=majority
   ```
2. Add your IP to Network Access whitelist
3. Ensure credentials are correct

---

## 🔄 Restart Procedure

### Complete Fresh Start
```bash
# 1. Stop backend
# Press Ctrl+C in terminal

# 2. Clear Node process cache
npm cache clean --force

# 3. Reinstall dependencies
npm install

# 4. Restart backend
npm run dev
```

### Reset MongoDB (Development Only)
```bash
# Remove local database
rm -rf C:\data\db\*
# Windows: del C:\data\db\*

# Restart MongoDB
net stop MongoDB
net start MongoDB

# Reseed data
npm run seed
```

---

## 📊 Monitor Connection Health

### Real-time Monitoring
The backend now includes connection event handlers:
```javascript
// Logs connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB error: ${err.message}`);
});
```

### Check via API
```bash
# Check backend health
curl http://localhost:5000/health

# Check specific database
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 Advanced Configuration

### Increase Timeouts Further (if needed)
Edit `backend/config/db.js`:
```javascript
{
  serverSelectionTimeoutMS: 20000,  // 20 seconds
  socketTimeoutMS: 60000,           // 60 seconds
  connectTimeoutMS: 15000,          // 15 seconds
  maxPoolSize: 15                   // More connections
}
```

### Enable Debug Logging
```bash
# Run backend with debug logs
DEBUG=mongoose:* npm run dev
```

---

## ✅ Verification Checklist

- [ ] MongoDB process is running (`mongod` visible in Task Manager)
- [ ] Port 27017 is accessible (netstat check)
- [ ] `.env` file exists and has correct `MONGO_URI`
- [ ] Backend starts without connection errors
- [ ] `/health` endpoint returns `connected: true`
- [ ] Can login with test credentials
- [ ] Dashboard loads and displays data

---

## 🆘 Still Having Issues?

1. **Check logs carefully** for specific error messages
2. **Verify MONGO_URI** is exactly correct
3. **Restart MongoDB completely** (stop → start)
4. **Clear Node modules** and reinstall
5. **Check firewall** isn't blocking port 27017
6. **Try MongoDB Compass** to test connection directly

---

## 📝 Updated Configuration

Your `backend/config/db.js` now includes:
- ✅ Longer timeouts (15s server selection, 45s socket)
- ✅ Connection pooling (min 2, max 10)
- ✅ Automatic retry writes and reads
- ✅ Better error handling and logging
- ✅ Connection state monitoring

These changes should resolve buffering timeout issues.
