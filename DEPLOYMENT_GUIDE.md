# Deployment Guide - AI-Based Reconciliation System

## Overview
This guide covers deploying the AI-Based Reconciliation System with:
- **Backend**: Render.com (Node.js/Express)
- **Frontend**: Vercel/Netlify (React/Vite)
- **Database**: MongoDB Atlas

---

## Backend Deployment (Render.com)

### Prerequisites
- Render.com account
- MongoDB Atlas account
- GitHub repository

### Step 1: Database Setup (MongoDB Atlas)
1. Create a MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
2. Create a database user with strong credentials
3. Get the connection string: `mongodb+srv://username:password@cluster.mongodb.net/reconciliation_db?retryWrites=true&w=majority`

### Step 2: Deploy Backend to Render
1. Push your backend code to GitHub
2. Go to https://render.com and sign up/login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: `ai-based-reconciliation-system-backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Region**: Choose closest to your users

### Step 3: Set Environment Variables on Render
Go to your Render service settings and add these environment variables:

```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/reconciliation_db
JWT_SECRET=your_strong_jwt_secret_here
CORS_ORIGIN=https://your-frontend-domain.com
```

### Step 4: Backend URL
Your backend will be deployed at:
```
https://ai-based-reconciliation-system-backend.onrender.com
```

---

## Frontend Deployment (Vercel/Netlify)

### Step 1: Update Environment Configuration
The frontend includes three environment files:

**Development (.env.development)**
```
VITE_API_BASE_URL=http://localhost:5000
VITE_ENV=development
```

**Production (.env.production)**
```
VITE_API_BASE_URL=https://ai-based-reconciliation-system-backend.onrender.com
VITE_ENV=production
```

### Step 2: Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. From the frontend directory, run:
```bash
vercel
```

3. Follow prompts:
   - Link to your GitHub repository
   - Select project name
   - Set build command: `npm run build`
   - Set output directory: `dist`

4. Add environment variables in Vercel Dashboard:
   - Go to Settings → Environment Variables
   - Add `VITE_API_BASE_URL=https://ai-based-reconciliation-system-backend.onrender.com`

### Alternative: Deploy to Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Run:
```bash
netlify deploy --prod --dir=dist
```

3. Configure in netlify.toml or Netlify Dashboard:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Environment: `VITE_API_BASE_URL=https://ai-based-reconciliation-system-backend.onrender.com`

---

## Local Development Setup

### Backend
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your local MongoDB connection

# Start development server (with auto-reload)
npm run dev
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Create .env.development file
cp .env.example .env.development

# Start development server (port 3000, proxy to localhost:5000)
npm run dev
```

---

## Configuration Files

### Frontend API Client Setup
The frontend now uses a centralized API client (`src/services/api.js`) that:
- Automatically uses the correct base URL from environment variables
- Includes authentication token in all requests
- Handles errors and redirects to login on 401

### Update Your Components
All existing axios calls using relative paths (e.g., `/api/auth/login`) will automatically work because they route through the configured base URL.

---

## Important CORS Configuration

### Backend CORS Settings
Update `backend/server.js` CORS configuration for production:

**Current (Development - Too Permissive)**
```javascript
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Recommended (Production)**
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

---

## Troubleshooting

### Frontend Can't Connect to Backend
1. Check `VITE_API_BASE_URL` in browser console (DevTools → Application → Variables)
2. Verify backend is accessible: `curl https://ai-based-reconciliation-system-backend.onrender.com/`
3. Check CORS settings match your frontend domain
4. Verify JWT_SECRET and other env vars are set on backend

### Database Connection Issues
1. Check MongoDB connection string is correct
2. Verify IP whitelist allows your Render instance
3. Test connection: Use MongoDB Compass to verify credentials

### Build Failures
1. Check Node version compatibility
2. Verify all dependencies are installed: `npm install`
3. Check for TypeScript errors: `npm run build`

---

## SSL/HTTPS

Both Render and Vercel/Netlify provide free SSL certificates automatically.
- Backend: `https://ai-based-reconciliation-system-backend.onrender.com`
- Frontend: Your Vercel/Netlify domain

---

## Monitoring & Logging

### Render Dashboard
- View logs in real-time
- Monitor CPU, memory, and bandwidth usage
- Set up alerts for service downtime

### Vercel/Netlify Dashboard
- Check deployment history
- View build logs
- Monitor performance metrics

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Set MongoDB Atlas connection string
3. ✅ Deploy frontend to Vercel/Netlify
4. ✅ Test authentication flow
5. ✅ Monitor logs and performance
6. ✅ Set up custom domain (optional)

---

## Support & Resources

- Render Documentation: https://render.com/docs
- Vercel Documentation: https://vercel.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com/
- Vite Environment Variables: https://vitejs.dev/guide/env-and-modes.html
