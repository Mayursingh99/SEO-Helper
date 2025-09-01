const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const querystring = require('querystring');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
const allowedOrigins = [
  'https://webflow.com',
  'https://*.webflow.com',
  'https://designer.webflow.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:1337' : null
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list or matches webflow pattern
    if (allowedOrigins.some(allowed => 
      allowed === origin || 
      (allowed.includes('*') && origin.includes('webflow.com'))
    )) {
      return callback(null, true);
    }
    
    // Allow in development
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
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
  httpOnly: true
}));

// Webflow API configuration
const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI;

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
      pages: '/pages',
      site: '/site',
      logout: '/logout'
    }
  };
  
  res.json(health);
});

// OAuth Authorization endpoint
app.get('/auth', (req, res) => {
  if (!OAUTH_CLIENT_ID || !OAUTH_REDIRECT_URI) {
    return res.status(500).json({ 
      error: 'OAuth configuration missing',
      message: 'Please configure OAUTH_CLIENT_ID and OAUTH_REDIRECT_URI'
    });
  }

  const state = Math.random().toString(36).substring(7);
  const authorizeUrl = `https://webflow.com/oauth/authorize?client_id=${OAUTH_CLIENT_ID}&response_type=code&scope=sites:read%20pages:read%20pages:write&redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&state=${state}`;
  
  res.json({ 
    authorizeUrl: authorizeUrl,
    message: 'OAuth authorization URL generated'
  });
});

// OAuth Callback endpoint
app.get('/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.status(400).json({ 
        error: 'OAuth authorization failed',
        details: error_description || error
      });
    }

    if (!code) {
      return res.status(400).json({ 
        error: 'Missing authorization code',
        message: 'No authorization code received from Webflow'
      });
    }

    if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET || !OAUTH_REDIRECT_URI) {
      return res.status(500).json({ 
        error: 'OAuth configuration missing',
        message: 'Please configure all OAuth environment variables'
      });
    }

    // Exchange code for access token
    const tokenData = querystring.stringify({
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
    code: code,
      grant_type: 'authorization_code',
      redirect_uri: OAUTH_REDIRECT_URI
    });

    const tokenResponse = await axios.post('https://webflow.com/oauth/access_token', tokenData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!tokenResponse.data.access_token) {
      throw new Error('No access token received from Webflow');
    }

    const accessToken = tokenResponse.data.access_token;

    // Get user's sites to determine site ID
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
    
    // Store token in session
    setUserToken(req, accessToken);
    req.session.siteId = siteId;

    console.log(`OAuth successful for site: ${siteId}`);

    res.json({ 
      success: true, 
      message: 'Authorization successful',
      siteId: siteId,
      siteName: sitesResponse.data.sites[0].name || sitesResponse.data.sites[0].shortName
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ 
      error: 'OAuth callback failed',
      details: error.message || 'Unknown error occurred'
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

    // Fetch pages from Webflow API
    const response = await axios.get(`${WEBFLOW_API_BASE}/sites/${siteId}/pages`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
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

    // Update page via Webflow API
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
