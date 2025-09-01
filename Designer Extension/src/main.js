import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { ThemeProvider } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
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
  const [backendUrl, setBackendUrl] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  // SEO Analytics calculations
  const seoAnalytics = useMemo(() => {
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
      
      const boot = async () => {
        try {
          // Get site info from Webflow Designer Extension API
          const info = await webflow.getSiteInfo();
          const siteId = info.siteId;
          const displayName = info?.siteName || info?.displayName || info?.shortName || siteId;
          const site = { id: siteId, displayName };

          setSelectedSite(site);
          
          // Set backend URL for API calls - use environment variable or default to production
          const backendUrl = process.env.BACKEND_URL || 'https://seo-helper-backend.herokuapp.com';
          setBackendUrl(backendUrl);
          
          // Check if user is already authorized
          await checkAuthorization();
        } catch (e) {
          setError(`Initialization error: ${e?.message || "Failed to initialize"}`);
        }
      };

      boot();
    } else {
      // Development mode - show demo data
      setSelectedSite({ id: "demo-site", displayName: "Demo Site" });
      setPages([
        { id: "1", title: "Home", slug: "home", seo: { title: "Welcome to Our Site", description: "The best website ever" } },
        { id: "2", title: "About", slug: "about", seo: { title: "About Us", description: "" } },
        { id: "3", title: "Contact", slug: "contact", seo: { title: "", description: "Get in touch with us" } },
        { id: "4", title: "Services", slug: "services", seo: { title: "", description: "" } }
      ]);
    }
  }, []);

  const checkAuthorization = async () => {
    try {
      const response = await axios.get(`${backendUrl}/pages`, {
        withCredentials: true,
        timeout: 5000
      });
      
      if (response.data.pages) {
        setIsAuthorized(true);
        setPages(response.data.pages);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setIsAuthorized(false);
      }
    }
  };

  const startOAuth = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get OAuth authorization URL
      const response = await axios.get(`${backendUrl}/auth`);
      const { authorizeUrl } = response.data;
      
      // Open OAuth popup
      const popup = window.open(
        authorizeUrl,
        'webflow-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // Poll for popup closure and check authorization
      const checkClosed = setInterval(async () => {
        if (popup.closed) {
          clearInterval(checkClosed);
          await checkAuthorization();
          setLoading(false);
        }
      }, 1000);
      
    } catch (error) {
      setError("Failed to start OAuth authorization");
      setLoading(false);
    }
  };

  const getSiteData = async () => {
    try {
      setError("");
      setSuccessMessage("");
      
      if (typeof webflow !== 'undefined') {
        const info = await webflow.getSiteInfo();
        const siteId = info.siteId;
        const displayName = info?.siteName || info?.displayName || info?.shortName || siteId;
        const site = { id: siteId, displayName };
        setSelectedSite(site);
        
        if (isAuthorized) {
          await getPages();
        }
      } else {
        // Development mode - refresh demo data
        setSuccessMessage("Demo mode - data refreshed!");
        setTimeout(() => setSuccessMessage(""), 2000);
      }
    } catch (e) {
      setError(e?.message || "Failed to reload site info");
    }
  };

  const getPages = async () => {
    try {
      setLoading(true);
      setError("");
      
      if (typeof webflow !== 'undefined' && backendUrl && isAuthorized) {
        // Use Express backend to get pages
        const response = await axios.get(`${backendUrl}/pages`, {
          withCredentials: true,
          timeout: 10000
        });
        
        const pagesData = response.data.pages || [];
        setPages(pagesData);
      } else {
        // Development mode - use demo data
        setPages([
          { id: "1", title: "Home", slug: "home", seo: { title: "Welcome to Our Site", description: "The best website ever" } },
          { id: "2", title: "About", slug: "about", seo: { title: "About Us", description: "" } },
          { id: "3", title: "Contact", slug: "contact", seo: { title: "", description: "Get in touch with us" } },
          { id: "4", title: "Services", slug: "services", seo: { title: "", description: "" } }
        ]);
      }
      
      setEditingPage(null);
      setSeoTitle("");
      setSeoDescription("");
      
      // Show success message briefly
      setSuccessMessage("Pages loaded successfully!");
      setTimeout(() => setSuccessMessage(""), 2000);
      
    } catch (e) {
      if (e.response?.status === 401) {
        setIsAuthorized(false);
        setError("Please re-authorize the app to continue");
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to load pages");
      }
    } finally {
      setLoading(false);
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
    if (!editingPage || !selectedSite) return;
    
    try {
      setSaving(true);
      setError("");
      
      if (typeof webflow !== 'undefined' && backendUrl && isAuthorized) {
        // Use Express backend to update page SEO
        await axios.patch(`${backendUrl}/pages/${editingPage.id}`, {
          seo: {
            title: seoTitle || "",
            description: seoDescription || ""
          }
        }, {
          withCredentials: true,
          timeout: 10000
        });
        
        // Refresh pages to get updated data
        await getPages();
      } else {
        // Development mode - simulate update
        setTimeout(() => {
          setSuccessMessage("SEO updated successfully! (Demo mode)");
          setTimeout(() => setSuccessMessage(""), 3000);
        }, 1000);
      }
      
      setEditingPage(null);
      setSuccessMessage("SEO updated successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
    } catch (e) {
      if (e.response?.status === 401) {
        setIsAuthorized(false);
        setError("Please re-authorize the app to continue");
      } else {
        setError(e?.response?.data?.message || e?.message || "Failed to save SEO");
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
          {/* Header with gradient background */}
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
                    onClick={getSiteData} 
                    disabled={loading}
                    sx={{ 
                      background: "rgba(102, 126, 234, 0.1)",
                      "&:hover": { background: "rgba(102, 126, 234, 0.2)" }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
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

          {/* Authorization Required */}
          {!isAuthorized && typeof webflow !== 'undefined' && (
            <Card sx={{ 
              borderRadius: 2, 
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
              mb: 1
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#2c3e50" }}>
                  🔐 Authorization Required
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: "#666" }}>
                  To access your pages and update SEO, you need to authorize the app with your Webflow account.
                </Typography>
                
                <Button 
                  variant="contained" 
                  onClick={startOAuth}
                  disabled={loading}
                  sx={{ 
                    borderRadius: 2,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)"
                    }
                  }}
                >
                  {loading ? "Authorizing..." : "🔐 Authorize with Webflow"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Content Grid */}
          {isAuthorized && (
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
