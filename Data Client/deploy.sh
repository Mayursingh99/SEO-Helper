#!/bin/bash

# SEO Helper Backend Deployment Script
# This script automates the deployment process to Heroku

echo "🚀 Starting SEO Helper Backend Deployment..."

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this script from the 'Data Client' directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial backend deployment"
fi

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    echo "❌ Error: Heroku CLI is not installed. Please install it first:"
    echo "   https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Get app name from user
read -p "Enter your Heroku app name (e.g., seo-helper-backend): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ Error: App name is required"
    exit 1
fi

# Create Heroku app
echo "📱 Creating Heroku app: $APP_NAME"
heroku create $APP_NAME

# Get OAuth credentials from user
echo ""
echo "🔑 Please provide your Webflow OAuth credentials:"
read -p "OAuth Client ID: " OAUTH_CLIENT_ID
read -p "OAuth Client Secret: " OAUTH_CLIENT_SECRET

if [ -z "$OAUTH_CLIENT_ID" ] || [ -z "$OAUTH_CLIENT_SECRET" ]; then
    echo "❌ Error: OAuth credentials are required"
    exit 1
fi

# Generate session secret
SESSION_SECRET=$(openssl rand -base64 32)

# Set environment variables
echo "⚙️  Setting environment variables..."
heroku config:set OAUTH_CLIENT_ID="$OAUTH_CLIENT_ID" --app $APP_NAME
heroku config:set OAUTH_CLIENT_SECRET="$OAUTH_CLIENT_SECRET" --app $APP_NAME
heroku config:set OAUTH_REDIRECT_URI="https://$APP_NAME.herokuapp.com/callback" --app $APP_NAME
heroku config:set SESSION_SECRET="$SESSION_SECRET" --app $APP_NAME
heroku config:set NODE_ENV="production" --app $APP_NAME

# Deploy to Heroku
echo "🚀 Deploying to Heroku..."
git add .
git commit -m "Deploy to Heroku"

# Add Heroku remote if it doesn't exist
if ! git remote | grep -q heroku; then
    heroku git:remote -a $APP_NAME
fi

git push heroku main

# Test deployment
echo "🧪 Testing deployment..."
sleep 10
curl -s "https://$APP_NAME.herokuapp.com/health" | grep -q "ok" && echo "✅ Deployment successful!" || echo "❌ Deployment test failed"

echo ""
echo "📋 Deployment Summary:"
echo "   App URL: https://$APP_NAME.herokuapp.com"
echo "   Health Check: https://$APP_NAME.herokuapp.com/health"
echo "   OAuth Redirect URI: https://$APP_NAME.herokuapp.com/callback"
echo ""
echo "📝 Next Steps:"
echo "   1. Update your Webflow OAuth app settings:"
echo "      - Redirect URI: https://$APP_NAME.herokuapp.com/callback"
echo "   2. Update your frontend .env file:"
echo "      - BACKEND_URL=https://$APP_NAME.herokuapp.com"
echo "   3. Rebuild your frontend bundle: npm run build"
echo ""
echo "🎉 Deployment completed!"
