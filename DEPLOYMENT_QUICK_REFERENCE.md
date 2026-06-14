# Quick Deployment Reference

## 🚀 Backend Deployment URL
```
https://ai-based-reconciliation-system-backend.onrender.com
```

## 📋 Quick Start

### 1. **Frontend Configuration** 
The frontend automatically detects the environment:
- **Development** (Local): Uses `http://localhost:5000`
- **Production** (Deployed): Uses the Render backend URL

All API calls are made through the centralized `src/services/api.js` client.

### 2. **Environment Variables Setup**

#### Backend (.env on Render)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
CORS_ORIGIN=https://your-frontend-domain.com
```

#### Frontend (.env files already created)
- `.env.development` → Local dev (proxy to localhost:5000)
- `.env.production` → Production (uses Render URL)

### 3. **Local Development**
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (in new terminal)
cd frontend && npm install && npm run dev

# Access at http://localhost:3000
```

### 4. **Deploy to Render (Backend)**
1. Push code to GitHub
2. Connect GitHub repo to Render
3. Set start command: `npm start`
4. Add environment variables from above
5. Deploy!

### 5. **Deploy Frontend**
**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

## 🔧 API Base URL Resolution
The frontend uses this logic:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
```

This means:
- In dev: Uses proxy to localhost:5000 (via Vite)
- In production: Uses `https://ai-based-reconciliation-system-backend.onrender.com`

## 🛡️ CORS Configuration
- **Development**: CORS allows all origins (via Vite proxy)
- **Production**: Backend respects `CORS_ORIGIN` environment variable
- Set frontend domain in backend `.env`: `CORS_ORIGIN=https://your-frontend.com`

## 📝 Key Files
- Frontend API Client: [src/services/api.js](src/services/api.js)
- Auth Context: [src/context/AuthContext.jsx](src/context/AuthContext.jsx)
- Backend Server: [server.js](server.js)
- Full Guide: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## ⚠️ Common Issues
1. **"Cannot reach backend"** → Check CORS_ORIGIN in backend .env
2. **"API_BASE_URL is undefined"** → Ensure .env files exist
3. **"401 Unauthorized"** → Check JWT_SECRET matches between frontend and backend
4. **"MongoDB connection failed"** → Verify MONGODB_URI and IP whitelist

## 🔗 Useful Links
- Render: https://render.com
- Vercel: https://vercel.com
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Backend URL: https://ai-based-reconciliation-system-backend.onrender.com
