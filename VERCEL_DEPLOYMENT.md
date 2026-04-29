# Vercel Deployment Guide for ChoirIQ

This app is a **monorepo** with a unified frontend (both member + leader roles) and a backend. Vercel deploys the frontend; the backend runs on Glitch.

## Architecture

- **Frontend** (`frontend/`): Unified React app with role-based routing (members see member views, managers/admins see leader views)
- **Backend** (`backend/`): Node.js + Express + SQLite
- **Deployment**: Frontend → Vercel, Backend → Glitch (free tier)

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
   - Add: `VITE_API_BASE_URL` = `https://your-backend-url/api`
     - Example: `https://mystical-cloud-1234.glitch.me/api`
6. Click **Deploy**

### 2. Deploy Backend on Glitch (FREE!)

The backend uses Node.js + SQLite and **cannot run on Vercel** (serverless functions don't support persistent file I/O). **Glitch** is completely free with persistent storage.

#### **Glitch** (Completely Free - Recommended)
1. Go to [glitch.com](https://glitch.com)
2. Sign up with GitHub (free account)
3. Click **"New Project"** → **"Import from GitHub"**
4. Paste your repo URL: `https://github.com/ade-jokes/ChiorIQ-Revised`
5. Glitch creates a project. Click into it.
6. In the file explorer, find **`backend/server.js`**
7. Open `.env` file in the root and add:
   ```
   PORT=3001
   NODE_ENV=production
   DB_FILE=/data/choiriq.sqlite
   GEMINI_API_KEY=your_google_api_key_here
   ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
   ```
8. Click **"Start"** button (Glitch auto-starts the server)
9. Glitch generates a URL like `https://mystical-cloud-1234.glitch.me`
10. Copy that URL and use it as `VITE_API_BASE_URL` on Vercel (e.g., `https://mystical-cloud-1234.glitch.me/api`)

**Glitch Free Features**:
- ✅ Always-on Node.js server
- ✅ Persistent file storage (SQLite works!)
- ✅ Automatic HTTPS
- ✅ Auto-restarts on crash
- ✅ No credit card required

#### Alternative: **Replit** (Also Free)
1. Go to [replit.com](https://replit.com)
2. Sign up with GitHub
3. Click **"Create"** → **"Import from GitHub"**
4. Paste repo URL
5. Set up `.env` same as Glitch
6. Click **"Run"** to start server
7. Replit generates a URL automatically

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
5. Add to your Glitch `.env`:
   ```
   GEMINI_API_KEY=your_copied_key_here
   ```

---

### Frontend (Vercel)
| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://mystical-cloud-1234.glitch.me/api` *(your Glitch URL)* |

### Backend (Glitch `.env` file)
| Variable | Required | Example |
|----------|----------|---------|
| `PORT` | ✅ | `3001` |
| `NODE_ENV` | ✅ | `production` |
| `DB_FILE` | ✅ | `/data/choiriq.sqlite` |
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
- Check `VITE_API_BASE_URL` matches your **Glitch URL** (e.g., `https://mystical-cloud-1234.glitch.me/api`)
- Verify `ALLOWED_ORIGINS` on Glitch `.env` includes your Vercel domain

### Database errors
- Glitch automatically creates `/data/` folder
- Ensure `DB_FILE=/data/choiriq.sqlite` is set in Glitch `.env`

### API calls fail  
- Check Glitch logs (click **"Logs"** in Glitch editor)
- Verify `GEMINI_API_KEY` is set (get free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))
- Check Glitch server is running (click **"Start"** button)

### Glitch project stopped
- Glitch keeps free projects running 24/7, but if idle they may pause
- Click **"Start"** to restart
- For always-on, upgrade to Glitch Pro ($5/month optional)

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
- [Glitch Docs](https://glitch.com/help)
- [Replit Docs](https://docs.replit.com)
- [Google AI Studio (Free Gemini API)](https://aistudio.google.com/app/apikey)
- [Docker Docs](https://docs.docker.com)
