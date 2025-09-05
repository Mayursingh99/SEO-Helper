const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const querystring = require('querystring');
const { WebflowClient } = require('webflow-api');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
const allowedOrigins = [
  'https://webflow.com',
  'https://designer.webflow.com',
  'https://seo-helper.onrender.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:1337' : null
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all Webflow domains and subdomains
    if (origin.includes('webflow.com') || origin.includes('webflow-ext.com')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow Render domain
    if (origin && origin.includes('onrender.com')) {
      return callback(null, true);
    }
    
    // Allow in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    console.log('CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'seo-helper-session',
  keys: [process.env.SESSION_SECRET || 'default-secret-key'],
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'none' // Allow cross-site cookies for Webflow extensions
}));

// Webflow API configuration
const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

// Session management
const SESSION_SECRET = process.env.SESSION_SECRET || 'default-session-secret';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Store active sessions (in production, use Redis or database)
const activeSessions = new Map();

// Helper function to get user's access token
const getUserToken = (req) => {
  return req.session.accessToken;
};

// Helper function to set user's access token
const setUserToken = (req, token) => {
  req.session.accessToken = token;
};

// Helper function to clear user's session
const clearUserSession = (req) => {
  req.session = null;
};

// Helper function to generate session token
const generateSessionToken = (userId, siteId) => {
  const sessionId = crypto.randomUUID();
  const sessionData = {
    userId,
    siteId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  // Store session data
  activeSessions.set(sessionId, sessionData);
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      sessionId,
      userId,
      siteId,
      type: 'session'
    },
    SESSION_SECRET,
    { expiresIn: '24h' }
  );
  
  return token;
};

// Helper function to verify session token
const verifySessionToken = (token) => {
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    
    if (decoded.type !== 'session') {
      return null;
    }
    
    const sessionData = activeSessions.get(decoded.sessionId);
    if (!sessionData || sessionData.expiresAt < Date.now()) {
      activeSessions.delete(decoded.sessionId);
      return null;
    }
    
    return {
      userId: decoded.userId,
      siteId: decoded.siteId,
      sessionId: decoded.sessionId
    };
  } catch (error) {
    return null;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    message: 'SEO Helper Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    oauth: {
      configured: !!(OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET && OAUTH_REDIRECT_URI),
      clientId: OAUTH_CLIENT_ID ? `${OAUTH_CLIENT_ID.substring(0, 8)}...` : 'not set',
      redirectUri: OAUTH_REDIRECT_URI || 'not set'
    },
    endpoints: {
      auth: '/auth',
      callback: '/callback',
      deepLink: '/deep-link',
      pages: '/pages',
      pageMetadata: '/pages/:id',
      updatePage: 'PATCH /pages/:id',
      site: '/site',
      logout: '/logout'
    }
  };
  
  res.json(health);
});

// Session check endpoint for debugging
app.get('/session', (req, res) => {
  const sessionInfo = {
    hasSession: !!req.session,
    hasAccessToken: !!req.session?.accessToken,
    hasSiteId: !!req.session?.siteId,
    sessionId: req.sessionID,
    timestamp: new Date().toISOString()
  };
  
  res.json(sessionInfo);
});

// Token verification endpoint for Designer Extension
app.post('/auth/verify-token', async (req, res) => {
  try {
    const { accessToken, siteId } = req.body;

    console.log('Token verification request received:', { 
      accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'missing',
      siteId: siteId 
    });

    if (!accessToken || !siteId) {
      console.log('Missing required parameters');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Both accessToken and siteId are required'
      });
    }

    // Verify token with Webflow
    console.log('Verifying token with Webflow API...');
    const tokenResponse = await axios.get(`${WEBFLOW_API_BASE}/token/authorized_by`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    console.log('Webflow API response:', tokenResponse.data);

    if (!tokenResponse.data || !tokenResponse.data.user) {
      console.log('Invalid token response from Webflow');
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Failed to verify token with Webflow'
      });
    }

    const userId = tokenResponse.data.user.id;
    const userEmail = tokenResponse.data.user.email;

    // Store user info in session
    req.session.userId = userId;
    req.session.userEmail = userEmail;
    req.session.siteId = siteId;
    req.session.accessToken = accessToken;

    console.log(`Token verification successful for user: ${userEmail} (${userId}) on site: ${siteId}`);

    res.json({
      success: true,
      user: {
        id: userId,
        email: userEmail
      },
      siteId: siteId,
      message: 'Token verified successfully'
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid or expired',
        details: error.response?.data || 'No additional details'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Token verification failed',
      message: error.message || 'Unknown error occurred',
      details: error.response?.data || 'No additional details'
    });
  }
});

// OAuth Authorization endpoint using official Webflow OAuth 2.0 flow
// Reference: https://developers.webflow.com/data/reference/oauth-app
app.get('/auth', (req, res) => {
  if (!OAUTH_CLIENT_ID || !OAUTH_REDIRECT_URI) {
    return res.status(500).json({ 
      error: 'OAuth configuration missing',
      message: 'Please configure OAUTH_CLIENT_ID and OAUTH_REDIRECT_URI'
    });
  }

  const state = Math.random().toString(36).substring(7);
  
  // Use official WebflowClient.authorizeURL as per Webflow documentation
  // Reference: https://developers.webflow.com/data/reference/oauth-app
  const authorizeUrl = WebflowClient.authorizeURL({
    state: state,
    scope: 'sites:read sites:write pages:read pages:write authorized_user:read',
    clientId: OAUTH_CLIENT_ID,
    redirectUri: OAUTH_REDIRECT_URI,
  });
  
  console.log('OAuth authorization URL generated using official WebflowClient:', {
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: 'sites:read sites:write pages:read pages:write authorized_user:read',
    full_url: authorizeUrl,
    method: 'WebflowClient.authorizeURL'
  });
  
  // Redirect to Webflow authorization screen as per OAuth 2.0 specification
  res.redirect(authorizeUrl);
});

// OAuth Callback endpoint
app.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('OAuth error:', error, error_description);
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; }
            .error { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ OAuth Error</h2>
            <p>Error: ${error}</p>
            <p>Details: ${error_description || 'No additional details'}</p>
            <button onclick="window.close()" style="padding: 10px 20px; border: none; border-radius: 5px; background: white; color: #e74c3c; cursor: pointer;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: '${error}',
                details: '${error_description || 'No additional details'}'
              }, '*');
            }
          </script>
        </body>
        </html>
      `;
      return res.send(errorHtml);
    }

    if (!code) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; }
            .error { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Missing Authorization Code</h2>
            <p>No authorization code received from Webflow</p>
            <button onclick="window.close()" style="padding: 10px 20px; border: none; border-radius: 5px; background: white; color: #e74c3c; cursor: pointer;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'Missing authorization code'
              }, '*');
            }
          </script>
        </body>
        </html>
      `;
      return res.send(errorHtml);
    }

    if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI) {
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth Configuration Error</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; }
            .error { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>❌ Configuration Error</h2>
            <p>OAuth environment variables are not properly configured</p>
            <p>Please check: OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI</p>
            <button onclick="window.close()" style="padding: 10px 20px; border: none; border-radius: 5px; background: white; color: #e74c3c; cursor: pointer;">Close Window</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'OAuth configuration missing'
              }, '*');
            }
          </script>
        </body>
        </html>
      `;
      return res.send(errorHtml);
    }

    // Exchange code for access token using official Webflow OAuth 2.0 approach
    // Reference: https://developers.webflow.com/data/reference/oauth-app
    const accessToken = await WebflowClient.getAccessToken({
      clientId: OAUTH_CLIENT_ID,
      clientSecret: OAUTH_CLIENT_SECRET,
      code: code,
      redirectUri: OAUTH_REDIRECT_URI, // Must match exactly
    });

    if (!accessToken) {
      throw new Error('Failed to obtain access token from Webflow');
    }

    console.log('Access token received using official WebflowClient:', {
      method: 'WebflowClient.getAccessToken',
      success: !!accessToken,
      tokenLength: accessToken.length
    });

    // For Hybrid Apps: Get user info using official Webflow Data API v2
    const userResponse = await axios.get(`${WEBFLOW_API_BASE}/token/authorized_by`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    // Get user's sites for Hybrid App functionality
    const sitesResponse = await axios.get(`${WEBFLOW_API_BASE}/sites`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!sitesResponse.data.sites || sitesResponse.data.sites.length === 0) {
      throw new Error('No sites found for user');
    }

    const siteId = sitesResponse.data.sites[0].id;
    const siteShortName = sitesResponse.data.sites[0].shortName;
    
    // Store tokens in session for Hybrid App
    setUserToken(req, accessToken);
    req.session.siteId = siteId;
    req.session.siteShortName = siteShortName;
    req.session.userId = userResponse.data.user?.id;

    console.log(`Hybrid App OAuth successful for site: ${siteId} (${siteShortName})`);

    // Return HTML that will send the token to the parent window and close
    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
          .success { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
          .spinner { border: 3px solid rgba(255,255,255,0.3); border-top: 3px solid white; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✅ Authorization Successful!</h2>
          <p>You can now close this window and return to the app.</p>
          <div class="spinner"></div>
          <p><small>This window will close automatically...</small></p>
        </div>
        <script>
          // Send the access token to the parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              accessToken: '${accessToken}',
              siteId: '${siteId}',
              siteShortName: '${siteShortName}'
            }, '*');
            
            // Close the popup after a short delay
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            // Fallback if no opener (direct navigation)
            localStorage.setItem('seo-helper-oauth-token', JSON.stringify({
              accessToken: '${accessToken}',
              siteId: '${siteId}',
              siteShortName: '${siteShortName}',
              timestamp: Date.now()
            }));
            
            // Redirect to a success page or close
            setTimeout(() => {
              window.close();
            }, 2000);
          }
        </script>
      </body>
      </html>
    `;

    res.send(successHtml);

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
    }
    
    // Return error HTML
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; }
          .error { background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>❌ Authorization Failed</h2>
          <p>Error: ${error.message || 'Unknown error occurred'}</p>
          <p>Please try again or contact support.</p>
          <button onclick="window.close()" style="padding: 10px 20px; border: none; border-radius: 5px; background: white; color: #e74c3c; cursor: pointer;">Close Window</button>
        </div>
        <script>
          // Send error to parent window
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_ERROR',
              error: '${error.message || 'Unknown error occurred'}'
            }, '*');
          }
        </script>
      </body>
      </html>
    `;
    
    res.send(errorHtml);
  }
});

// Deep linking endpoint for Hybrid App (as per Webflow docs)
app.get('/deep-link', async (req, res) => {
  try {
    const accessToken = getUserToken(req);
    const siteShortName = req.session.siteShortName;

    if (!accessToken || !siteShortName) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please complete OAuth authorization first',
        authorizeUrl: '/auth'
      });
    }

    // Generate deep link according to Webflow documentation
    const deepLinkUrl = `https://${siteShortName}.design.webflow.com?app=${OAUTH_CLIENT_ID}`;
    
    res.json({ 
      deepLinkUrl: deepLinkUrl,
      siteShortName: siteShortName,
      clientId: OAUTH_CLIENT_ID,
      message: 'Deep link generated for Designer Extension'
    });

  } catch (error) {
    console.error('Error generating deep link:', error);
    res.status(500).json({ 
      error: 'Failed to generate deep link',
      details: error.message
    });
  }
});

// Get pages endpoint
app.get('/pages', async (req, res) => {
  try {
    const accessToken = getUserToken(req);
    const siteId = req.session.siteId;

    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please authorize the app first',
        authorizeUrl: '/auth'
      });
    }

    if (!siteId) {
      return res.status(400).json({ 
        error: 'No site ID found',
        message: 'Please complete OAuth authorization first'
      });
    }

    // Fetch pages from Webflow Data API v2 using official endpoint
    // Reference: https://developers.webflow.com/data/reference/pages-and-components/pages/list
    const response = await axios.get(`${WEBFLOW_API_BASE}/sites/${siteId}/pages`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      params: {
        limit: 100, // Get up to 100 pages
        offset: 0
      }
    });

    const pages = response.data.pages || [];
    
    // Add SEO status to each page
    const pagesWithSeoStatus = pages.map(page => {
      const hasTitle = page.seo?.title?.trim();
      const hasDescription = page.seo?.description?.trim();
      
      let seoStatus = 'missing';
      if (hasTitle && hasDescription) {
        seoStatus = 'complete';
      } else if (hasTitle || hasDescription) {
        seoStatus = 'partial';
      }

      return {
        ...page,
        seoStatus
      };
    });

    res.json({ 
      pages: pagesWithSeoStatus,
      totalPages: pagesWithSeoStatus.length,
      siteId: siteId
    });

  } catch (error) {
    console.error('Error fetching pages:', error);
    
    if (error.response?.status === 401) {
      clearUserSession(req);
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please re-authorize the app',
        authorizeUrl: '/auth'
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch pages',
      details: error.message || 'Unknown error occurred'
    });
  }
});

// Update page SEO endpoint
app.patch('/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { seo } = req.body;
    const accessToken = getUserToken(req);

    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please authorize the app first',
        authorizeUrl: '/auth'
      });
    }

    if (!seo || (!seo.title && !seo.description)) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Please provide title or description to update'
      });
    }

    // Update page via Webflow Data API v2 using official endpoint
    // Reference: https://developers.webflow.com/data/reference/pages-and-components/pages/update-page-settings
    const response = await axios.patch(`${WEBFLOW_API_BASE}/pages/${id}`, {
      seo: {
        title: seo.title || '',
        description: seo.description || ''
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true,
      message: 'Page SEO updated successfully',
      page: response.data
    });

  } catch (error) {
    console.error('Error updating page SEO:', error);
    
    if (error.response?.status === 401) {
      clearUserSession(req);
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please re-authorize the app',
        authorizeUrl: '/auth'
      });
    }

    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'Page not found',
        message: 'The specified page could not be found'
      });
    }

    res.status(500).json({ 
      error: 'Failed to update page SEO',
      details: error.message || 'Unknown error occurred'
    });
  }
});

// Get individual page metadata endpoint using official Webflow Data API v2
// Reference: https://developers.webflow.com/data/reference/pages-and-components/pages/get-metadata
app.get('/pages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const accessToken = getUserToken(req);

    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please authorize the app first',
        authorizeUrl: '/auth'
      });
    }

    // Get page metadata from Webflow Data API v2
    const response = await axios.get(`${WEBFLOW_API_BASE}/pages/${id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    res.json({ 
      page: response.data,
      apiVersion: 'v2',
      endpoint: `/pages/${id}`
    });

  } catch (error) {
    console.error('Error fetching page metadata:', error);
    
    if (error.response?.status === 401) {
      clearUserSession(req);
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please re-authorize the app',
        authorizeUrl: '/auth'
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch page metadata',
      details: error.message
    });
  }
});

// Get site info endpoint
app.get('/site', async (req, res) => {
  try {
    const accessToken = getUserToken(req);
    const siteId = req.session.siteId;

    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please authorize the app first',
        authorizeUrl: '/auth'
      });
    }

    if (!siteId) {
      return res.status(400).json({ 
        error: 'No site ID found',
        message: 'Please complete OAuth authorization first'
      });
    }

    // Fetch site info from Webflow API
    const response = await axios.get(`${WEBFLOW_API_BASE}/sites/${siteId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    res.json({ 
      site: response.data,
      siteId: siteId
    });

  } catch (error) {
    console.error('Error fetching site info:', error);
    
    if (error.response?.status === 401) {
      clearUserSession(req);
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please re-authorize the app',
        authorizeUrl: '/auth'
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch site info',
      details: error.message || 'Unknown error occurred'
    });
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  clearUserSession(req);
  res.json({ 
    success: true,
    message: 'Logged out successfully'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SEO Helper Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 OAuth login: http://localhost:${PORT}/auth`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
