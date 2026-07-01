import React, { useState, useEffect, useMemo } from "react";
import { BlockSkeleton } from "./AdminSkeletons.jsx";
import {
  getFeaturedInsights,
  saveFeaturedInsights,
  uploadBlogImage,
} from "../../services/api";

const MAX_FEATURED = 3;

const resolveImg = (path) => {
  if (!path) return "https://placehold.co/600x400?text=No+Image";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.includes("uploads/")) return "/" + path.substring(path.indexOf("uploads/"));
  return path.startsWith("/") ? path : `/${path}`;
};

const AdminFeaturedInsights = () => {
  const [blogs, setBlogs] = useState([]);
  const [selected, setSelected] = useState([]); // [{ id, title, image, category, homepage_featured_image }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }
  const [pickerValue, setPickerValue] = useState("");

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  useEffect(() => {
    getFeaturedInsights()
      .then((res) => {
        const data = res.data || {};
        setBlogs(data.blogs || []);
        setSelected((data.selected || []).map((b) => ({ ...b })));
      })
      .catch(() => flash("error", "Failed to load blogs."))
      .finally(() => setLoading(false));
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const available = useMemo(
    () => blogs.filter((b) => !selectedIds.has(b.id)),
    [blogs, selectedIds]
  );

  const addBlog = (id) => {
    if (!id || selected.length >= MAX_FEATURED) return;
    const blog = blogs.find((b) => b.id === id);
    if (!blog) return;
    setSelected((prev) => [...prev, { ...blog }]);
    setPickerValue("");
  };

  const removeBlog = (id) => setSelected((prev) => prev.filter((b) => b.id !== id));

  const move = (index, dir) => {
    setSelected((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleUpload = async (id, file) => {
    if (!file) return;
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("type", "featured");
      const res = await uploadBlogImage(fd);
      if (res.data?.status === "success") {
        setSelected((prev) =>
          prev.map((b) =>
            b.id === id ? { ...b, homepage_featured_image: res.data.path } : b
          )
        );
        flash("success", "Homepage image uploaded.");
      } else {
        flash("error", res.data?.message || "Upload failed.");
      }
    } catch {
      flash("error", "Upload failed.");
    } finally {
      setUploadingId(null);
    }
  };

  const clearImage = (id) =>
    setSelected((prev) =>
      prev.map((b) => (b.id === id ? { ...b, homepage_featured_image: null } : b))
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = selected.map((b) => ({
        id: b.id,
        homepage_featured_image: b.homepage_featured_image || null,
      }));
      const res = await saveFeaturedInsights(items);
      if (res.data?.status === "success") flash("success", "Featured Insights saved.");
      else flash("error", res.data?.message || "Save failed.");
    } catch {
      flash("error", "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page-wrapper">
        <div className="admin-card" style={{ padding: 24 }}>
          <BlockSkeleton rows={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page admin-featured">
      <div className="admin-page-header" style={{ marginBottom: 8 }}>
        <h1>Featured Insights</h1>
      </div>
      <p style={{ color: "#64748b", margin: "0 0 20px", maxWidth: 620 }}>
        Pick up to {MAX_FEATURED} blogs to showcase in the homepage Featured Insights
        carousel. Optionally set a dedicated <strong>Homepage Featured Image</strong> for
        each — if left empty, the blog's own featured image is used.
      </p>

      {message && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: "0.9rem",
            background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
            color: message.type === "success" ? "#047857" : "#b91c1c",
            border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* Picker */}
      <div style={{ marginBottom: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <select
          value={pickerValue}
          onChange={(e) => addBlog(e.target.value)}
          disabled={selected.length >= MAX_FEATURED}
          style={{
            flex: "1 1 320px",
            maxWidth: 460,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            fontSize: "0.9rem",
            background: selected.length >= MAX_FEATURED ? "#f1f5f9" : "#fff",
          }}
        >
          <option value="">
            {selected.length >= MAX_FEATURED
              ? `Maximum ${MAX_FEATURED} blogs selected`
              : "+ Add a blog…"}
          </option>
          {available.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
        </select>
        <span style={{ alignSelf: "center", color: "#64748b", fontSize: "0.85rem" }}>
          {selected.length}/{MAX_FEATURED} selected
        </span>
      </div>

      {/* Selected cards */}
      {selected.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "#94a3b8",
            border: "2px dashed #e2e8f0",
            borderRadius: 12,
          }}
        >
          No featured blogs selected. The homepage will fall back to the latest 3 blogs.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {selected.map((b, i) => (
            <div
              key={b.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                overflow: "hidden",
                background: "#fff",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#f1f5f9" }}>
                <img
                  src={resolveImg(b.homepage_featured_image || b.image)}
                  alt={b.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    left: 8,
                    background: "#2563eb",
                    color: "#fff",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                  }}
                >
                  #{i + 1}
                </span>
                {b.homepage_featured_image && (
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(15,23,42,0.8)",
                      color: "#fff",
                      fontSize: "0.66rem",
                      fontWeight: 600,
                      padding: "3px 7px",
                      borderRadius: 6,
                    }}
                  >
                    Custom image
                  </span>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", lineHeight: 1.35 }}>
                  {b.title}
                </h4>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <label
                    style={{
                      cursor: uploadingId === b.id ? "wait" : "pointer",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                      padding: "6px 10px",
                      borderRadius: 6,
                    }}
                  >
                    {uploadingId === b.id ? "Uploading…" : "Upload homepage image"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      disabled={uploadingId === b.id}
                      onChange={(e) => handleUpload(b.id, e.target.files?.[0])}
                    />
                  </label>
                  {b.homepage_featured_image && (
                    <button
                      type="button"
                      onClick={() => clearImage(b.id)}
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#64748b",
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Use blog image
                    </button>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title="Move up"
                      style={iconBtn(i === 0)}
                    >
                      <i className="bi bi-arrow-up" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === selected.length - 1}
                      title="Move down"
                      style={iconBtn(i === selected.length - 1)}
                    >
                      <i className="bi bi-arrow-down" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBlog(b.id)}
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#dc2626",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <i className="bi bi-trash" /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            padding: "11px 28px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Featured Insights"}
        </button>
      </div>
    </div>
  );
};

const iconBtn = (disabled) => ({
  width: 30,
  height: 30,
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: disabled ? "#cbd5e1" : "#475569",
  cursor: disabled ? "default" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

export default AdminFeaturedInsights;
