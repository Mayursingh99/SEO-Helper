# 🔧 OAuth 400 Error Fix Guide

## 🚨 **Current Error:**
```
"error": "OAuth callback failed",
"details": "Request failed with status code 400"
```

## 🔍 **Root Cause:**
The OAuth redirect URI in your Webflow app settings doesn't match your Render backend URL.

## 🛠️ **Step-by-Step Fix:**

### **Step 1: Get Your Exact Render App URL**
1. Go to [render.com](https://render.com)
2. Find your `seo-helper-backend` service
3. Copy the exact URL (should be like `https://seo-helper-backend.onrender.com`)

### **Step 2: Update Webflow App Settings**
1. Go to [Webflow Apps](https://webflow.com/apps)
2. Click on your **SEO Helper** app
3. Go to **"OAuth"** tab
4. **Update OAuth Redirect URI** to:
   ```
   https://seo-helper.onrender.com/callback
   ```
5. **Save changes**

### **Step 3: Update Frontend Environment**
1. Go to `Designer Extension` folder
2. **Create `.env` file** (copy from `env.sample`)
3. **Set the correct backend URL:**
   ```env
   BACKEND_URL=https://seo-helper.onrender.com
   ```

### **Step 4: Rebuild Frontend**
```bash
cd "Designer Extension"
npm run build
```

### **Step 5: Test OAuth Flow**
1. **Upload new bundle** to Webflow
2. **Install app** in a test site
3. **Click "Authorize with Webflow"**
4. **Should redirect successfully** to Render backend

## ✅ **Expected Result:**
- OAuth popup opens
- User authorizes app
- Redirects to `https://seo-helper-backend.onrender.com/callback`
- User returns to app with access granted

## 🆘 **Still Getting 400 Error?**

**Check these common issues:**

1. **URL Mismatch:**
   - Webflow: `https://seo-helper-backend.onrender.com/callback`
   - Backend: `https://seo-helper-backend.onrender.com/callback`
   - Must be **exactly** the same

2. **Missing Environment Variables:**
   - `OAUTH_CLIENT_ID` ✅ (you have this)
   - `OAUTH_CLIENT_SECRET` ❓ (need to add this)
   - `OAUTH_REDIRECT_URI` ❓ (need to match exactly)

3. **Render App Not Running:**
   - Check if your Render app is deployed
   - Visit: `https://seo-helper-backend.onrender.com/health`

## 🎯 **Quick Test:**
Visit this URL to verify your backend is working:
```
https://seo-helper-backend.onrender.com/health
```

**Should show:** `{"status":"healthy","message":"SEO Helper Backend is running"}`

## 🚀 **After Fix:**
1. ✅ OAuth works
2. ✅ App installs successfully
3. ✅ User gets automatic access
4. ✅ Ready for marketplace submission!
