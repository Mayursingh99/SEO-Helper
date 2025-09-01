import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";

const App = () => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (typeof webflow !== 'undefined') {
      webflow.setExtensionSize("large");
      loadPages();
    } else {
      // Development mode - demo data
      setPages([
        { id: "1", title: "Home", seo: { title: "Welcome to Our Site", description: "The best website ever" } },
        { id: "2", title: "About", seo: { title: "About Us", description: "" } },
        { id: "3", title: "Contact", seo: { title: "", description: "Get in touch with us" } },
        { id: "4", title: "Services", seo: { title: "", description: "" } }
      ]);
    }
  }, []);

  const loadPages = async () => {
    try {
      setLoading(true);
      setError("");
      
      if (typeof webflow !== 'undefined') {
        // Use Webflow's built-in methods
        const siteInfo = await webflow.getSiteInfo();
        console.log("Site info:", siteInfo);
        
        // Try to get pages using Webflow's API
        const pagesData = await webflow.getPages();
        console.log("Pages data:", pagesData);
        
        setPages(pagesData || []);
      }
    } catch (error) {
      console.error("Error loading pages:", error);
      setError("Error loading pages: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveSeo = async () => {
    if (!selectedPage) return;
    
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      
      if (typeof webflow !== 'undefined') {
        // Use Webflow's built-in page update method
        await webflow.updatePage(selectedPage.id, {
          seo: {
            title: seoTitle,
            description: seoDescription
          }
        });
        
        setSuccess("SEO updated successfully!");
        loadPages(); // Refresh data
      } else {
        // Demo mode
        setSuccess("Demo mode - SEO would be updated!");
      }
    } catch (error) {
      console.error("Error saving SEO:", error);
      setError("Error saving SEO: " + error.message);
    } finally {
      setLoading(false);
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
      case "complete": return "#28a745";
      case "partial": return "#ffc107";
      case "missing": return "#dc3545";
      default: return "#6c757d";
    }
  };

  return (
    <div style={{ 
      padding: "20px", 
      fontFamily: "Arial, sans-serif",
      backgroundColor: "#f8f9fa",
      minHeight: "100vh"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "20px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ 
          color: "#333", 
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          📊 SEO Helper - Simple Version
        </h1>

        {/* Error/Success Messages */}
        {error && (
          <div style={{
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "15px",
            border: "1px solid #f5c6cb"
          }}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: "#d4edda",
            color: "#155724",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "15px",
            border: "1px solid #c3e6cb"
          }}>
            ✅ {success}
          </div>
        )}

        {/* Page Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "5px", 
            fontWeight: "bold",
            color: "#333"
          }}>
            Select a page to edit:
          </label>
          <select 
            onChange={(e) => {
              const page = pages.find(p => p.id === e.target.value);
              setSelectedPage(page);
              setSeoTitle(page?.seo?.title || "");
              setSeoDescription(page?.seo?.description || "");
              setError("");
              setSuccess("");
            }}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontSize: "14px"
            }}
            disabled={loading}
          >
            <option value="">Choose a page...</option>
            {pages.map(page => (
              <option key={page.id} value={page.id}>
                {page.title} ({getPageStatus(page)})
              </option>
            ))}
          </select>
        </div>

        {/* SEO Editor */}
        {selectedPage && (
          <div style={{
            backgroundColor: "#f8f9fa",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #e9ecef"
          }}>
            <h3 style={{ 
              color: "#333", 
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              ✏️ Editing: {selectedPage.title}
              <span style={{
                backgroundColor: getStatusColor(getPageStatus(selectedPage)),
                color: "white",
                padding: "4px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "bold"
              }}>
                {getPageStatus(selectedPage)}
              </span>
            </h3>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "5px", 
                fontWeight: "bold",
                color: "#333"
              }}>
                Meta Title:
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "14px"
                }}
                maxLength={60}
                disabled={loading}
                placeholder="Enter meta title (max 60 characters)"
              />
              <small style={{ 
                color: seoTitle.length > 50 ? "#dc3545" : "#6c757d",
                fontSize: "12px"
              }}>
                {seoTitle.length}/60 characters
              </small>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ 
                display: "block", 
                marginBottom: "5px", 
                fontWeight: "bold",
                color: "#333"
              }}>
                Meta Description:
              </label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                  height: "80px",
                  resize: "vertical"
                }}
                maxLength={155}
                disabled={loading}
                placeholder="Enter meta description (max 155 characters)"
              />
              <small style={{ 
                color: seoDescription.length > 130 ? "#dc3545" : "#6c757d",
                fontSize: "12px"
              }}>
                {seoDescription.length}/155 characters
              </small>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={saveSeo}
                disabled={loading}
                style={{ 
                  padding: "12px 24px", 
                  backgroundColor: "#007bff", 
                  color: "white", 
                  border: "none",
                  borderRadius: "4px",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? "Saving..." : "💾 Save SEO"}
              </button>
              
              <button 
                onClick={() => {
                  setSelectedPage(null);
                  setSeoTitle("");
                  setSeoDescription("");
                  setError("");
                  setSuccess("");
                }}
                style={{ 
                  padding: "12px 24px", 
                  backgroundColor: "#6c757d", 
                  color: "white", 
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        )}

        {/* SEO Overview */}
        {pages.length > 0 && (
          <div style={{
            backgroundColor: "#e9ecef",
            padding: "15px",
            borderRadius: "8px",
            marginTop: "20px"
          }}>
            <h4 style={{ marginBottom: "10px", color: "#333" }}>📊 SEO Overview</h4>
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>
                  {pages.length}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>Total Pages</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
                  {pages.filter(p => getPageStatus(p) === "complete").length}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>Complete</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#ffc107" }}>
                  {pages.filter(p => getPageStatus(p) === "partial").length}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>Partial</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
                  {pages.filter(p => getPageStatus(p) === "missing").length}
                </div>
                <div style={{ fontSize: "12px", color: "#6c757d" }}>Missing</div>
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button 
            onClick={loadPages}
            disabled={loading}
            style={{ 
              padding: "8px 16px", 
              backgroundColor: "#6c757d", 
              color: "white", 
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1
            }}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

const rootElement = document.getElementById("root");
const root = ReactDOM.createRoot(rootElement);

root.render(<App />);
