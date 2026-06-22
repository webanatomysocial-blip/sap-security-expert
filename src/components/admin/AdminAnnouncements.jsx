import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import {
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  uploadBlogImage,
} from "../../services/api";
import api from "../../services/api";
import SimpleRTE from "./SimpleRTE.jsx";
import Image from "next/image";
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
  link: "",
  status: "approved",
};

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

const formatDateLabel = (dateString) => {
  if (!dateString) return "—";
  const d = new Date(dateString.includes(" ") ? dateString.replace(" ", "T") + "Z" : dateString + "T00:00:00Z");
  return isNaN(d.getTime()) ? dateString : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const AdminAnnouncements = () => {
  const [items, setItems] = useState([]);
  const [view, setView] = useState("list");
  const [formData, setFormData] = useState(initialFormState);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [searchQuery, setSearchQuery] = useState("");

  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  const fetchItems = async () => {
    try {
      const res = await getAnnouncements(true);
      if (res.data) setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      addToast("Failed to load announcements", "error");
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "title" && !prev.id) next.slug = generateSlug(value);
      return next;
    });
  };

  const handleContentChange = (content) =>
    setFormData((prev) => ({ ...prev, content }));

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
    } catch {
      addToast("Connection error", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (item) => {
    setFormData({ ...initialFormState, ...item, date: item.date ? item.date.split(" ")[0].substring(0, 10) : new Date().toISOString().split("T")[0] });
    setView("editor");
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Announcement?",
      message: "This cannot be undone.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await deleteAnnouncement(id);
          if (res.data.status === "success") { fetchItems(); addToast("Deleted", "success"); }
        } catch { addToast("Delete failed", "error"); }
      },
    });
  };

  const handleReview = async (id, action) => {
    try {
      const res = await api.post(`/admin/announcements/${id}/review`, { action });
      if (res.data.status === "success") { fetchItems(); addToast(`Announcement ${action}d`, "success"); }
    } catch { addToast("Action failed", "error"); }
  };

  const handleSave = async (status = "approved") => {
    if (!formData.title) { addToast("Title is required", "error"); return; }
    try {
      const res = await saveAnnouncement({ ...formData, status });
      if (res.data.status === "success") {
        fetchItems();
        setView("list");
        setFormData(initialFormState);
        addToast("Saved successfully", "success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed", "error");
    }
  };

  const filtered = items.filter((a) =>
    !searchQuery || a.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Editor view ──────────────────────────────────────────────────────────────
  if (view === "editor") {
    return (
      <div className="admin-page-wrapper">
        <div className="page-header">
          <h3>{formData.id ? "Edit Announcement" : "New Announcement"}</h3>
          <div className="page-header-actions">
            <button className="btn-reject btn-sm" onClick={() => setView("list")}>Cancel</button>
            <button className="btn-secondary btn-sm" onClick={() => handleSave("draft")}>Save Draft</button>
            <button className="btn-approve btn-sm" onClick={() => handleSave("approved")}>Publish</button>
          </div>
        </div>

        <div className="blog-editor-layout">
          {/* Main column */}
          <div className="blog-editor-main">
            <div className="admin-card" style={{ padding: "24px", marginBottom: "20px" }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Announcement headline…"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Slug</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="auto-generated-from-title"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Excerpt</label>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  className="form-control"
                  rows={3}
                  placeholder="Short summary shown in listings…"
                />
              </div>
            </div>

            {/* Rich text content */}
            <div className="admin-card" style={{ padding: "24px", marginBottom: "20px" }}>
              <label className="form-label" style={{ marginBottom: "10px", display: "block" }}>Content</label>
              <SimpleRTE
                value={formData.content}
                onChange={handleContentChange}
              />
            </div>
          </div>

          {/* Sidebar column */}
          <div className="blog-editor-sidebar">
            {/* Featured Image */}
            <div className="admin-card" style={{ padding: "20px", marginBottom: "16px" }}>
              <h4 className="sidebar-card-title">Featured Image</h4>
              {formData.image ? (
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <Image
                    src={`${formData.image}?v=${imageVersion}`}
                    alt={formData.image_alt || "Featured"}
                    width={400}
                    height={220}
                    style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px", display: "block" }}
                  />
                  <button
                    onClick={() => setFormData((p) => ({ ...p, image: "" }))}
                    style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", color: "#fff", width: "26px", height: "26px", cursor: "pointer", fontSize: "14px", lineHeight: 1 }}
                  >×</button>
                </div>
              ) : (
                <label className="image-upload-placeholder" style={{ cursor: "pointer" }}>
                  <i className="bi bi-image" style={{ fontSize: "2rem", color: "#94a3b8" }} />
                  <span style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "6px" }}>
                    {uploading ? "Uploading…" : "Click to upload image"}
                  </span>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])} />
                </label>
              )}
              <div className="form-group" style={{ marginTop: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Alt text</label>
                <input
                  type="text"
                  name="image_alt"
                  value={formData.image_alt}
                  onChange={handleInputChange}
                  className="form-control"
                  placeholder="Describe the image…"
                  style={{ fontSize: "0.82rem" }}
                />
              </div>
            </div>

            {/* Meta */}
            <div className="admin-card" style={{ padding: "20px", marginBottom: "16px" }}>
              <h4 className="sidebar-card-title">Settings</h4>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="form-control" />
              </div>
              <div className="form-group">
                <label className="form-label">External Link (optional)</label>
                <input type="url" name="link" value={formData.link || ""} onChange={handleInputChange} className="form-control" placeholder="https://…" />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange} className="form-control">
                  <option value="approved">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Announcements</h3>
        <div className="page-header-actions">
          <button className="btn-approve btn-sm" onClick={() => { setFormData(initialFormState); setView("editor"); }}>
            + New Announcement
          </button>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="search-box" style={{ flex: 1 }}>
          <i className="bi bi-search" />
          <input
            type="text"
            placeholder="Search announcements…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-card">
        <TableScrollContainer>
        <table className="admin-table">
          <thead>
            <tr>
              <th className="col-xxl text-left">Title</th>
              <th className="col-sm text-center">Status</th>
              <th className="col-md text-left">Date</th>
              <th className="col-actions text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center" style={{ padding: "32px", color: "#94a3b8" }}>No announcements yet.</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td className="col-xxl text-left wrap-text">
                    <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{item.title}</strong>
                    {item.submission_status === "edited" && (
                      <span className="pending-badge" style={{ fontSize: "0.65rem", padding: "1px 5px", background: "#fef3c7", color: "#d97706" }}>
                        Edited — Pending Approval
                      </span>
                    )}
                    {item.excerpt && item.excerpt.length > 6 && (
                      <span style={{ fontSize: "0.78rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                        {item.excerpt.slice(0, 100)}{item.excerpt.length > 100 ? "…" : ""}
                      </span>
                    )}
                  </td>
                  <td className="col-sm text-center">
                    {item.status === "approved" || item.status === "active" || item.status === "published" ? (
                      <span className="status-badge status-live" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Live</span>
                    ) : (
                      <span className="status-badge status-draft" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>Draft</span>
                    )}
                  </td>
                  <td className="col-md text-left">
                    <span style={{ fontSize: "0.80rem", color: "var(--slate-500)", fontWeight: "500" }}>
                      {formatDateLabel(item.date || item.created_at)}
                    </span>
                  </td>
                  <td className="col-actions text-center">
                    <ActionMenu>
                      {item.submission_status === "edited" && (
                        <>
                          <button className="action-menu-item success" onClick={() => handleReview(item.id, "approve")} style={{ color: "var(--success-green)" }}>
                            <i className="bi bi-check-circle" /> Approve Edit
                          </button>
                          <button className="action-menu-item danger" onClick={() => handleReview(item.id, "reject")}>
                            <i className="bi bi-x-circle" /> Reject Edit
                          </button>
                          <div className="action-menu-separator" />
                        </>
                      )}
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
              ))
            )}
          </tbody>
        </table>
        </TableScrollContainer>
      </div>
    </div>
  );
};

export default AdminAnnouncements;
