import { useState, useEffect } from "react";
// next-disabled: import "../../css/AdminDashboard.css";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getAdminNews, saveNews, deleteNews, uploadBlogImage } from "../../services/api";

import BlogEditor from "./blogs/BlogEditor";
import SeoSettings from "./blogs/SeoSettings";
import CtaSettings from "./blogs/CtaSettings";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";

const initialFormState = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  date: new Date().toISOString().split("T")[0],
  image: "",
  image_alt: "",
  tags: "",
  cta_title: "",
  cta_description: "",
  cta_button_text: "",
  cta_button_link: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
};

const formatDateLabel = (dateString) => {
  if (!dateString) return "No Date";
  const d = new Date(
    dateString.includes(" ") ? dateString.replace(" ", "T") + "Z" : dateString + "T00:00:00Z"
  );
  return isNaN(d.getTime())
    ? dateString
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

const getSeoScore = (data) => {
  let score = 100;
  const title = data.meta_title || "";
  const desc = data.meta_description || "";
  const content = data.content || "";
  if (title.length < 50 || title.length > 70) score -= 15;
  if (desc.length < 140 || desc.length > 165) score -= 15;
  const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter((w) => w.trim().length > 0).length;
  if (wordCount < 600) score -= 20;
  if (!data.image) score -= 10;
  if (data.meta_description && data.meta_description.length >= 120) score += 5;
  if (data.meta_keywords && data.meta_keywords.split(",").length >= 3) score += 5;
  return Math.min(100, Math.max(0, score));
};

const getScoreColor = (score) => {
  if (score >= 80) return { bg: "#dcfce7", text: "#166534" };
  if (score >= 60) return { bg: "#fef9c3", text: "#ca8a04" };
  return { bg: "#fee2e2", text: "#991b1b" };
};

const safeJsonParse = (val, fallback = []) => {
  if (!val || val === "null") return fallback;
  if (Array.isArray(val)) return val;
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : fallback; } catch { return fallback; }
};

const AdminNews = () => {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("list"); // 'list' | 'editor'
  const [formData, setFormData] = useState(initialFormState);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [activeTab, setActiveTab] = useState("live"); // 'live' | 'drafts'
  const [searchQuery, setSearchQuery] = useState("");

  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await getAdminNews();
      if (res.data) {
        setItems(res.data.map((item) => ({
          ...item,
          faqs: safeJsonParse(item.faqs),
        })));
      }
    } catch (err) {
      console.error(err);
      addToast("Could not load news items.", "error");
    }
  };

  // Filtered lists
  const liveItems = items.filter((i) => ["approved", "published"].includes(i.status));
  const draftItems = items.filter((i) => !["approved", "published"].includes(i.status));

  const visibleItems = (activeTab === "live" ? liveItems : draftItems).filter((i) =>
    !searchQuery || i.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "title" && !prev.id) next.slug = generateSlug(value);
      return next;
    });
  };

  const handleContentChange = (content) => setFormData((prev) => ({ ...prev, content }));

  const rteImageUpload = async (file) => {
    const body = new FormData();
    body.append("image", file);
    body.append("type", "content");
    try {
      const res = await uploadBlogImage(body);
      if (res.data.status === "success") return res.data.path;
      addToast(res.data.message || "Upload failed", "error");
    } catch { addToast("Connection error", "error"); }
    return null;
  };

  const handleImageUpload = async (file) => {
    setUploading(true);
    const body = new FormData();
    body.append("image", file);
    body.append("type", "featured");
    try {
      const res = await uploadBlogImage(body);
      if (res.data.status === "success") {
        setFormData((prev) => ({ ...prev, image: res.data.path }));
        setImageVersion(Date.now());
        addToast("Image uploaded", "success");
      } else {
        addToast(res.data.message || "Upload failed", "error");
      }
    } catch { addToast("Connection error", "error"); }
    finally { setUploading(false); }
  };

  const handleEdit = (item) => {
    setFormData({
      ...initialFormState,
      ...item,
      date: item.date ? item.date.split(" ")[0].substring(0, 10) : new Date().toISOString().split("T")[0],
      faqs: safeJsonParse(item.faqs),
    });
    setView("editor");
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete News Item?",
      message: "Are you sure? This cannot be undone.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteNews(id);
          fetchItems();
          addToast("Deleted successfully", "success");
        } catch {
          addToast("Delete failed", "error");
        }
      },
    });
  };

  const handleSave = async (status = "approved") => {
    if (!formData.title) { addToast("Title is required", "error"); return; }

    const payload = {
      ...formData,
      category: "news",
      status,
      date: formData.date || new Date().toISOString().slice(0, 10),
    };
    delete payload.author;

    try {
      const res = await saveNews(payload);
      if (res.data.status === "success") {
        fetchItems();
        setView("list");
        setFormData(initialFormState);
        addToast("News item saved", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed", "error");
    }
  };

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        {view === "list" && (
          <div className="status-filter-tabs" style={{ margin: 0 }}>
            <button className={activeTab === "live" ? "active" : ""} onClick={() => setActiveTab("live")}>
              Published {liveItems.length > 0 && <span className="badge-count" style={{ background: "#16a34a", color: "#fff", borderRadius: "12px", padding: "1px 7px", fontSize: "0.72rem", marginLeft: "4px" }}>{liveItems.length}</span>}
            </button>
            <button className={activeTab === "drafts" ? "active" : ""} onClick={() => setActiveTab("drafts")}>
              Drafts {draftItems.length > 0 && <span className="badge-count" style={{ background: "#d97706", color: "#fff", borderRadius: "12px", padding: "1px 7px", fontSize: "0.72rem", marginLeft: "4px" }}>{draftItems.length}</span>}
            </button>
          </div>
        )}

        <div className="page-header-actions">
          {view === "list" ? (
            <button className="btn-approve btn-sm" onClick={() => { setFormData(initialFormState); setView("editor"); }}>
              + New News Item
            </button>
          ) : (
            <button className="btn-reject btn-sm" onClick={() => setView("list")}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List view */}
      {view === "list" && (
        <>
          <div className="admin-filter-bar">
            <div className="search-box" style={{ flex: 1 }}>
              <i className="bi bi-search"></i>
              <input
                type="text"
                placeholder="Search news by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="admin-card" style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
              <i className="bi bi-newspaper" style={{ fontSize: "2.5rem", marginBottom: "12px", display: "block" }}></i>
              <p style={{ marginBottom: "16px" }}>{activeTab === "live" ? "No published news yet." : "No drafts yet."}</p>
              <button className="btn-approve btn-sm" onClick={() => { setFormData(initialFormState); setView("editor"); }}>
                + Create First News Item
              </button>
            </div>
          ) : (
            <div className="admin-card">
              <TableScrollContainer>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th className="col-xxl text-left">Title</th>
                      <th className="col-sm text-center">Status</th>
                      <th className="col-md text-left">Date</th>
                      <th className="col-sm text-center">Views</th>
                      <th className="col-actions text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => {
                      const isLive = ["approved", "published"].includes(item.status);
                      return (
                        <tr key={item.id}>
                          <td className="col-xxl text-left wrap-text">
                            <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{item.title}</strong>
                            {item.excerpt && (
                              <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                                {item.excerpt.slice(0, 100)}{item.excerpt.length > 100 ? "…" : ""}
                              </span>
                            )}
                          </td>
                          <td className="col-sm text-center">
                            <span className={`status-badge ${isLive ? "status-live" : "status-draft"}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                              {isLive ? "Live" : "Draft"}
                            </span>
                          </td>
                          <td className="col-md text-left">
                            <span style={{ fontSize: "0.80rem", color: "var(--slate-500)", fontWeight: "500" }}>
                              {formatDateLabel(item.date || item.created_at)}
                            </span>
                          </td>
                          <td className="col-sm text-center" style={{ fontSize: "0.80rem", color: "#64748b" }}>
                            <i className="bi bi-eye" style={{ marginRight: "4px" }} />
                            {item.view_count || 0}
                          </td>
                          <td className="col-actions text-center">
                            <ActionMenu>
                              <button className="action-menu-item" onClick={() => handleEdit(item)}>
                                <i className="bi bi-pencil-square" /> Edit
                              </button>
                              <div className="action-menu-separator" />
                              <button className="action-menu-item danger" onClick={() => handleDelete(item.id)}>
                                <i className="bi bi-trash" /> Delete
                              </button>
                            </ActionMenu>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScrollContainer>
            </div>
          )}
        </>
      )}

      {/* Editor view */}
      {view === "editor" && (
        <div className="admin-editor-layout">
          <div className="admin-editor-main">
            <BlogEditor
              formData={formData}
              handleInputChange={handleInputChange}
              handleContentChange={handleContentChange}
              handleImageUpload={handleImageUpload}
              uploading={uploading}
              imageVersion={imageVersion}
              rteImageUpload={rteImageUpload}
              hideCategory={true}
              hideExtras={true}
              authors={[]}
              isAdmin={true}
              blogs={[]}
            />
          </div>

          <div className="admin-editor-sidebar">
            <SeoSettings
              formData={formData}
              handleInputChange={handleInputChange}
              getSeoScore={getSeoScore}
              getScoreColor={getScoreColor}
            />
            <CtaSettings
              formData={formData}
              handleInputChange={handleInputChange}
            />

            {/* Publish actions */}
            <div className="editor-section" style={{ marginTop: "16px" }}>
              <h4 style={{ marginBottom: "12px", fontSize: "0.9rem", fontWeight: 600, color: "#374151" }}>
                Publish
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button className="btn-approve" style={{ width: "100%" }} onClick={() => handleSave("approved")}>
                  <i className="bi bi-check-circle"></i> {formData.id ? "Save &amp; Publish" : "Publish Now"}
                </button>
                <button className="btn-secondary" style={{ width: "100%" }} onClick={() => handleSave("draft")}>
                  <i className="bi bi-floppy"></i> Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNews;
