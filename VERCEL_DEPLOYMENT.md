# Vercel Deployment Guide for ChoirIQ

This app is a **monorepo** with separate frontend and backend. Vercel can deploy the frontend; the backend requires a separate platform.

## Quick Start

### 1. Deploy Frontend to Vercel

**Prerequisites**:
- Vercel account (free tier available)
- GitHub repository connected to Vercel
- Backend running on a separate service (see "Backend Deployment" below)

**Steps**:
1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"** → select your GitHub repo
3. Vercel auto-detects the monorepo structure
4. Configure build settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build:member`
   - **Output Directory**: `member-app/dist`
5. Set **Environment Variables**:
   - Go to **Settings → Environment Variables**
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url/api`
     - Example: `https://choiriq-backend.onrender.com/api`
6. Click **Deploy**

### 2. Deploy Backend Separately

The backend uses Node.js + SQLite and **cannot run on Vercel** (serverless functions don't support persistent file I/O). Deploy to:

#### Option A: **Railway** (Recommended - Simple)
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repo, Railway auto-detects `backend/package.json`
4. Add environment variables:
   - `PORT=3001`
   - `NODE_ENV=production`
   - `DB_FILE=/data/choiriq.sqlite`
   - `GEMINI_API_KEY=your_key_here`
   - `ALLOWED_ORIGINS=https://your-vercel-frontend.vercel.app`
5. Railway generates a public URL automatically
6. Use that URL as `VITE_API_BASE_URL` on Vercel

#### Option B: **Render.com**
1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repo
4. Set **Build Command**: `npm install --prefix backend`
5. Set **Start Command**: `node backend/server.js`
6. Add environment variables (same as Railway)
7. Deploy

#### Option C: **Docker + Any Cloud Provider**
Use the provided `docker-compose.yml`:
```bash
docker compose up --build
```
Then push the images to Docker Hub or a cloud registry (Azure ACR, AWS ECR, etc.)

---

## Environment Variables

### Frontend (Vercel)
| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://your-backend.onrender.com/api` |

### Backend (Railway/Render)
| Variable | Required | Example |
|----------|----------|---------|
| `PORT` | ✅ | `3001` |
| `NODE_ENV` | ✅ | `production` |
| `DB_FILE` | ❌ | `/data/choiriq.sqlite` |
| `GEMINI_API_KEY` | ✅ | Your Google API key |
| `ALLOWED_ORIGINS` | ✅ | `https://yourapp.vercel.app` |

---

## Testing the Deployment

Once both frontend and backend are live:

1. Open `https://your-app.vercel.app`
2. Register a new user
3. Create a choir
4. Check browser console for any CORS or API errors
5. Verify API calls hit your backend (check backend logs)

---

## Troubleshooting

### 404 or CORS errors
- Check `VITE_API_BASE_URL` matches your backend URL
- Verify `ALLOWED_ORIGINS` on backend includes your Vercel domain

### Database errors
- Ensure `DB_FILE=/data/choiriq.sqlite` is set
- Check backend has write permissions to `/data`

### API calls fail
- Verify backend environment variables (especially `GEMINI_API_KEY`)
- Check backend logs for connection errors

---

## Local Development

Build and test locally before deploying:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:member

# Visit http://localhost:5173
```

Or with Docker:
```bash
docker compose up --build
# Visit http://localhost:3000
```

---

## Links

- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Docker Docs](https://docs.docker.com)
