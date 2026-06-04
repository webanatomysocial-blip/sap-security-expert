import React from "react";
import SimpleRTE from "../SimpleRTE.jsx";

const BlogEditor = ({
  formData,
  handleInputChange,
  handleContentChange,
  rteImageUpload,
  handleImageUpload,
  uploading,
  imageVersion,
  authors = [],    // List of eligible authors (admin+contributors)
  isAdmin = false, // Whether current user is admin
  blogs = [],      // List for related blogs selection
  children,        // For sub-sections (SEO, CTA, FAQ)
  onSave,
  onSaveDraft,
}) => {
  const [blogSearch, setBlogSearch] = React.useState("");

  const handleToggleRelated = (id) => {
    const current = formData.related_blogs || [];
    if (current.includes(id)) {
      handleInputChange({
        target: {
          name: "related_blogs",
          value: current.filter((i) => i !== id),
        },
      });
    } else {
      handleInputChange({
        target: { name: "related_blogs", value: [...current, id] },
      });
    }
  };

  const selectedBlogs = blogs.filter((b) =>
    (formData.related_blogs || []).includes(b.id),
  );
  const unselectedBlogs = blogs.filter(
    (b) =>
      !(formData.related_blogs || []).includes(b.id) &&
      b.id !== formData.id && // Don't relate to self
      b.title.toLowerCase().includes(blogSearch.toLowerCase()),
  );
  return (
    <div
      className="blog-editor-layout"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
        gap: "24px",
        alignItems: "start",
      }}
    >
      {/* Left Column: Essential Content */}
      <div
        className="editor-main-col"
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}
      >
        <div className="admin-card">
          <h3
            style={{
              marginBottom: "20px",
              color: "#1e293b",
              fontSize: "1.2rem",
              paddingBottom: "12px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            Content Editor
          </h3>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input
              className="form-control"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter blog title"
              style={{
                fontSize: "1.15rem",
                padding: "12px",
                fontWeight: "600",
              }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Slug (URL)</label>
            <input
              className="form-control"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder="blog-url-slug"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Excerpt (Short Summary)</label>
            <textarea
              className="form-control"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleInputChange}
              rows="3"
              placeholder="Short summary for cards..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content (Rich Text)</label>
            <SimpleRTE
              value={formData.content}
              onChange={handleContentChange}
              onImageUpload={rteImageUpload}
            />
          </div>
        </div>

        {/* Dynamic Children (SEO, FAQ, CTA) */}
        <div
          className="editor-dynamic-sections"
          style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
          {children}
        </div>
      </div>

      {/* Right Column: Settings & Publishing */}
      <div
        className="editor-side-col"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          position: "sticky",
          top: "24px",
        }}
      >
        <div className="admin-card">
          <h3
            style={{
              marginBottom: "20px",
              color: "#1e293b",
              fontSize: "1.2rem",
              paddingBottom: "12px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            Publishing
          </h3>

          <button
            className="btn-approve btn-full"
            onClick={onSave}
            style={{
              padding: "14px",
              fontSize: "1rem",
              fontWeight: "700",
              marginBottom: "12px",
            }}
          >
            <i
              className="bi bi-send-check"
              style={{ marginRight: "8px" }}
            ></i>{" "}
            Publish Blog Post
          </button>

          <button
            className="btn-secondary btn-full"
            onClick={onSaveDraft}
            style={{
              padding: "12px",
              fontSize: "0.95rem",
              fontWeight: "600",
              marginBottom: "24px",
              background: "#f1f5f9",
              color: "#475569",
              border: "1px solid #e2e8f0",
            }}
          >
            <i
              className="bi bi-file-earmark-text"
              style={{ marginRight: "8px" }}
            ></i>{" "}
            Save as Draft
          </button>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "normal" }}>
              <input
                type="checkbox"
                name="send_notification_email"
                checked={formData.send_notification_email == 1}
                onChange={(e) => handleInputChange({ target: { name: "send_notification_email", value: e.target.checked ? 1 : 0 } })}
                style={{ width: "16px", height: "16px", accentColor: "#ee5e42" }}
              />
              Send Email Notification to Members
            </label>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", display: "block", marginTop: "4px" }}>
              Check this to send an email to all subscribed members when the blog is published.
            </span>
          </div>

          {/* Author Selector — Admin only */}
          {isAdmin && (
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="bi bi-person-badge" style={{ color: "#6366f1" }}></i>
                Author
              </label>
              <select
                name="author_id"
                value={formData.author_id || ""}
                onChange={handleInputChange}
                className="form-control"
                style={{ padding: "10px", background: "#f8fafc" }}
              >
                <option value="">— Default (Admin) —</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.display_name}{a.role === "admin" ? " (Admin)" : " (Contributor)"}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                Set who appears as the author on the published blog.
              </span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="form-control"
              style={{ padding: "10px", background: "#f8fafc" }}
            >
              <option value="">Select Category</option>
              <option value="sap-security">SAP Security</option>
              <option value="sap-s4hana-security">SAP S/4HANA Security</option>
              <option value="sap-fiori-security">SAP Fiori Security</option>
              <option value="sap-btp-security">SAP BTP Security</option>
              <option value="sap-public-cloud">SAP Public Cloud</option>
              <option value="sap-sac-security">SAP SAC Security</option>
              <option value="sap-cis">SAP CIS</option>
              <option value="sap-successfactors-security">
                SuccessFactors
              </option>
              <option value="sap-security-other">Other SAP Security</option>
              <option value="sap-access-control">Access Control</option>
              <option value="sap-process-control">Process Control</option>
              <option value="sap-iag">SAP IAG</option>
              <option value="sap-grc">SAP GRC</option>
              <option value="sap-cybersecurity">Cybersecurity</option>
              <option value="product-reviews">Product Reviews</option>
              <option value="podcasts">Expert Voices/Podcasts</option>
              <option value="videos">Videos</option>
              <option value="expert-recommendations">Expert Recommendations</option>
            </select>
          </div>

          <div className="admin-card" style={{ marginTop: "24px" }}>
            <h3
              style={{
                marginBottom: "15px",
                color: "#1e293b",
                fontSize: "1.1rem",
                paddingBottom: "10px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              Related Blogs
            </h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Search blogs..."
                className="form-control"
                style={{ fontSize: "0.85rem", marginBottom: "12px", border: "1px solid #e2e8f0" }}
                value={blogSearch}
                onChange={(e) => setBlogSearch(e.target.value)}
              />
              <div
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  WebkitOverflowScrolling: "touch",
                  overscrollBehavior: "contain",
                }}
                data-lenis-prevent="true"
              >
                {unselectedBlogs.slice(0, 10).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleToggleRelated(b.id)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      borderBottom: "1px solid #e2e8f0",
                      background: "white",
                    }}
                  >
                    + {b.title}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "15px" }}>
              <label style={{ fontSize: "0.8rem", color: "#64748b" }}>
                Selected ({selectedBlogs.length})
              </label>
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}
              >
                {selectedBlogs.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      padding: "4px 10px",
                      background: "#3b82f6",
                      color: "white",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {b.title.substring(0, 20)}...
                    <span
                      onClick={() => handleToggleRelated(b.id)}
                      style={{ cursor: "pointer", fontWeight: "bold" }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3
            style={{
              marginBottom: "20px",
              color: "#1e293b",
              fontSize: "1.2rem",
              paddingBottom: "12px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            Featured Image
          </h3>
          <div
            className="upload-container"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                }
              }}
              className="form-control"
              style={{ padding: "8px" }}
            />
            <span className="image-hint">Required: 1920x1080 (16:9)</span>

            {uploading && (
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "#3b82f6",
                  fontWeight: "600",
                  marginTop: "4px",
                }}
              >
                <i className="bi bi-hourglass-split"></i> Uploading...
              </p>
            )}

            {formData.image && (
              <div
                className="image-preview"
                style={{
                  marginTop: "12px",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                }}
              >
                <img
                  src={`${formData.image.startsWith("http") ? "" : "http://localhost:8000"}${formData.image}?v=${imageVersion}`}
                  alt="Featured Preview"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
