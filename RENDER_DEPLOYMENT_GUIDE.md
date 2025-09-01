# 🚀 Render Deployment Guide for SEO Helper

## ✅ **Why Render? (100% FREE!)**
- **Unlimited** static sites
- **750 hours/month** free for web services
- **Auto-deploy** from GitHub
- **Custom domains** with SSL
- **Easy setup** - no credit card required

## 📋 **Step 1: Prepare Your GitHub Repository**

Your code is already on GitHub at: `https://github.com/Mayuringh99/SEO-Helper.git`

## 🔗 **Step 2: Connect to Render**

1. **Go to [render.com](https://render.com)**
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect your GitHub repository:**
   - Select: `Mayuringh99/SEO-Helper`
   - Branch: `main`
   - Root Directory: `Data Client`

## ⚙️ **Step 3: Configure Your App**

**Basic Settings:**
- **Name:** `seo-helper-backend`
- **Environment:** `Node`
- **Region:** Choose closest to you
- **Branch:** `main`
- **Root Directory:** `Data Client`

**Build & Deploy:**
- **Build Command:** `npm install`
- **Start Command:** `npm start`

## 🔐 **Step 4: Set Environment Variables**

Click **"Environment"** tab and add these variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `SESSION_SECRET` | `seo_helper_prod_2024_secure_session_key_87a0757ae6eab55e1c794baf2aada7071f73e6dd65ff46db31da8aca2a87150b` |
| `OAUTH_CLIENT_ID` | `87a0757ae6eab55e1c794baf2aada7071f73e6dd65ff46db31da8aca2a87150b` |
| `OAUTH_CLIENT_SECRET` | `[Your actual OAuth client secret from Webflow]` |
| `OAUTH_REDIRECT_URI` | `https://seo-helper-backend.onrender.com/callback` |

## 🚀 **Step 5: Deploy**

1. **Click "Create Web Service"**
2. **Wait for build** (2-3 minutes)
3. **Your app will be live at:** `https://seo-helper-backend.onrender.com`

## 🔄 **Step 6: Update Webflow App Settings**

1. **Go to [Webflow Apps](https://webflow.com/apps)**
2. **Edit your SEO Helper app**
3. **Update OAuth Redirect URI:**
   ```
   https://seo-helper-backend.onrender.com/callback
   ```

## 🎯 **Step 7: Update Frontend**

1. **Go to `Designer Extension` folder**
2. **Edit `.env` file:**
   ```env
   BACKEND_URL=https://seo-helper-backend.onrender.com
   ```
3. **Build frontend:**
   ```bash
   cd "Designer Extension"
   npm run build
   ```

## ✅ **Step 8: Test & Submit**

1. **Test your backend:** Visit `https://seo-helper-backend.onrender.com/health`
2. **Upload new bundle** to Webflow
3. **Submit to marketplace!**

## 🆘 **Troubleshooting**

**Build fails?**
- Check Node.js version (needs 18+)
- Verify all environment variables are set

**OAuth errors?**
- Ensure redirect URI matches exactly
- Check OAuth client secret is correct

**Need help?**
- Render has excellent documentation
- Community support is very active

## 🎉 **You're Done!**

Your SEO Helper app will be live on Render with:
- ✅ **100% FREE hosting**
- ✅ **Auto-deploy from GitHub**
- ✅ **Professional SSL certificate**
- ✅ **Global CDN**
- ✅ **24/7 uptime monitoring**

**Total time: 10 minutes!** 🚀
