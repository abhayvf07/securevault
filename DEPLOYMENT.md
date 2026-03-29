# 🚀 Deployment Guide — SecureVault

Deploy your SecureVault app to **Render** (backend) and **Vercel** (frontend).

---

## 📋 Prerequisites

- GitHub account with your code pushed
- [Render](https://render.com) account (free tier)
- [Vercel](https://vercel.com) account (free tier)
- MongoDB Atlas cluster (you already have this)

---

## 🔧 1. Deploy Backend to Render

### Step 1: Prepare

Ensure your `server/package.json` has:
```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Step 2: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `securevault-api`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 3: Set Environment Variables

In Render dashboard → Environment tab, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | A strong random string (32+ chars) |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_SECRET` | A different strong random string |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `MAX_FILE_SIZE` | `5242880` |
| `CLIENT_URL` | `https://your-app.vercel.app` (set after Vercel deploy) |

> ⚠️ Generate strong secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 4: Deploy

Click **Create Web Service**. Render will build and deploy automatically.

Your API will be available at: `https://securevault-api.onrender.com`

---

## 🎨 2. Deploy Frontend to Vercel

### Step 1: Prepare

Your `client/` directory is already set up for Vite.

### Step 2: Create Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New → Project**
3. Import your GitHub repo
4. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 3: Set Environment Variables

In Vercel → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://securevault-api.onrender.com/api` |

### Step 4: Deploy

Click **Deploy**. Vercel will build and deploy automatically.

---

## 🔗 3. Connect Frontend & Backend

After both are deployed:

1. **Update Render**: Set `CLIENT_URL` to your Vercel URL (e.g., `https://securevault.vercel.app`)
2. **Update Vercel**: Verify `VITE_API_URL` points to your Render URL

This ensures CORS and cookies work correctly across domains.

---

## ⚠️ 4. Important Notes

### MongoDB Atlas Network Access
- Go to MongoDB Atlas → Network Access
- Add `0.0.0.0/0` to allow Render to connect
- (For production, whitelist Render's static IPs)

### Cookies in Production
- The refresh token uses `httpOnly` cookies with `secure: true` and `sameSite: 'strict'`
- This works when both frontend and backend are on HTTPS
- If you experience cookie issues, change `sameSite` to `'none'` in `authController.js`

### File Storage in Production
- Render's free tier has **ephemeral storage** (files are lost on redeploy)
- For production, configure **Cloudinary**:
  1. Create a [Cloudinary](https://cloudinary.com) account (free tier)
  2. Run `npm install cloudinary` in the server directory
  3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in Render env

### Free Tier Limitations
- **Render**: Server sleeps after 15 min of inactivity (cold start ~30s)
- **Vercel**: 100GB bandwidth/month, no issues for portfolio

---

## ✅ 5. Post-Deployment Checklist

- [ ] Health check works: `https://your-api.onrender.com/api/health`
- [ ] Frontend loads at: `https://your-app.vercel.app`
- [ ] Registration/login works
- [ ] File upload works
- [ ] Share links work
- [ ] CORS is properly configured (no browser errors)
