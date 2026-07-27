import React from "react";
import { createPortal } from "react-dom";
import SimpleRTE from "../SimpleRTE.jsx";
import { uploadDownloadAsset } from "../../../services/api";

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
  { value: "expert-recommendations", label: "Expert Articles" },
  { value: "downloads", label: "Downloads" },
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
  saving = false,
}) => {
  const ACTIVE_CATEGORIES = customCategories || ALL_CATEGORIES;
  const [blogSearch, setBlogSearch] = React.useState("");

  // ── Download block (shown only when category === "downloads") ────────────
  const rteApi = React.useRef(null);
  const contentAtInsert = React.useRef("");
  const [exclusiveModal, setExclusiveModal] = React.useState(false);
  const [exclusivePreview, setExclusivePreview] = React.useState("");
  const [dlModal, setDlModal] = React.useState({ open: false });
  const [dlFile, setDlFile] = React.useState(null);
  const [dlCredits, setDlCredits] = React.useState("5");
  const [dlUploading, setDlUploading] = React.useState(false);
  const [dlError, setDlError] = React.useState("");

  // Parse all download blocks out of the HTML for the "Attached Files" list
  const parseDownloadBlocks = (html) => {
    const blocks = [];
    const re = /<div[^>]*data-sap-download="1"[^>]*>[\s\S]*?<\/div>/gi;
    let m;
    while ((m = re.exec(html || "")) !== null) {
      const tag = m[0];
      const get = (attr) => { const r = new RegExp(`${attr}="([^"]*)"`, 'i'); const x = r.exec(tag); return x ? x[1] : ""; };
      blocks.push({ fileUrl: get("data-file-url"), fileName: get("data-file-name"), fileSize: get("data-file-size"), credits: get("data-credits"), fullMatch: m[0] });
    }
    return blocks;
  };

  const openDlModal = () => {
    // Snapshot the current content so we know exactly where to append after upload.
    // This avoids marker/selection tricks that break across async boundaries.
    contentAtInsert.current = formData.content || "";
    setDlFile(null);
    setDlCredits("5");
    setDlError("");
    setDlModal({ open: true });
  };

  const cancelDlModal = () => {
    setDlModal({ open: false });
  };

  const handleInsertDownload = async () => {
    if (!dlFile) { setDlError("Please select a file."); return; }
    const credits = Math.max(0, parseInt(dlCredits) || 0);
    setDlUploading(true);
    setDlError("");
    try {
      const fd = new FormData();
      fd.append("file", dlFile);
      const { data } = await uploadDownloadAsset(fd);
      if (data.status !== "success") throw new Error(data.message || "Upload failed");
      const ext = data.originalName.split(".").pop().toUpperCase();
      const creditLabel = credits === 0 ? "Free" : `Download · ${credits} credit${credits !== 1 ? "s" : ""}`;
      const blockHtml = `<div class="sap-download-block" data-sap-download="1" data-file-url="${data.url}" data-file-name="${data.originalName}" data-file-size="${data.size}" data-credits="${credits}" contenteditable="false"><span class="sdb-icon"></span><span class="sdb-info"><strong>${data.originalName}</strong><small>${data.size} · ${ext}</small></span><span class="sdb-action">${creditLabel}</span></div>`;
      // Insert block after the content that existed when the button was clicked,
      // plus a fresh empty paragraph so the editor stays typeable below the block.
      const newContent = contentAtInsert.current + blockHtml + "<p><br></p>";
      handleContentChange(newContent);
      setDlModal({ open: false });
      // After React commits the new content and the useEffect rewrites innerHTML,
      // move focus + cursor to the end of the editor so the admin can keep typing.
      setTimeout(() => {
        if (rteApi.current?.focusEnd) rteApi.current.focusEnd();
      }, 80);
    } catch (err) {
      setDlError(err.message || "Upload failed. Please try again.");
    } finally {
      setDlUploading(false);
    }
  };

  const removeDownloadBlock = (fullMatch) => {
    handleContentChange((formData.content || "").replace(fullMatch, ""));
  };

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
    <>
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
              onReady={(api) => { rteApi.current = api; }}
            />
            {(formData.category === "downloads" || (formData.secondary_categories || []).includes("downloads")) && (() => {
              const attachedBlocks = parseDownloadBlocks(formData.content);
              return (
                <div style={{ marginTop: "12px" }}>
                  {/* Insert button */}
                  <button
                    type="button"
                    onClick={openDlModal}
                    style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#0f172a", color: "#fff", border: "none", borderRadius: "8px", padding: "9px 18px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    <i className="bi bi-file-earmark-arrow-down-fill"></i> Insert Download Block
                  </button>

                  {/* Attached files list */}
                  {attachedBlocks.length > 0 && (
                    <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                      <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
                        Attached Files in Content
                      </p>
                      {attachedBlocks.map((b, i) => {
                        const ext = (b.fileName || "").split(".").pop().toUpperCase();
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: "10px", padding: "11px 16px" }}>
                            <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: "1.4rem", color: "#0284c7", flexShrink: 0 }}></i>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ display: "block", fontSize: "0.875rem", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.fileName}</strong>
                              <small style={{ color: "#64748b", fontSize: "0.78rem" }}>{b.fileSize} · {ext} · {b.credits === "0" || b.credits === 0 ? "Free" : `${b.credits} credit${b.credits !== "1" ? "s" : ""} to download`}</small>
                            </div>
                            <button
                              type="button"
                              title="Remove from content"
                              onClick={() => removeDownloadBlock(b.fullMatch)}
                              style={{ background: "#fee2e2", border: "none", color: "#dc2626", borderRadius: "6px", width: "30px", height: "30px", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                            >
                              <i className="bi bi-trash3"></i>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* ── Download Block Modal ──────────────────────────────────── */}
          {dlModal.open && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "500px", maxWidth: "96vw", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "22px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-file-earmark-arrow-down-fill" style={{ color: "#0284c7", fontSize: "1.2rem" }}></i>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: 700 }}>Insert Download Block</h4>
                </div>

                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Select file <span style={{ color: "#94a3b8", fontWeight: 400 }}>(PDF, ZIP, DOCX, XLSX, PPTX, CSV, TXT — max 50 MB)</span>
                </label>
                <div style={{ border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "20px", textAlign: "center", marginBottom: "16px", background: dlFile ? "#f0fdf4" : "#f8fafc", borderColor: dlFile ? "#86efac" : "#cbd5e1", transition: "all 0.2s" }}>
                  {dlFile ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <i className="bi bi-file-earmark-check-fill" style={{ color: "#16a34a", fontSize: "1.5rem" }}></i>
                      <div style={{ textAlign: "left" }}>
                        <strong style={{ display: "block", fontSize: "0.875rem", color: "#15803d" }}>{dlFile.name}</strong>
                        <small style={{ color: "#64748b" }}>{(dlFile.size / 1024 / 1024).toFixed(2)} MB</small>
                      </div>
                      <button type="button" onClick={() => setDlFile(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1.1rem", marginLeft: "4px" }}>
                        <i className="bi bi-x-circle"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <i className="bi bi-cloud-arrow-up" style={{ fontSize: "2rem", color: "#94a3b8", display: "block", marginBottom: "6px" }}></i>
                      <label htmlFor="dl-file-input" style={{ cursor: "pointer", color: "#3b82f6", fontWeight: 600, fontSize: "0.875rem" }}>
                        Click to choose a file
                      </label>
                      <input
                        id="dl-file-input"
                        type="file"
                        accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        onChange={(e) => setDlFile(e.target.files[0] || null)}
                        style={{ display: "none" }}
                      />
                    </>
                  )}
                </div>

                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Credits required to download
                  <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: "6px" }}>Set 0 for free</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                  <button type="button" onClick={() => setDlCredits(c => String(Math.max(0, parseInt(c || 0) - 1)))} style={{ width: "36px", height: "36px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", fontSize: "1.1rem" }}>−</button>
                  <input
                    type="number"
                    min="0"
                    value={dlCredits}
                    onChange={(e) => setDlCredits(e.target.value)}
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "1rem", fontWeight: 700, textAlign: "center", background: "#f8fafc" }}
                  />
                  <button type="button" onClick={() => setDlCredits(c => String(parseInt(c || 0) + 1))} style={{ width: "36px", height: "36px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", cursor: "pointer", fontSize: "1.1rem" }}>+</button>
                </div>

                {dlError && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                    <p style={{ color: "#dc2626", fontSize: "0.85rem", margin: 0 }}><i className="bi bi-exclamation-triangle-fill"></i> {dlError}</p>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button type="button" onClick={cancelDlModal} style={{ padding: "9px 22px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleInsertDownload}
                    disabled={dlUploading || !dlFile}
                    style={{ padding: "9px 22px", borderRadius: "8px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", background: "#0f172a", color: "#fff", border: "none", opacity: (dlUploading || !dlFile) ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: "7px" }}
                  >
                    {dlUploading ? <><i className="bi bi-hourglass-split"></i> Uploading…</> : <><i className="bi bi-cloud-arrow-up-fill"></i> Upload & Insert</>}
                  </button>
                </div>
              </div>
            </div>
          )}
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
            disabled={saving}
            style={{
              padding: "14px",
              fontSize: "1rem",
              fontWeight: "700",
              marginBottom: "12px",
              opacity: saving ? 0.6 : 1,
            }}
          >
            <i
              className={`bi ${saving ? "bi-hourglass-split" : "bi-send-check"}`}
              style={{ marginRight: "8px" }}
            ></i>{" "}
            {saving ? "Saving…" : "Publish Blog Post"}
          </button>

          <button
            className="btn-secondary btn-full"
            onClick={onSaveDraft}
            disabled={saving}
            style={{
              padding: "12px",
              fontSize: "0.95rem",
              fontWeight: "600",
              marginBottom: "24px",
              background: "#f1f5f9",
              color: "#475569",
              border: "1px solid #e2e8f0",
              opacity: saving ? 0.6 : 1,
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
            <div className="form-group" style={{ marginBottom: "20px", background: "#eff6ff", border: "1.5px solid #93c5fd", borderRadius: 8, padding: "14px 16px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", color: "#1e40af" }}>
                <input
                  type="checkbox"
                  name="is_members_only"
                  checked={formData.is_members_only == 1}
                  disabled={formData.is_premium == 1}
                  onChange={(e) => {
                    const val = e.target.checked ? 1 : 0;
                    if (val === 1) {
                      // Open modal to ask for preview paragraphs
                      setExclusivePreview(formData.preview_paragraphs ? String(formData.preview_paragraphs) : "");
                      setExclusiveModal(true);
                    } else {
                      handleInputChange({ target: { name: "is_members_only", value: 0 } });
                    }
                  }}
                  style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: formData.is_premium == 1 ? "not-allowed" : "pointer" }}
                />
                <i className="bi bi-lock-fill" style={{ color: "#3b82f6" }}></i>
                Exclusive Article (Members Only)
              </label>
              <span style={{ fontSize: "0.78rem", color: "#1e40af", display: "block", marginTop: "4px" }}>
                Only logged-in members can read this article. Free to access after login.
              </span>
            </div>
          )}

          {isAdmin && (
            <div className="form-group" style={{ marginBottom: "20px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: 8, padding: "14px 16px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", color: "#92400e" }}>
                <input
                  type="checkbox"
                  name="is_premium"
                  checked={formData.is_premium == 1}
                  disabled={formData.is_members_only == 1}
                  onChange={(e) => {
                    const val = e.target.checked ? 1 : 0;
                    handleInputChange({ target: { name: "is_premium", value: val } });
                    // Enabling premium clears exclusive — mutually exclusive flags
                    if (val === 1) handleInputChange({ target: { name: "is_members_only", value: 0 } });
                  }}
                  style={{ width: "16px", height: "16px", accentColor: "#d97706", cursor: formData.is_members_only == 1 ? "not-allowed" : "pointer" }}
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

          {/* Paywall Preview — how many blocks/lines to show before the gate */}
          {isAdmin && (formData.is_members_only == 1 || formData.is_premium == 1) && (
            <div className="form-group" style={{ marginBottom: "20px", background: "#f0f9ff", border: "1.5px solid #bae6fd", borderRadius: 8, padding: "14px 16px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", color: "#0369a1" }}>
                <i className="bi bi-eye-slash-fill" style={{ color: "#0369a1" }}></i>
                Paywall Preview
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <input
                  type="number"
                  name="preview_paragraphs"
                  min="1"
                  max="200"
                  placeholder="3"
                  value={formData.preview_paragraphs ?? ""}
                  onChange={handleInputChange}
                  className="form-control"
                  style={{ width: "90px", padding: "8px 10px", fontSize: "0.9rem", border: "1.5px solid #bae6fd", background: "#f0f9ff" }}
                />
                <select
                  name="preview_unit"
                  value={formData.preview_unit ?? "blocks"}
                  onChange={handleInputChange}
                  className="form-control"
                  style={{ width: "110px", padding: "8px 10px", fontSize: "0.9rem", border: "1.5px solid #bae6fd", background: "#f0f9ff" }}
                >
                  <option value="blocks">Blocks</option>
                  <option value="lines">Lines</option>
                </select>
                <span style={{ fontSize: "0.8rem", color: "#0369a1" }}>
                  {formData.preview_paragraphs
                    ? `${formData.preview_paragraphs} ${formData.preview_unit === "lines" ? "line(s)" : "block(s)"} shown before paywall`
                    : "Leave blank to use site default"}
                </span>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#0369a1", marginTop: "6px", display: "block" }}>
                <strong>Blocks</strong> = paragraphs, headings, lists, tables. &nbsp;<strong>Lines</strong> = approx. text lines (~80 chars each). Overrides the site-wide default.
              </span>
            </div>
          )}

          {/* Difficulty Level — Admin only */}
          {isAdmin && (
            <div className="form-group" style={{ marginBottom: "20px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "20px", padding: "24px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "14px", fontSize: "0.75rem", fontWeight: "800", color: "#334155", textTransform: "uppercase", letterSpacing: "1px" }}>
                <i className="bi bi-bar-chart-fill" />
                Content Level
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Enterprise'].map((level) => {
                  const active = formData.difficulty_level === level;
                  const meta = {
                    Beginner:     { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
                    Intermediate: { color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
                    Advanced:     { color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" },
                    Expert:       { color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
                    Enterprise:   { color: "#be123c", bg: "#fff1f2", border: "#fecdd3" },
                  }[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleInputChange({ target: { name: "difficulty_level", value: active ? null : level } })}
                      style={{
                        padding: "6px 16px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700,
                        cursor: "pointer", border: `1.5px solid ${active ? meta.color : meta.border}`,
                        background: active ? meta.color : meta.bg,
                        color: active ? "#fff" : meta.color,
                        transition: "all 0.15s",
                      }}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              {formData.difficulty_level && (
                <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  Click the selected level again to remove it.
                </p>
              )}
            </div>
          )}

          {/* Verified by Experts badges — Admin only */}
          {isAdmin && (
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <i className="bi bi-patch-check-fill" style={{ color: "#16a34a" }}></i>
                Verified by Experts
              </label>
              <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { key: "badge_expert_reviewed",    icon: "bi-person-check-fill", label: "Expert Reviewed",      color: "#15803d" },
                  { key: "badge_sap_notes_verified", icon: "bi-journal-check",     label: "SAP Notes Verified",   color: "#0369a1" },
                  { key: "badge_tested_s4hana",      icon: "bi-cpu-fill",          label: "Tested on S/4HANA 2023", color: "#7c3aed" },
                  { key: "badge_field_validated",    icon: "bi-shield-check",      label: "Field Validated",      color: "#b45309" },
                ].map(({ key, icon, label, color }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!formData[key]}
                      onChange={(e) => handleInputChange({ target: { name: key, value: e.target.checked ? 1 : 0 } })}
                      style={{ width: "16px", height: "16px", accentColor: color, cursor: "pointer" }}
                    />
                    <i className={`bi ${icon}`} style={{ color, fontSize: "0.95rem" }} />
                    <span style={{ fontSize: "0.84rem", fontWeight: "600", color: "#1e293b" }}>{label}</span>
                  </label>
                ))}
              </div>
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "6px", display: "block" }}>
                Checked badges appear as trust indicators on the published article.
              </span>
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
                      value: [...current, {
                        id: author.id,
                        name: author.display_name,
                        image: author.image || null,
                        bio: author.bio || null,
                        designation: author.designation || null,
                        linkedin: author.linkedin || null,
                        twitter_handle: author.twitter_handle || null,
                        personal_website: author.personal_website || null,
                      }],
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

    {/* ── Exclusive modal — ask for preview paragraphs ─────────────────── */}
    {exclusiveModal && createPortal(
      <div
        className="modal-overlay"
        onClick={(e) => e.target === e.currentTarget && setExclusiveModal(false)}
      >
        <div className="modal-container" style={{ maxWidth: 420 }}>
          <div className="modal-header">
            <h3 style={{ margin: 0 }}>
              <i className="bi bi-lock-fill" style={{ color: "#3b82f6", marginRight: 8 }}></i>
              Set Preview Paragraphs
            </h3>
          </div>
          <div className="modal-body">
            <p style={{ color: "var(--slate-600)", fontSize: "0.9rem", marginBottom: 16 }}>
              How many paragraphs/blocks should be visible before the paywall on this exclusive article?
            </p>
            <input
              type="number"
              min="1"
              max="99"
              value={exclusivePreview}
              onChange={(e) => setExclusivePreview(e.target.value)}
              className="form-control"
              placeholder="Leave blank for site default (3)"
              style={{ width: "200px", padding: "8px 10px", fontSize: "1rem", border: "1.5px solid #93c5fd", background: "#eff6ff" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") setExclusiveModal(false);
                if (e.key === "Enter") {
                  handleInputChange({ target: { name: "is_members_only", value: 1 } });
                  handleInputChange({ target: { name: "is_premium", value: 0 } });
                  if (exclusivePreview !== "") handleInputChange({ target: { name: "preview_paragraphs", value: parseInt(exclusivePreview) || "" } });
                  setExclusiveModal(false);
                }
              }}
            />
            <span style={{ fontSize: "0.78rem", color: "#1e40af", marginTop: 6, display: "block" }}>
              Leave blank to use the site default. Counts paragraphs, headings, lists, and tables.
            </span>
          </div>
          <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--slate-100)", padding: "14px 24px" }}>
            <button
              className="btn-secondary"
              onClick={() => setExclusiveModal(false)}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--slate-200)", background: "white", fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                handleInputChange({ target: { name: "is_members_only", value: 1 } });
                handleInputChange({ target: { name: "is_premium", value: 0 } });
                if (exclusivePreview !== "") handleInputChange({ target: { name: "preview_paragraphs", value: parseInt(exclusivePreview) || "" } });
                setExclusiveModal(false);
              }}
              style={{ padding: "8px 18px", borderRadius: 8, background: "#3b82f6", color: "white", border: "none", fontWeight: 700, cursor: "pointer" }}
            >
              <i className="bi bi-lock-fill" style={{ marginRight: 6 }}></i>
              Enable Exclusive
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default BlogEditor;
