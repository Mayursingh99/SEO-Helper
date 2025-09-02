import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { ThemeProvider } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import theme from "./theme";

const App = () => {
  const [selectedSite, setSelectedSite] = useState(null);
  const [pages, setPages] = useState([]);
  const [editingPage, setEditingPage] = useState(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Backend URL - use environment variable or default to production
  const BACKEND_URL = process.env.BACKEND_URL || 'https://seo-helper.onrender.com';
  
  // Create axios instance with credentials
  const api = axios.create({
    baseURL: BACKEND_URL,
    withCredentials: true,
    timeout: 10000
  });

  // SEO Analytics calculations
  const seoAnalytics = React.useMemo(() => {
    if (!pages.length) return null;
    
    const totalPages = pages.length;
    const pagesWithTitle = pages.filter(p => p.seo?.title?.trim()).length;
    const pagesWithDescription = pages.filter(p => p.seo?.description?.trim()).length;
    const pagesWithBoth = pages.filter(p => p.seo?.title?.trim() && p.seo?.description?.trim()).length;
    const pagesWithNeither = pages.filter(p => !p.seo?.title?.trim() && !p.seo?.description?.trim()).length;
    
    const titleProgress = (pagesWithTitle / totalPages) * 100;
    const descriptionProgress = (pagesWithDescription / totalPages) * 100;
    const overallProgress = (pagesWithBoth / totalPages) * 100;
    
    return {
      totalPages,
      pagesWithTitle,
      pagesWithDescription,
      pagesWithBoth,
      pagesWithNeither,
      titleProgress,
      descriptionProgress,
      overallProgress
    };
  }, [pages]);

  useEffect(() => {
    // Check if we're in Webflow environment
    if (typeof webflow !== 'undefined') {
      webflow.setExtensionSize("large");
      
      const initializeApp = async () => {
        try {
          // Get site info from Webflow Designer Extension API
          // Reference: https://developers.webflow.com/designer/reference/pages-overview
          const info = await webflow.getSiteInfo();
          const siteId = info.siteId;
          const displayName = info?.siteName || info?.displayName || info?.shortName || siteId;
          const site = { id: siteId, displayName };
          
          setSelectedSite(site);
          
          // Check if user is already authenticated (local storage + backend check)
          // First check if they're authorized for this site
          const isAuthorized = await isUserAuthorizedForSite();
          if (isAuthorized) {
            await checkPersistentAuthentication();
          } else {
            // User needs to authorize for this site
            setIsAuthenticated(false);
            setPages([]);
          }
        } catch (e) {
          console.error('Initialization error:', e);
          setError(`Failed to initialize: ${e.message}`);
        }
      };

      initializeApp();
    } else {
      // Not in Webflow environment - show error
      setError("This app must be run within the Webflow Designer");
    }

    // Add message listener for OAuth callbacks from popup
    // Following Webflow Hybrid App guidelines for secure communication
    const handleMessage = (event) => {
      // Only accept messages from our backend domain
      if (event.origin !== BACKEND_URL.replace('https://', '').replace('http://', '')) {
        return;
      }

      if (event.data.type === 'OAUTH_SUCCESS') {
        const { accessToken, siteId, siteShortName } = event.data;
        handleOAuthCallback(accessToken, siteId, siteShortName);
      } else if (event.data.type === 'OAUTH_ERROR') {
        setError(`OAuth failed: ${event.data.error}`);
        if (event.data.details) {
          console.error('OAuth error details:', event.data.details);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check if user is already authorized for current site
  const isUserAuthorizedForSite = async () => {
    try {
      if (typeof webflow === 'undefined') return false;
      
      const siteInfo = await webflow.getSiteInfo();
      const storedToken = localStorage.getItem('seo-helper-oauth-token');
      
      if (storedToken) {
        const tokenData = JSON.parse(storedToken);
        // Check if stored token is for the current site
        return tokenData.siteId === siteInfo.siteId;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to check site authorization:', error);
      return false;
    }
  };

  // Check persistent authentication status following Webflow Designer Extension guidelines
  // Reference: https://developers.webflow.com/data/docs/designer-extensions
  const checkPersistentAuthentication = async () => {
    try {
      setError("");
      
      // First, check if we're in a Webflow Designer environment
      if (typeof webflow === 'undefined') {
        setError("This app must be run within the Webflow Designer");
        return;
      }

      // Check local storage for stored OAuth token
      const storedToken = localStorage.getItem('seo-helper-oauth-token');
      const hasStoredToken = storedToken && JSON.parse(storedToken).accessToken;
      
      if (hasStoredToken) {
        // User has stored token, validate it with backend
        try {
          const tokenData = JSON.parse(storedToken);
          
          // Set the token in axios headers for this request
          const tempApi = axios.create({
            baseURL: BACKEND_URL,
            timeout: 10000,
            headers: {
              'Authorization': `Bearer ${tokenData.accessToken}`
            }
          });
          
          // Test if token is still valid by making a request
          const response = await tempApi.get('/pages');
          
          if (response.data.pages) {
            // Token is valid, user is authenticated
            setIsAuthenticated(true);
            setPages(response.data.pages);
            setSuccessMessage("Welcome back! Your pages are loaded.");
            setTimeout(() => setSuccessMessage(""), 3000);
            
            // Update the main api instance with the valid token
            api.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
            return;
          }
        } catch (error) {
          if (error.response?.status === 401) {
            // Token expired, clear stored token and show login
            localStorage.removeItem('seo-helper-oauth-token');
            setIsAuthenticated(false);
            setPages([]);
            console.log('Stored OAuth token expired, re-authorization needed');
          } else {
            // Other error, try to continue with stored token
            console.warn('Token validation failed, using stored token:', error.message);
            setIsAuthenticated(true);
            // Try to get pages again
            await checkAuthenticationStatus();
          }
        }
      } else {
        // No stored token, check if user needs to authorize
        // For Designer Extensions, we should check if the user has authorized the app
        try {
          // Try to get site info using Designer API
          const siteInfo = await webflow.getSiteInfo();
          console.log('Site info retrieved:', siteInfo);
          
          // If we can get site info, the user has access to this site
          // Check if they need to authorize for data access
          setIsAuthenticated(false);
          setPages([]);
        } catch (error) {
          console.error('Failed to get site info:', error);
          setError("Unable to access site information");
        }
      }
    } catch (error) {
      console.error('Persistent authentication check failed:', error);
      setError("Failed to check authentication status");
    }
  };

  const checkAuthenticationStatus = async () => {
    try {
      setError("");
      
      // Check if we have a stored token first
      const storedToken = localStorage.getItem('seo-helper-oauth-token');
      if (storedToken) {
        const tokenData = JSON.parse(storedToken);
        // Set the stored token in headers
        api.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
      }
      
      // Try to get pages with current authorization
      const response = await api.get('/pages');
      
      if (response.data.pages) {
        // User is authenticated
        setIsAuthenticated(true);
        setPages(response.data.pages);
        
        setSuccessMessage("Successfully connected to backend!");
        setTimeout(() => setSuccessMessage(""), 3000);
        
        // Log successful authentication for debugging
        console.log('OAuth callback successful:', { siteId, siteShortName });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // User is not authenticated
        setIsAuthenticated(false);
        setPages([]);
        localStorage.removeItem('seo-helper-oauth-token');
        delete api.defaults.headers.common['Authorization'];
      } else {
        console.error('Authentication check failed:', error);
        setError("Failed to check authentication status");
      }
    }
  };

  // Start OAuth flow following Webflow Designer Extension best practices
  // Reference: https://developers.webflow.com/designer/reference/introduction
  const startOAuthFlow = async () => {
    try {
      setAuthLoading(true);
      setError("");
      
      // First, check if we're in the right context
      if (typeof webflow === 'undefined') {
        throw new Error('This app must be run within the Webflow Designer');
      }

      // Get current site info to ensure we're in the right context
      const siteInfo = await webflow.getSiteInfo();
      console.log('Current site context:', siteInfo);
      
      // Get OAuth authorization URL from backend
      const response = await api.get('/auth');
      const { authorizeUrl } = response.data;
      
      if (!authorizeUrl) {
        throw new Error('No authorization URL received');
      }
      
      // Open OAuth popup with proper dimensions for Designer Extension
      const popup = window.open(
        authorizeUrl,
        'webflow-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes'
      );
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      
      // Focus the popup
      popup.focus();
      
      // Poll for popup closure and check authentication
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setAuthLoading(false);
          
          // Check if authentication was successful and store token
          await checkAuthenticationStatus();
        }
      }, 1000);
      
    } catch (error) {
      console.error('OAuth flow failed:', error);
      setError(`OAuth failed: ${error.message}`);
      setAuthLoading(false);
    }
  };

  // Handle OAuth callback and store access token
  // Following Webflow Hybrid App guidelines
  const handleOAuthCallback = async (accessToken, siteId, siteShortName) => {
    try {
      if (accessToken && siteId) {
        // Store the OAuth access token locally following Webflow best practices
        const tokenData = {
          accessToken: accessToken,
          timestamp: Date.now(),
          siteId: siteId,
          siteShortName: siteShortName,
          lastUsed: Date.now()
        };
        localStorage.setItem('seo-helper-oauth-token', JSON.stringify(tokenData));
        
        // Set the token in axios headers for API calls
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        // Update site information if needed
        if (selectedSite && selectedSite.id !== siteId) {
          setSelectedSite({
            id: siteId,
            displayName: siteShortName || siteId
          });
        }
        
        // Now check authentication status with the stored token
        await checkAuthenticationStatus();
        
        setSuccessMessage('Successfully connected to Webflow!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Failed to handle OAuth callback:', error);
      setError('Failed to complete authentication');
    }
  };

  // Smart refresh that checks authentication status before showing popup
  // Following Webflow Designer Extension best practices
  const refreshData = async () => {
    try {
      setError("");
      setSuccessMessage("");
      
      if (isAuthenticated) {
        // User is authenticated, just refresh pages
        await checkAuthenticationStatus();
      } else {
        // Check if we have a stored token first
        const storedToken = localStorage.getItem('seo-helper-oauth-token');
        if (storedToken) {
          // Try to use stored token first
          await checkPersistentAuthentication();
        } else {
          // No stored token, user needs to authenticate
          await startOAuthFlow();
        }
      }
    } catch (e) {
      setError(`Failed to refresh: ${e.message}`);
    }
  };

  const logout = async () => {
    try {
      // Clear stored OAuth token
      localStorage.removeItem('seo-helper-oauth-token');
      
      // Clear backend session
      await api.post('/logout');
      
      // Reset state
      setIsAuthenticated(false);
      setPages([]);
      setEditingPage(null);
      setSeoTitle("");
      setSeoDescription("");
      
      // Clear authorization header
      delete api.defaults.headers.common['Authorization'];
      
      setSuccessMessage("Logged out successfully");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error('Logout failed:', error);
      // Still clear local state even if backend logout fails
      setIsAuthenticated(false);
      setPages([]);
      delete api.defaults.headers.common['Authorization'];
    }
  };

  const startEditSeo = (page) => {
    setEditingPage(page);
    setSeoTitle(page?.seo?.title || "");
    setSeoDescription(page?.seo?.description || "");
    setError("");
    setSuccessMessage("");
  };

  const saveSeo = async () => {
    if (!editingPage) return;
    
    try {
      setSaving(true);
      setError("");
      
      // Update page SEO via backend API
      await api.patch(`/pages/${editingPage.id}`, {
        seo: {
          title: seoTitle || "",
          description: seoDescription || ""
        }
      });
      
      // Refresh pages to get updated data
      await checkAuthenticationStatus();
      
      setEditingPage(null);
      setSuccessMessage("SEO updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
    } catch (e) {
      if (e.response?.status === 401) {
        setIsAuthenticated(false);
        setError("Authentication expired. Please re-authorize.");
      } else {
        setError(`Failed to save SEO: ${e.response?.data?.message || e.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const getPageStatus = (page) => {
    const hasTitle = page.seo?.title?.trim();
    const hasDescription = page.seo?.description?.trim();
    
    if (hasTitle && hasDescription) return "complete";
    if (hasTitle || hasDescription) return "partial";
    return "missing";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "complete": return "success";
      case "partial": return "warning";
      case "missing": return "error";
      default: return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "complete": return <CheckCircleIcon fontSize="small" />;
      case "partial": return <WarningIcon fontSize="small" />;
      case "missing": return <ErrorIcon fontSize="small" />;
      default: return null;
    }
  };

  const statusChipSx = {
    '& .MuiChip-label': {
      fontSize: '0.875rem',
      fontWeight: 400
    },
    '& .MuiChip-icon': {
      fontSize: '0.875rem'
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: "94vh", 
        width: "95vw",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        p: 2
      }}>
        <Container maxWidth={false} sx={{ p: 0 }}>
          {/* Header */}
          <Box sx={{ 
            background: "rgba(255,255,255,0.95)", 
            backdropFilter: "blur(10px)",
            borderRadius: "12px 12px 0 0",
            p: 2,
            mb: 1,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
          }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, color: "#2c3e50" }}>
                  SEO Helper
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                {selectedSite && (
                  <Chip 
                    label={selectedSite.displayName} 
                    size="small" 
                    sx={{ background: "rgba(102, 126, 234, 0.1)", color: "#667eea" }}
                  />
                )}
                                 <Tooltip title="Refresh data">
                   <IconButton 
                     onClick={refreshData} 
                     disabled={loading || authLoading}
                     sx={{ 
                       background: "rgba(102, 126, 234, 0.1)",
                       "&:hover": { background: "rgba(102, 126, 234, 0.2)" }
                     }}
                   >
                     <RefreshIcon />
                   </IconButton>
                 </Tooltip>
                 
                 {isAuthenticated && (
                   <Tooltip title="Logout">
                     <IconButton 
                       onClick={logout}
                       sx={{ 
                         background: "rgba(231, 76, 60, 0.1)",
                         color: "#e74c3c",
                         "&:hover": { background: "rgba(231, 76, 60, 0.2)" }
                       }}
                     >
                       <InfoIcon />
                     </IconButton>
                   </Tooltip>
                 )}
              </Stack>
            </Stack>
          </Box>

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>
              <AlertTitle sx={{ fontSize: "0.95rem" }}>Error</AlertTitle>
              <Typography variant="body1">{error}</Typography>
            </Alert>
          )}
          
          {successMessage && (
            <Alert severity="success" sx={{ mb: 1, borderRadius: 2 }}>
              <Typography variant="body1">{successMessage}</Typography>
            </Alert>
          )}

          {/* Authentication Required */}
          {!isAuthenticated && (
            <Card sx={{ 
              borderRadius: 2, 
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              mb: 1
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                  🔐 Connect to Webflow
                </Typography>
                                 <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
                   To access and edit your page SEO for this site, you need to authorize this app with your Webflow account. 
                   This is a one-time process per site.
                 </Typography>
                
                <Button 
                  variant="contained" 
                  onClick={startOAuthFlow}
                  disabled={authLoading}
                  sx={{ 
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
                    }
                  }}
                >
                  {authLoading ? "Connecting..." : "🔐 Connect with Webflow"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Content - Only show when authenticated */}
          {isAuthenticated && (
            <Grid container spacing={1}>
              {/* SEO Analytics Dashboard */}
              {seoAnalytics && (
                <Grid item xs={12}>
                  <Card sx={{ 
                    borderRadius: 2, 
                    background: "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                        📊 SEO Overview
                      </Typography>
                      
                      {/* Stats Grid */}
                      <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1.5, 
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            borderRadius: 2,
                            color: "white"
                          }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {seoAnalytics.totalPages}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Total Pages
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1.5, 
                            background: "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
                            borderRadius: 2,
                            color: "white"
                          }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {seoAnalytics.pagesWithBoth}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Complete SEO
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1.5, 
                            background: "linear-gradient(135deg, #f39c12 0%, #e67e22 100%)",
                            borderRadius: 2,
                            color: "white"
                          }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {seoAnalytics.pagesWithTitle + seoAnalytics.pagesWithDescription - (seoAnalytics.pagesWithBoth * 2)}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Partial SEO
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ 
                            textAlign: "center", 
                            p: 1.5, 
                            background: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
                            borderRadius: 2,
                            color: "white"
                          }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {seoAnalytics.pagesWithNeither}
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                              Missing SEO
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* Progress Section */}
                      <Box sx={{ 
                        p: 2, 
                        background: "rgba(102, 126, 234, 0.05)", 
                        borderRadius: 2,
                        border: "1px solid rgba(102, 126, 234, 0.1)"
                      }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#2c3e50" }}>
                            Overall SEO Completion
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#667eea" }}>
                            {Math.round(seoAnalytics.overallProgress)}%
                          </Typography>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={seoAnalytics.overallProgress} 
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            background: "rgba(102, 126, 234, 0.2)",
                            "& .MuiLinearProgress-bar": {
                              background: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
                              borderRadius: 5
                            }
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Page Selection and Editing */}
              <Grid item xs={12}>
                <Card sx={{ 
                  borderRadius: 2, 
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.1)"
                }}>
                  <CardContent sx={{ p: 2 }}>   
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                      ✏️ Edit Page SEO
                    </Typography>
                    
                    <FormControl fullWidth size="small" disabled={!selectedSite || loading} sx={{ mb: 2 }}>
                      <InputLabel id="page-select-label">Select a page to edit</InputLabel>
                      <Select
                        labelId="page-select-label"
                        label="Select a page to edit"
                        value={editingPage?.id || ""}
                        onChange={(e) => {
                          const page = pages.find(p => p.id === e.target.value);
                          if (page) startEditSeo(page);
                        }}
                        renderValue={(value) => {
                          const page = pages.find(p => p.id === value);
                          if (!page) return "Select a page";
                          return (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <span>{page.title}</span>
                              <Chip 
                                label={getPageStatus(page)} 
                                color={getStatusColor(getPageStatus(page))}
                                size="small"
                                icon={getStatusIcon(getPageStatus(page))}
                                sx={statusChipSx}
                              />
                            </Box>
                          );
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 2,
                            background: "rgba(255,255,255,0.8)"
                          }
                        }}
                      >
                        {pages.map(p => (
                          <MenuItem key={p.id} value={p.id}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1">{p.title}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  /{p.slug}
                                </Typography>
                              </Box>
                              <Chip 
                                label={getPageStatus(p)} 
                                color={getStatusColor(getPageStatus(p))}
                                size="small"
                                icon={getStatusIcon(getPageStatus(p))}
                                sx={statusChipSx}
                              />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {editingPage && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        
                        <Box sx={{ 
                          p: 2, 
                          background: "rgba(102, 126, 234, 0.05)", 
                          borderRadius: 2,
                          border: "1px solid rgba(102, 126, 234, 0.1)"
                        }}>
                          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                            📝 Editing: {editingPage.title}
                          </Typography>

                          <Stack spacing={2}>
                            <TextField
                              label="Meta Title"
                              size="small"
                              value={seoTitle}
                              onChange={(e) => setSeoTitle(e.target.value)}
                              inputProps={{ maxLength: 60 }}
                              helperText={`${seoTitle.length}/60 characters`}
                              color={seoTitle.length > 50 ? "warning" : "primary"}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  background: 'rgba(255,255,255,0.8)'
                                },
                                '& .MuiFormHelperText-root': {
                                  fontSize: '0.875rem'
                                }
                              }}
                            />
                            
                            <TextField
                              label="Meta Description"
                              size="small"
                              multiline
                              minRows={3}
                              value={seoDescription}
                              onChange={(e) => setSeoDescription(e.target.value)}
                              inputProps={{ maxLength: 155 }}
                              helperText={`${seoDescription.length}/155 characters`}
                              color={seoDescription.length > 130 ? "warning" : "primary"}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  background: 'rgba(255,255,255,0.8)'
                                },
                                '& .MuiFormHelperText-root': {
                                  fontSize: '0.875rem'
                                }
                              }}
                            />
                            
                            <Stack direction="row" spacing={2}>
                              <Button 
                                variant="contained" 
                                onClick={saveSeo} 
                                disabled={saving}
                                sx={{ 
                                  borderRadius: 2,
                                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                  "&:hover": {
                                    background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
                                  }
                                }}
                              >
                                {saving ? "Saving..." : "💾 Save Changes"}
                              </Button>
                              <Button 
                                variant="outlined" 
                                onClick={() => setEditingPage(null)}
                                sx={{ borderRadius: 2 }}
                              >
                                ❌ Cancel
                              </Button>
                            </Stack>
                          </Stack>
                        </Box>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(<App />);
