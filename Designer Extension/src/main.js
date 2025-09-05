import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { ThemeProvider } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import RefreshIcon from "@mui/icons-material/Refresh";
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

  // Backend URL
  const BACKEND_URL = 'https://seo-helper.onrender.com';
  
  // Create axios instance
  const api = axios.create({
    baseURL: BACKEND_URL,
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
          const info = await webflow.getSiteInfo();
          const siteId = info.siteId;
          const displayName = info?.siteName || info?.displayName || info?.shortName || siteId;
          const site = { id: siteId, displayName };
          
          setSelectedSite(site);
          
          // Check if we have a stored OAuth token
          const storedToken = localStorage.getItem('seo-helper-oauth-token');
          if (storedToken) {
            try {
              const tokenData = JSON.parse(storedToken);
              // Check if token is for current site
              if (tokenData.siteId === siteId) {
                // Set token in headers
                api.defaults.headers.common['Authorization'] = `Bearer ${tokenData.accessToken}`;
                // Try to load pages
                await loadPages();
              } else {
                // Token is for different site, clear it
                localStorage.removeItem('seo-helper-oauth-token');
                setIsAuthenticated(false);
              }
            } catch (error) {
              console.error('Failed to parse stored token:', error);
              localStorage.removeItem('seo-helper-oauth-token');
              setIsAuthenticated(false);
            }
          } else {
            // No stored token, user needs to authenticate
            setIsAuthenticated(false);
            console.log('No stored OAuth token found. User needs to authenticate.');
          }
        } catch (e) {
          console.error('Initialization error:', e);
          setError(`Failed to initialize: ${e.message}`);
        }
      };

      initializeApp();
    } else {
      setError("This app must be run within the Webflow Designer");
    }

    // Add message listener for OAuth callbacks
    const handleMessage = (event) => {
      // Only accept messages from our backend domain
      const allowedOrigin = BACKEND_URL.replace('https://', '').replace('http://', '');
      console.log('Message received from origin:', event.origin, 'Expected:', allowedOrigin);
      
      if (event.origin !== allowedOrigin) {
        console.log('Message origin mismatch, ignoring');
        return;
      }

      console.log('OAuth message received:', event.data);

      if (event.data.type === 'OAUTH_SUCCESS') {
        const { accessToken, siteId, siteShortName } = event.data;
        handleOAuthSuccess(accessToken, siteId, siteShortName);
      } else if (event.data.type === 'OAUTH_ERROR') {
        setError(`OAuth failed: ${event.data.error}`);
      }
    };

    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Load pages from backend
  const loadPages = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await api.get('/pages');
      
      if (response.data && response.data.pages) {
        setPages(response.data.pages);
        setIsAuthenticated(true);
        setSuccessMessage(`Successfully loaded ${response.data.pages.length} pages!`);
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        throw new Error('Invalid response format from API');
      }
      
    } catch (error) {
      console.error('Failed to load pages:', error);
      
      if (error.response?.status === 401) {
        setError("Authentication failed. Please re-authorize the app.");
        setIsAuthenticated(false);
        setPages([]);
        localStorage.removeItem('seo-helper-oauth-token');
        delete api.defaults.headers.common['Authorization'];
      } else if (error.response?.status === 404) {
        setError("Pages endpoint not found. Please check backend configuration.");
      } else if (error.response?.status >= 500) {
        setError("Backend server error. Please try again later.");
      } else {
        setError(`Failed to load pages: ${error.message}`);
      }
      
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  // Start OAuth 2.0 authentication flow as per Webflow documentation
  // Reference: https://developers.webflow.com/data/reference/oauth-app
  const startOAuth = async () => {
    try {
      setAuthLoading(true);
      setError("");
      
      // Open OAuth popup to redirect to Webflow authorization
      const popup = window.open(
        `${BACKEND_URL}/auth`,
        'webflow-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,location=yes'
      );
      
      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }
      
      // Store popup reference
      window.webflowOAuthPopup = popup;
      
      // Check for popup closure
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.webflowOAuthPopup = null;
          
          // Popup closed, but don't automatically try to load pages
          // The OAuth success message will handle authentication
          console.log('OAuth popup closed');
        }
      }, 1000);
      
    } catch (error) {
      console.error('OAuth failed:', error);
      setError(`OAuth failed: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };


  // Handle OAuth success
  const handleOAuthSuccess = async (accessToken, siteId, siteShortName) => {
    try {
      console.log('OAuth success received:', { accessToken: accessToken ? 'present' : 'missing', siteId, siteShortName });
      
      // Store the token
      const tokenData = {
        accessToken: accessToken,
        timestamp: Date.now(),
        siteId: siteId,
        siteShortName: siteShortName
      };
      localStorage.setItem('seo-helper-oauth-token', JSON.stringify(tokenData));
      console.log('OAuth token stored in localStorage');
      
      // Set token in headers
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      console.log('Authorization header set');
      
      // Update site info if needed
      if (selectedSite && selectedSite.id !== siteId) {
        setSelectedSite({
          id: siteId,
          displayName: siteShortName || siteId
        });
      }
      
      // Load pages
      console.log('Attempting to load pages...');
      await loadPages();
      
      setSuccessMessage('Successfully connected to Webflow!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Failed to handle OAuth success:', error);
      setError('Failed to complete authentication');
    }
  };

  // Refresh data
  const refreshData = async () => {
    try {
      setError("");
      setSuccessMessage("");
      
      if (isAuthenticated) {
        await loadPages();
      } else {
        await startOAuth();
      }
    } catch (e) {
      setError(`Failed to refresh: ${e.message}`);
    }
  };

  // Logout
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
      // Still clear local state
      setIsAuthenticated(false);
      setPages([]);
      delete api.defaults.headers.common['Authorization'];
    }
  };

  // Start editing SEO
  const startEditSeo = (page) => {
    setEditingPage(page);
    setSeoTitle(page?.seo?.title || "");
    setSeoDescription(page?.seo?.description || "");
    setError("");
    setSuccessMessage("");
  };

  // Save SEO
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
      await loadPages();
      
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

  // Get page status
  const getPageStatus = (page) => {
    const hasTitle = page.seo?.title?.trim();
    const hasDescription = page.seo?.description?.trim();
    
    if (hasTitle && hasDescription) return "complete";
    if (hasTitle || hasDescription) return "partial";
    return "missing";
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case "complete": return "success";
      case "partial": return "warning";
      case "missing": return "error";
      default: return "default";
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case "complete": return <CheckCircleIcon fontSize="small" />;
      case "partial": return <WarningIcon fontSize="small" />;
      case "missing": return <ErrorIcon fontSize="small" />;
      default: return null;
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
                      <Typography variant="body2">Logout</Typography>
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </Stack>
          </Box>

          {/* Error/Success Messages */}
          {error && (
            <Alert severity="error" sx={{ mb: 1, borderRadius: 2 }}>
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
                </Typography>
                
                <Button 
                  variant="contained" 
                  onClick={startOAuth}
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
