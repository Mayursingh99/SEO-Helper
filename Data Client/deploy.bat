@echo off
REM SEO Helper Backend Deployment Script for Windows
REM This script automates the deployment process to Heroku

echo 🚀 Starting SEO Helper Backend Deployment...

REM Check if we're in the right directory
if not exist "server.js" (
    echo ❌ Error: Please run this script from the 'Data Client' directory
    pause
    exit /b 1
)

REM Check if git is initialized
if not exist ".git" (
    echo 📁 Initializing git repository...
    git init
    git add .
    git commit -m "Initial backend deployment"
)

REM Check if Heroku CLI is installed
heroku --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Heroku CLI is not installed. Please install it first:
    echo    https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

REM Get app name from user
set /p APP_NAME="Enter your Heroku app name (e.g., seo-helper-backend): "

if "%APP_NAME%"=="" (
    echo ❌ Error: App name is required
    pause
    exit /b 1
)

REM Create Heroku app
echo 📱 Creating Heroku app: %APP_NAME%
heroku create %APP_NAME%

REM Get OAuth credentials from user
echo.
echo 🔑 Please provide your Webflow OAuth credentials:
set /p OAUTH_CLIENT_ID="OAuth Client ID: "
set /p OAUTH_CLIENT_SECRET="OAuth Client Secret: "

if "%OAUTH_CLIENT_ID%"=="" (
    echo ❌ Error: OAuth Client ID is required
    pause
    exit /b 1
)

if "%OAUTH_CLIENT_SECRET%"=="" (
    echo ❌ Error: OAuth Client Secret is required
    pause
    exit /b 1
)

REM Generate session secret (simple version for Windows)
set SESSION_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM%

REM Set environment variables
echo ⚙️  Setting environment variables...
heroku config:set OAUTH_CLIENT_ID="%OAUTH_CLIENT_ID%" --app %APP_NAME%
heroku config:set OAUTH_CLIENT_SECRET="%OAUTH_CLIENT_SECRET%" --app %APP_NAME%
heroku config:set OAUTH_REDIRECT_URI="https://%APP_NAME%.herokuapp.com/callback" --app %APP_NAME%
heroku config:set SESSION_SECRET="%SESSION_SECRET%" --app %APP_NAME%
heroku config:set NODE_ENV="production" --app %APP_NAME%

REM Deploy to Heroku
echo 🚀 Deploying to Heroku...
git add .
git commit -m "Deploy to Heroku"

REM Add Heroku remote
heroku git:remote -a %APP_NAME%

git push heroku main

REM Test deployment
echo 🧪 Testing deployment...
timeout /t 10 /nobreak >nul
curl -s "https://%APP_NAME%.herokuapp.com/health" | findstr "ok" >nul && echo ✅ Deployment successful! || echo ❌ Deployment test failed

echo.
echo 📋 Deployment Summary:
echo    App URL: https://%APP_NAME%.herokuapp.com
echo    Health Check: https://%APP_NAME%.herokuapp.com/health
echo    OAuth Redirect URI: https://%APP_NAME%.herokuapp.com/callback
echo.
echo 📝 Next Steps:
echo    1. Update your Webflow OAuth app settings:
echo       - Redirect URI: https://%APP_NAME%.herokuapp.com/callback
echo    2. Update your frontend .env file:
echo       - BACKEND_URL=https://%APP_NAME%.herokuapp.com
echo    3. Rebuild your frontend bundle: npm run build
echo.
echo 🎉 Deployment completed!
pause
