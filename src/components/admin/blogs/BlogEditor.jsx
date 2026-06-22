import React from "react";
import SimpleRTE from "../SimpleRTE.jsx";

const ALL_CATEGORIES = [
  { value: "sap-security", label: "SAP Security" },
  { value: "sap-s4hana-security", label: "SAP S/4HANA Security" },
  { value: "sap-fiori-security", label: "SAP Fiori Security" },
  { value: "sap-btp-security", label: "SAP BTP Security" },
  { value: "sap-public-cloud", label: "SAP Public Cloud" },
  { value: "sap-sac-security", label: "SAP SAC Security" },
  { value: "sap-cis", label: "SAP CIS" },
  { value: "sap-successfactors-security", label: "SuccessFactors" },
  { value: "sap-security-other", label: "Other SAP Security" },
  { value: "sap-access-control", label: "Access Control" },
  { value: "sap-process-control", label: "Process Control" },
  { value: "sap-iag", label: "SAP IAG" },
  { value: "sap-grc", label: "SAP GRC" },
  { value: "sap-cybersecurity", label: "Cybersecurity" },
  { value: "product-reviews", label: "Product Reviews" },
  { value: "podcasts", label: "Expert Voices/Podcasts" },
  { value: "videos", label: "Videos" },
  { value: "expert-recommendations", label: "Expert Recommendations" },
];

const BlogEditor = ({
  formData,
  handleInputChange,
  handleContentChange,
  rteImageUpload,
  handleImageUpload,
  uploading,
  imageVersion,
  authors = [],
  isAdmin = false,
  blogs = [],
  hideCategory = false,
  hideExtras = false,
  customCategories = null,
  categoryHint = null,
  children,
  onSave,
  onSaveDraft,
}) => {
  const ACTIVE_CATEGORIES = customCategories || ALL_CATEGORIES;
  const [blogSearch, setBlogSearch] = React.useState("");

  const handleToggleSecondary = (value) => {
    const current = formData.secondary_categories || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    handleInputChange({ target: { name: "secondary_categories", value: next } });
  };

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

          {isAdmin && (
            <div className="form-group" style={{ marginBottom: "20px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 8, padding: "14px 16px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", color: "#92400e" }}>
                <input
                  type="checkbox"
                  name="is_premium"
                  checked={formData.is_premium == 1}
                  onChange={(e) => handleInputChange({ target: { name: "is_premium", value: e.target.checked ? 1 : 0 } })}
                  style={{ width: "16px", height: "16px", accentColor: "#d97706" }}
                />
                <i className="bi bi-star-fill" style={{ color: "#d97706" }}></i>
                Premium Article (Paid)
              </label>
              <span style={{ fontSize: "0.78rem", color: "#92400e", display: "block", marginTop: "4px" }}>
                Members must spend credits to unlock this article for lifetime access.
              </span>
              {formData.is_premium == 1 && (
                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#92400e", display: "block", marginBottom: "6px" }}>
                    <i className="bi bi-coin" style={{ marginRight: "6px" }}></i>
                    Credits Required to Unlock
                  </label>
                  <input
                    type="number"
                    name="credits_required"
                    min="1"
                    max="999"
                    value={formData.credits_required || 1}
                    onChange={handleInputChange}
                    className="form-control"
                    style={{ width: "120px", padding: "8px 10px", fontSize: "0.9rem", border: "1.5px solid #fcd34d", background: "#fffef0" }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "#78350f", marginTop: "4px", display: "block" }}>
                    How many credits a member must spend to unlock this article.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Author Selector — Admin only */}
          {isAdmin && !hideExtras && (
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="bi bi-person-badge" style={{ color: "#6366f1" }}></i>
                Primary Author
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
                The main author shown on the article.
              </span>
            </div>
          )}

          {/* Co-authors — Admin only */}
          {isAdmin && !hideExtras && (
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="bi bi-people" style={{ color: "#6366f1" }}></i>
                Co-authors
              </label>
              <select
                className="form-control"
                style={{ padding: "10px", background: "#f8fafc" }}
                value=""
                onChange={(e) => {
                  const selectedId = parseInt(e.target.value);
                  if (!selectedId) return;
                  const author = authors.find((a) => a.id === selectedId);
                  if (!author) return;
                  const current = Array.isArray(formData.co_authors) ? formData.co_authors : [];
                  if (current.some((ca) => ca.id === selectedId)) return;
                  handleInputChange({
                    target: {
                      name: "co_authors",
                      value: [...current, { id: author.id, name: author.display_name, image: author.image || null }],
                    },
                  });
                  e.target.value = "";
                }}
              >
                <option value="">+ Add co-author…</option>
                {authors
                  .filter((a) => {
                    const primaryId = formData.author_id ? parseInt(formData.author_id) : null;
                    const coIds = (formData.co_authors || []).map((ca) => ca.id);
                    return a.id !== primaryId && !coIds.includes(a.id);
                  })
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.display_name}{a.role === "admin" ? " (Admin)" : " (Contributor)"}
                    </option>
                  ))}
              </select>

              {/* Selected co-authors chips */}
              {(formData.co_authors || []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                  {(formData.co_authors || []).map((ca) => (
                    <span
                      key={ca.id}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "6px",
                        padding: "4px 10px", background: "#ede9fe", color: "#5b21b6",
                        borderRadius: "20px", fontSize: "0.82rem", fontWeight: 600,
                      }}
                    >
                      {ca.image && (
                        <img
                          src={ca.image}
                          alt={ca.name}
                          width={18} height={18}
                          style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      )}
                      {ca.name}
                      <button
                        type="button"
                        onClick={() => handleInputChange({
                          target: {
                            name: "co_authors",
                            value: (formData.co_authors || []).filter((x) => x.id !== ca.id),
                          },
                        })}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#7c3aed", fontWeight: 700, fontSize: "1rem", lineHeight: 1, padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "6px", display: "block" }}>
                Additional authors shown alongside the primary author.
              </span>
            </div>
          )}

          {!hideCategory && (
          <div className="form-group">
            <label className="form-label">Primary Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="form-control"
              style={{ padding: "10px", background: "#f8fafc" }}
            >
              <option value="">Select Category</option>
              {ACTIVE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
              {categoryHint || `Controls the URL slug: /${formData.category || "category"}/${formData.slug || "slug"}`}
            </span>
          </div>
          )}

          {!hideCategory && (
          <div className="form-group">
            <label className="form-label">Secondary Categories</label>
            <select
              className="form-control"
              style={{ padding: "10px", background: "#f8fafc" }}
              value=""
              onChange={(e) => {
                if (e.target.value) handleToggleSecondary(e.target.value);
                e.target.value = "";
              }}
            >
              <option value="">+ Add Secondary Category</option>
              {ACTIVE_CATEGORIES.filter(
                (c) =>
                  c.value !== formData.category &&
                  !(formData.secondary_categories || []).includes(c.value)
              ).map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            {(formData.secondary_categories || []).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                {(formData.secondary_categories || []).map((val) => {
                  const cat = ALL_CATEGORIES.find((c) => c.value === val);
                  return (
                    <span
                      key={val}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        background: "#e0e7ff",
                        color: "#3730a3",
                        borderRadius: "20px",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                      }}
                    >
                      {cat ? cat.label : val}
                      <button
                        type="button"
                        onClick={() => handleToggleSecondary(val)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#6366f1",
                          fontWeight: "700",
                          fontSize: "1rem",
                          lineHeight: 1,
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <span style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "6px", display: "block" }}>
              Article will appear in these category pages too.
            </span>
          </div>
          )}

          {!hideExtras && <div className="admin-card" style={{ marginTop: "24px" }}>
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
          }
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

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <i className="bi bi-card-text" style={{ color: "#6366f1" }}></i>
                Image Alt Text
              </label>
              <input
                className="form-control"
                name="image_alt"
                value={formData.image_alt || ""}
                onChange={handleInputChange}
                placeholder="Describe the image for accessibility & SEO"
                style={{ fontSize: "0.875rem" }}
              />
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                Shown to screen readers and search engines when the image can't load.
              </span>
            </div>

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
                  src={`${formData.image}?v=${imageVersion}`}
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
