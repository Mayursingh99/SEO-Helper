# SEO Helper - Production Deployment Guide

## Overview
This guide will help you deploy the SEO Helper hybrid app for Webflow Marketplace submission.

## Prerequisites
1. Webflow Developer Account with OAuth app created
2. Heroku/Railway/Render account for backend deployment
3. Git repository access

## Step 1: Backend Deployment

### Option A: Heroku Deployment
```bash
# Navigate to backend directory
cd "Data Client"

# Initialize git if not already done
git init
git add .
git commit -m "Initial backend deployment"

# Create Heroku app
heroku create seo-helper-backend

# Set environment variables
heroku config:set OAUTH_CLIENT_ID=your_webflow_oauth_client_id
heroku config:set OAUTH_CLIENT_SECRET=your_webflow_oauth_client_secret
heroku config:set OAUTH_REDIRECT_URI=https://seo-helper-backend.herokuapp.com/callback
heroku config:set SESSION_SECRET=your_random_session_secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

### Option B: Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Option C: Render Deployment
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy automatically

## Step 2: Update OAuth Configuration

1. Go to your Webflow Developer Dashboard
2. Update your OAuth app settings:
   - **Redirect URI**: `https://your-backend-domain.com/callback`
   - **Scopes**: `sites:read pages:read pages:write`

## Step 3: Frontend Configuration

1. Navigate to Designer Extension directory:
```bash
cd "Designer Extension"
```

2. Create `.env` file with your backend URL:
```env
BACKEND_URL=https://your-backend-domain.com
```

3. Build the extension:
```bash
npm run build
```

4. Verify `bundle.zip` is created successfully

## Step 4: Webflow App Configuration

1. Go to your Webflow app settings
2. Upload the `bundle.zip` file
3. Enable "Data Client" in app settings
4. Set app permissions to include:
   - sites:read
   - pages:read
   - pages:write

## Step 5: Testing

1. Install the app on a test Webflow site
2. Launch the app from Designer
3. Complete OAuth authorization
4. Test SEO editing functionality
5. Verify changes are saved correctly

## Environment Variables Reference

### Backend (.env)
```env
OAUTH_CLIENT_ID=your_webflow_oauth_client_id
OAUTH_CLIENT_SECRET=your_webflow_oauth_client_secret
OAUTH_REDIRECT_URI=https://your-backend-domain.com/callback
SESSION_SECRET=your_random_session_secret
PORT=3001
NODE_ENV=production
```

### Frontend (.env)
```env
BACKEND_URL=https://your-backend-domain.com
```

## Troubleshooting

### Common Issues

1. **OAuth Error: invalid_redirect_uri**
   - Ensure redirect URI matches exactly in Webflow app settings
   - Check for trailing slashes or protocol mismatches

2. **CORS Errors**
   - Verify backend CORS configuration includes your frontend domain
   - Check that credentials are properly configured

3. **Session Issues**
   - Ensure SESSION_SECRET is set and consistent
   - Check that cookies are being set correctly

4. **API Errors**
   - Verify OAuth scopes are correctly configured
   - Check that access tokens are being stored properly

### Health Check
Test your backend deployment:
```bash
curl https://your-backend-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "message": "SEO Helper Backend is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Checklist

- [ ] OAuth client secret is properly secured
- [ ] Session secret is random and secure
- [ ] HTTPS is enabled on backend
- [ ] CORS is properly configured
- [ ] No sensitive data in frontend bundle
- [ ] Environment variables are set correctly

## Performance Optimization

- [ ] Bundle size is under 500KB
- [ ] Backend response times are under 2 seconds
- [ ] OAuth flow completes within 10 seconds
- [ ] SEO updates save within 3 seconds

## Marketplace Submission Checklist

- [ ] Backend is deployed and accessible
- [ ] OAuth flow works correctly
- [ ] SEO editing functionality works
- [ ] Bundle.zip is created and uploaded
- [ ] App permissions are configured
- [ ] Documentation is complete
- [ ] Screenshots are prepared (1280×846)
- [ ] Privacy policy and terms are ready

## Support

For technical support or questions about deployment, please refer to the main README.md file or contact via the submission thread.
