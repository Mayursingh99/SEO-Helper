const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const querystring = require('querystring');
const { WebflowClient } = require('webflow-api');
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

// OAuth Authorization endpoint using official Webflow approach
app.get('/auth', (req, res) => {
  if (!OAUTH_CLIENT_ID || !OAUTH_REDIRECT_URI) {
    return res.status(500).json({ 
      error: 'OAuth configuration missing',
      message: 'Please configure OAUTH_CLIENT_ID and OAUTH_REDIRECT_URI'
    });
  }

  const state = Math.random().toString(36).substring(7);
  
  // Use official WebflowClient.authorizeURL as per documentation
  const authorizeUrl = WebflowClient.authorizeURL({
    state: state,
    scope: 'sites:read sites:write',  // Add necessary scopes as per Webflow docs
    clientId: OAUTH_CLIENT_ID,
    redirectUri: OAUTH_REDIRECT_URI,
  });
  
  console.log('OAuth authorization URL generated using official WebflowClient:', {
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: 'sites:read sites:write',
    full_url: authorizeUrl,
    method: 'WebflowClient.authorizeURL'
  });
  
  res.json({ 
    authorizeUrl: authorizeUrl,
    message: 'OAuth authorization URL generated using official Webflow approach',
    scope: 'sites:read sites:write'
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

    // Exchange code for access token using official Webflow approach
    const accessToken = await WebflowClient.getAccessToken({
      clientId: OAUTH_CLIENT_ID,
      clientSecret: OAUTH_CLIENT_SECRET,
      code: code,
      redirect_uri: OAUTH_REDIRECT_URI,
    });

    console.log('Access token received using official WebflowClient:', {
      method: 'WebflowClient.getAccessToken',
      success: !!accessToken
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

    res.json({ 
      success: true, 
      message: 'Hybrid App authorization successful',
      siteId: siteId,
      siteShortName: siteShortName,
      siteName: sitesResponse.data.sites[0].name || sitesResponse.data.sites[0].shortName,
      deepLinkUrl: `https://${siteShortName}.design.webflow.com?app=${OAUTH_CLIENT_ID}`
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Log detailed error information
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
    }
    
    res.status(500).json({ 
      error: 'OAuth callback failed',
      details: error.message || 'Unknown error occurred',
      status: error.response?.status || 'unknown',
      responseData: error.response?.data || 'none'
    });
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
