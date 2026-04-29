# 🚨 Database Persistence Fix for Render Deployment

## Problem
Your deployed ChoirIQ app is losing all database data on every restart/redeployment. This is because Render's free tier doesn't have persistent storage by default — the `/backend/data/` directory gets wiped on every restart.

## Solution: Add a Persistent Disk to Your Render Service

### Step 1: Open Your Render Dashboard
1. Go to https://dashboard.render.com
2. Click on your **chioriq** backend service

### Step 2: Add a Persistent Disk
1. Scroll down to **Disks** section
2. Click **Add Disk**
3. Configure as follows:
   - **Name**: `data`
   - **Mount Path**: `/data`
   - **Size**: `1 GB` (or more if needed)
4. Click **Save**

### Step 3: Redeploy Your Backend
Once the disk is added, Render will automatically redeploy your service. You can:
- Go to the **Deploys** tab and wait for the new deployment
- Or manually trigger a redeploy by pushing a new commit or clicking "Manual Deploy"

### Step 4: Verify It Works
1. Go to https://chioriq-steel.vercel.app
2. Create a test account (if needed)
3. Try to save some data (complete a session, add a note, etc.)
4. **Refresh the page** or **wait a few minutes** and refresh again
5. Your data should still be there! ✅

## Technical Details (What We Fixed)

The backend code has been updated to:
1. **Check for Render's persistent disk** at `/data/` first
2. **Fall back to local `/backend/data/`** for local development
3. **Use `DB_FILE` environment variable** if explicitly set

When you add the persistent disk and redeploy, the app will automatically detect it and store the SQLite database at `/data/choiriq.sqlite`, which persists across restarts.

## If You Still See Data Loss

1. **Check Render logs**: 
   - Go to your Render service → **Logs** tab
   - Look for messages like "Using Render persistent disk" or "⚠️ WARNING: Database is not using Render persistent disk"

2. **Verify disk was added**:
   - Go to **Settings** tab
   - Scroll to **Disks** and confirm your disk is listed

3. **Check file permissions**:
   - Make sure the mount path is `/data` (not `/data/` or `/backend/data`)

4. **Force a redeploy**:
   - Make a small change to any file and push to trigger a redeploy
   - Or manually trigger via "Manual Deploy" button

## Production Checklist
- [ ] Persistent disk added with mount path `/data`
- [ ] Service redeployed after adding disk
- [ ] Can see "Using Render persistent disk" in Render logs
- [ ] Test data persists after page refresh
- [ ] Test data persists after app restart (wait 15+ min and refresh)

---

**Questions?** Check the backend logs in your Render dashboard's **Logs** tab for detailed diagnostics.
