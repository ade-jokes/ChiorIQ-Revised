# Vercel Deployment Guide for ChoirIQ

This app is a **monorepo** with a unified frontend (both member + leader roles) and a backend. Vercel deploys the frontend; the backend runs on Render.

## Architecture

- **Frontend** (`frontend/`): Unified React app with role-based routing (members see member views, managers/admins see leader views)
- **Backend** (`backend/`): Node.js + Express + SQLite
- **Deployment**: Frontend → Vercel, Backend → Render (free tier)

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
   - **Build Command**: `npm run build:frontend`
   - **Output Directory**: `frontend/dist`
5. Set **Environment Variables**:
   - Go to **Settings → Environment Variables**
   - Add: `VITE_API_BASE_URL` = `https://your-render-url/api`
     - Example: `https://choiriq-backend.onrender.com/api`
6. Click **Deploy**

### 2. Deploy Backend on Render (FREE!)

The backend uses Node.js + SQLite and **cannot run on Vercel** (serverless functions don't support persistent file I/O). **Render** is free with persistent storage.

#### **Render** (Free Tier - Recommended)
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (free account)
3. Click **"New +"** → **"Web Service"**
4. Select **"Deploy an existing repository"** → select your repo
5. Configure the web service:
   - **Name**: `choiriq-backend` (or any name)
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (scroll down to select)
6. Click **"Create Web Service"**
7. Once deployed, add environment variables:
   - Click **Environment** (left sidebar)
   - Add each variable:
     ```
     PORT=3001
     NODE_ENV=production
     DB_FILE=/mnt/data/choiriq.sqlite
     GEMINI_API_KEY=your_google_api_key_here
     ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
     ```
   - Click **Save**
8. Render generates a URL like `https://choiriq-backend.onrender.com`
9. Copy that URL and use it as `VITE_API_BASE_URL` on Vercel (e.g., `https://choiriq-backend.onrender.com/api`)

**Render Free Features**:
- ✅ Free tier web service (auto-deploys from GitHub)
- ✅ Persistent disk storage (`/mnt/data/`)
- ✅ Automatic HTTPS
- ✅ Auto-deploys on `git push` to main
- ✅ No credit card required
- ⚠️ Spins down after 15 min of inactivity (wakes up on request)

#### Alternative: **Railway** (Also Free but may require card)
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub Repo"**
4. Select your repo
5. Click **"Configure in Dashboard"**
6. Add environment variables (same as Render above)
7. Railway auto-detects `backend/server.js` and deploys
8. Get your URL from the **Domains** section

#### Docker + Local Server (If running your own machine 24/7)
Use the provided `docker-compose.yml`:
```bash
docker compose up --build
```
Then expose it via a reverse proxy (nginx, ngrok, etc.)

---

## Feature Overview

The unified frontend intelligently routes users based on their role:

- **Members** (`role: 'member'`): See member dashboard with personal progress tracking
  - Routes: `/dashboard`, `/session/:id`, `/progress`, `/notes`
- **Managers/Admins** (`role: 'manager' | 'admin'`): See leader dashboard with choir management
  - Routes: `/dashboard` (leader view), `/leader` (management panel)
- **Auth**: `/` (login/register)

Same codebase, different UX per role. No separate deployments needed!

---

Your backend needs `GEMINI_API_KEY` for the AI features (completely free).

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **"Get API Key"**
3. Click **"Create API Key in new project"**
4. Copy the key
5. Add the same key in your Render environment variables:
   ```
   GEMINI_API_KEY=your_copied_key_here
   ```

---

### Frontend (Vercel)
| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://choiriq-backend.onrender.com/api` *(your Render URL)* |

### Backend (Render Environment Variables)
| Variable | Required | Example |
|----------|----------|---------|
| `PORT` | ✅ | `3001` |
| `NODE_ENV` | ✅ | `production` |
| `DB_FILE` | ✅ | `/mnt/data/choiriq.sqlite` |
| `GEMINI_API_KEY` | ✅ | Get free key at [aistudio.google.com](https://aistudio.google.com/app/apikey) |
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
- Check `VITE_API_BASE_URL` matches your **Render URL** (e.g., `https://choiriq-backend.onrender.com/api`)
- Verify `ALLOWED_ORIGINS` on Render includes your Vercel domain

### Database errors
- Render persistent storage is at `/mnt/data/`
- Ensure `DB_FILE=/mnt/data/choiriq.sqlite` is set in Render environment variables

### API calls fail  
- Check Render logs (click **"Logs"** tab in Render dashboard)
- Verify `GEMINI_API_KEY` is set (get free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))
- Check backend service is running (status shown in Render dashboard)

### Service spun down
- Render free tier spins down after 15 min of inactivity
- Service wakes up automatically on the next request (might take 30 sec)
- To keep it always-on, upgrade to Render Paid ($5+/month)

---

## Local Development

Build and test locally before deploying:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend (unified member + leader app)
npm run dev:frontend

# Visit http://localhost:5173
# Log in as a member or manager to test both UIs
```

Or with Docker:
```bash
docker compose up --build
# Visit http://localhost:3000
```

---

## Links

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Google AI Studio (Free Gemini API)](https://aistudio.google.com/app/apikey)
- [Docker Docs](https://docs.docker.com)
