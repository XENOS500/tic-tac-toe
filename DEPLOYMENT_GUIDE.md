# Deployment Guide: Real-Time Multiplayer Tic-Tac-Toe

This guide provides step-by-step instructions to deploy the application for **100% free** on **Render** (Backend Web Service) and **Vercel** (Frontend CDN), including setup to prevent Render's free tier from sleeping.

---

## Architecture Summary

- **Backend:** Node.js, Express, Socket.io in `packages/server`.
- **Frontend:** Vite, React, Tailwind CSS in `packages/client`.
- **Shared Types:** TypeScript contracts in `packages/shared`.

---

## Part 1: Deploy Backend to Render (Free Web Service)

Render provides free container hosting for web services with persistent WebSockets support.

### Step 1: Push Code to GitHub
Ensure all code is committed and pushed to your GitHub repository.

### Step 2: Create Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top right and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and select your Tic-Tac-Toe repo.

### Step 3: Configure Settings
Fill out the configuration fields:

| Field | Value |
| :--- | :--- |
| **Name** | `tic-tac-toe-server` (or any unique name) |
| **Region** | Choose the region closest to you (e.g., Frankfurt, Oregon, Singapore) |
| **Branch** | `main` |
| **Root Directory** | *(Leave empty / project root)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build:shared && npm run build --workspace=@anti-gravity/server` |
| **Start Command** | `npm run start --workspace=@anti-gravity/server` |
| **Instance Type** | **Free** |

### Step 4: Add Environment Variables
Scroll down to the **Environment Variables** section and add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations |
| `PORT` | `10000` | Render's default port |
| `RENDER_EXTERNAL_URL` | `https://your-service-name.onrender.com` | Enables the internal 15-second self-ping monitor |

*(Replace `your-service-name` with the actual URL assigned by Render).*

### Step 5: Deploy & Verify
1. Click **Create Web Service**.
2. Once deployed, test the health check in your browser:
   ```
   https://your-service-name.onrender.com/health
   ```
   You should see a JSON response:
   ```json
   {
     "status": "ok",
     "uptimeSeconds": 12,
     "activeRooms": 0,
     "timestamp": 1726766000000,
     "service": "realtime-tictactoe-server"
   }
   ```

---

## Part 2: Prevent Render Free Tier from Sleeping

Render free-tier web services automatically spin down (sleep) after **15 minutes** of inactivity, which causes a 30–50 second cold start when the next player visits.

We have built 2 lines of defense to eliminate this:

### 1. Built-in 15-Second Health Heartbeat
- The server has a built-in monitor task running every 15 seconds. If `RENDER_EXTERNAL_URL` is set in the environment variables, the server automatically pings its own `/health` endpoint to stay warm.
- The client frontend also automatically pings `${VITE_SERVER_URL}/health` every 15 seconds while any user has the game open.

### 2. External 24/7 Uptime Monitor (Recommended)
To keep the server awake even when no users are on the site, configure a free external ping service:

#### Option A: UptimeRobot (Free & takes 1 minute)
1. Register for free at [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**.
3. Fill in:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `Tic-Tac-Toe Health Check`
   - **URL (or IP):** `https://your-service-name.onrender.com/health`
   - **Monitoring Interval:** `Every 5 minutes`
4. Click **Create Monitor**. UptimeRobot will ping your server around the clock, guaranteeing Render never sleeps.

#### Option B: Cron-Job.org (Free)
1. Register at [cron-job.org](https://cron-job.org).
2. Create a Cron Job with URL `https://your-service-name.onrender.com/health`.
3. Set schedule to **Every 10 minutes**.

---

## Part 3: Deploy Frontend to Vercel (Free Hobby Tier)

### Step 1: Import Project to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository.

### Step 2: Configure Build & Output Settings
Under **Project Settings**:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | `Vite` |
| **Root Directory** | `./` *(Leave as root directory)* |
| **Build Command** | `npm run build:shared && npm run build --workspace=@anti-gravity/client` |
| **Output Directory** | `packages/client/dist` |
| **Install Command** | `npm install` |

### Step 3: Add Environment Variable
Add the backend URL pointing to your live Render server:

| Key | Value |
| :--- | :--- |
| `VITE_SERVER_URL` | `https://your-service-name.onrender.com` |

*(Important: Do NOT include a trailing slash `/`)*.

### Step 4: Deploy
1. Click **Deploy**.
2. Vercel will build and deploy the React client in under 60 seconds.
3. Open the production URL (e.g., `https://tic-tac-toe-xyz.vercel.app`) on your phone and computer to play a live real-time 1v1 match!
