import { useState, useEffect, useCallback } from "react";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";
import useScrollLock from "../../hooks/useScrollLock";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getAds, saveAd, getAdminBlogAds, saveBlogAd, deleteBlogAd, toggleBlogAd, getBlogs } from "../../services/api";

const ZONE_ADS = [
  { id: "community_left",  label: "Community Page – Left Ad",  dimensions: "300×300 px" },
  { id: "community_right", label: "Community Page – Right Ad", dimensions: "300×300 px" },
  { id: "blog_sidebar",    label: "Blog Sidebar Ad",           dimensions: "300×300 px" },
];

const EMPTY_BLOG_AD = { ad_type: "inline", target: "all", blog_slugs: [], position: 3, image: "", link: "", title: "", active: false };

function AdTypeCard({ selected, onClick, icon, label, desc }) {
  return (
    <div onClick={onClick} style={{
      flex: 1, border: `2px solid ${selected ? "#ee5e42" : "#e2e8f0"}`,
      borderRadius: 12, padding: "14px 16px", cursor: "pointer",
      background: selected ? "#fff8f6" : "#fafafa", transition: "all 0.15s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          background: selected ? "#fee4dc" : "#f1f5f9", color: selected ? "#ee5e42" : "#64748b", fontSize: "1rem",
        }}>
          <i className={`bi ${icon}`}></i>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected ? "#ee5e42" : "#cbd5e1"}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {selected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ee5e42" }} />}
          </div>
          <strong style={{ fontSize: "0.88rem", color: "#1e293b" }}>{label}</strong>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748b", paddingLeft: 0 }}>{desc}</p>
    </div>
  );
}

export default function AdminAds() {
  const { role } = useAuth();
  const { addToast } = useToast();
  const isAdmin = role === "admin";

  // ── Zone ads ──
  const [zoneAds, setZoneAds] = useState({
    community_left:  { image: "", link: "", active: false },
    community_right: { image: "", link: "", active: false },
    blog_sidebar:    { image: "", link: "", active: false },
  });
  const [editingZone, setEditingZone] = useState(null);
  const [zoneUploading, setZoneUploading] = useState(null);
  const [zoneMsg, setZoneMsg] = useState("");
  const [zoneSaving, setZoneSaving] = useState(false);

  // ── In-article / strip ads ──
  const [blogAds, setBlogAds] = useState([]);
  const [blogAdLoading, setBlogAdLoading] = useState(false);
  const [showBlogAdModal, setShowBlogAdModal] = useState(false);
  const [editingBlogAd, setEditingBlogAd] = useState(null);
  const [blogAdForm, setBlogAdForm] = useState(EMPTY_BLOG_AD);
  const [blogAdUploading, setBlogAdUploading] = useState(false);
  const [blogAdSaving, setBlogAdSaving] = useState(false);
  const [allBlogs, setAllBlogs] = useState([]);
  const [blogSearch, setBlogSearch] = useState("");

  // ── Tab ──
  const [tab, setTab] = useState("zones");

  useScrollLock(!!editingZone || showBlogAdModal);

  useEffect(() => {
    getAds().then(r => { if (r.data) setZoneAds(prev => ({ ...prev, ...r.data })); }).catch(() => {});
  }, []);

  const fetchBlogAds = useCallback(() => {
    setBlogAdLoading(true);
    getAdminBlogAds().then(r => setBlogAds(r.data?.ads || [])).catch(() => {}).finally(() => setBlogAdLoading(false));
  }, []);

  useEffect(() => { if (tab === "article") fetchBlogAds(); }, [tab, fetchBlogAds]);

  useEffect(() => {
    if (showBlogAdModal) {
      getBlogs({ limit: 200 }).then(r => setAllBlogs(r.data?.posts || r.data?.blogs || [])).catch(() => {});
    }
  }, [showBlogAdModal]);

  // ── Zone ad handlers ──
  const handleZoneChange = (zone, field, value) => setZoneAds(p => ({ ...p, [zone]: { ...p[zone], [field]: value } }));

  const handleZoneImageUpload = async (zone, file) => {
    setZoneUploading(zone);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("zone", zone);
    // Use native fetch — axios interceptors can corrupt multipart/form-data boundaries
    try {
      const res = await fetch("/api/upload-ad-image", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": localStorage.getItem("csrf_token") || "" },
        body: fd,
      });
      const data = await res.json();
      if (data.status === "success") {
        handleZoneChange(zone, "image", data.path);
        setZoneMsg("✓ Image uploaded");
        setTimeout(() => setZoneMsg(""), 3000);
      } else {
        setZoneMsg("Upload failed: " + data.message);
      }
    } catch (err) {
      setZoneMsg("Upload failed: " + err.message);
    } finally {
      setZoneUploading(null);
    }
  };

  const handleZoneSave = async (e) => {
    e.preventDefault();
    setZoneSaving(true);
    try {
      const r = await saveAd({ ...zoneAds[editingZone], zone: editingZone });
      if (r.data.status === "success") {
        addToast("Ad zone saved!", "success");
        setEditingZone(null);
      } else {
        setZoneMsg("Failed to save.");
      }
    } catch {
      setZoneMsg("Error saving.");
    } finally {
      setZoneSaving(false);
    }
  };

  // ── Blog ad handlers ──
  const openNewBlogAd = () => { setEditingBlogAd(null); setBlogAdForm(EMPTY_BLOG_AD); setBlogSearch(""); setShowBlogAdModal(true); };
  const openEditBlogAd = (ad) => {
    setEditingBlogAd(ad);
    setBlogAdForm({ ad_type: ad.ad_type, target: ad.target, blog_slugs: ad.blog_slugs || [], position: ad.position, image: ad.image, link: ad.link || "", title: ad.title || "", active: !!ad.active });
    setBlogSearch("");
    setShowBlogAdModal(true);
  };

  const handleBlogAdImageUpload = async (file) => {
    setBlogAdUploading(true);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("zone", "blog_inline");
    // Use native fetch — axios interceptors can corrupt multipart/form-data boundaries
    try {
      const res = await fetch("/api/upload-ad-image", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": localStorage.getItem("csrf_token") || "" },
        body: fd,
      });
      const data = await res.json();
      if (data.status === "success") {
        setBlogAdForm(p => ({ ...p, image: data.path }));
        addToast("Image uploaded!", "success");
      } else {
        addToast("Image upload failed: " + data.message, "error");
      }
    } catch (err) {
      addToast("Upload error: " + err.message, "error");
    } finally {
      setBlogAdUploading(false);
    }
  };

  const handleBlogAdSave = async (e) => {
    e.preventDefault();
    if (!blogAdForm.image) { addToast("Please upload an ad image.", "error"); return; }
    setBlogAdSaving(true);
    try {
      const payload = { ...blogAdForm, id: editingBlogAd?.id };
      const r = await saveBlogAd(payload);
      if (r.data.status === "success") {
        addToast(editingBlogAd ? "Ad updated!" : "Ad created!", "success");
        setShowBlogAdModal(false);
        fetchBlogAds();
      } else {
        addToast(r.data.message || "Failed to save.", "error");
      }
    } catch {
      addToast("Error saving ad.", "error");
    } finally {
      setBlogAdSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try { await toggleBlogAd(id); fetchBlogAds(); } catch { addToast("Toggle failed", "error"); }
  };

  const handleDeleteBlogAd = async (id) => {
    if (!window.confirm("Delete this ad permanently?")) return;
    try { await deleteBlogAd(id); addToast("Ad deleted.", "success"); fetchBlogAds(); } catch { addToast("Delete failed.", "error"); }
  };

  const toggleSlug = (slug) => {
    setBlogAdForm(p => ({
      ...p,
      blog_slugs: p.blog_slugs.includes(slug) ? p.blog_slugs.filter(s => s !== slug) : [...p.blog_slugs, slug],
    }));
  };

  const filteredBlogs = allBlogs.filter(b => (b.title || b.slug || "").toLowerCase().includes(blogSearch.toLowerCase()));

  return (
    <div className="admin-page-wrapper">

      {/* ── Header + tabs ── */}
      <div className="page-header" style={{ flexDirection: "column", alignItems: "flex-start", gap: 0, paddingBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0 }}>Ads &amp; Promotions</h3>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>Manage sidebar zone ads and in-article placements</p>
          </div>
          {tab === "article" && isAdmin && (
            <button className="btn-primary" onClick={openNewBlogAd} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <i className="bi bi-plus-lg"></i> New Ad
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #f1f5f9", width: "100%" }}>
          {[
            { key: "zones", label: "Zone Ads", icon: "bi-grid-3x3-gap" },
            { key: "article", label: "In-Article & Strip", icon: "bi-file-earmark-richtext" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "10px 22px", background: "none", border: "none",
              borderBottom: tab === t.key ? "2px solid #ee5e42" : "2px solid transparent",
              marginBottom: -2, color: tab === t.key ? "#ee5e42" : "#64748b",
              fontWeight: tab === t.key ? 700 : 500, fontSize: "0.88rem", cursor: "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7,
            }}>
              <i className={`bi ${t.icon}`}></i> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Zone Ads tab ── */}
      {tab === "zones" && (
        <div className="admin-card">
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-xl text-left">Zone</th>
                  <th className="col-md text-center">Preview</th>
                  <th className="col-xxl text-left">Link Destination</th>
                  <th className="col-sm text-center">Clicks</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ZONE_ADS.map(zone => {
                  const ad = zoneAds[zone.id] || {};
                  return (
                    <tr key={zone.id}>
                      <td className="col-xl text-left wrap-text">
                        <strong style={{ fontSize: "0.85rem" }}>{zone.label}</strong>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>{zone.dimensions}</div>
                      </td>
                      <td className="col-md text-center">
                        {ad.image
                          ? <img src={ad.image} alt={zone.label} style={{ maxHeight: 44, maxWidth: 80, borderRadius: 6, objectFit: "cover", border: "1px solid #e2e8f0" }} />
                          : <div style={{ width: 44, height: 44, margin: "0 auto", background: "#f8fafc", borderRadius: 6, border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <i className="bi bi-image" style={{ color: "#cbd5e1", fontSize: "1.1rem" }}></i>
                            </div>}
                      </td>
                      <td className="col-xxl text-left">
                        {ad.link
                          ? <a href={ad.link} target="_blank" rel="noreferrer" style={{ wordBreak: "break-all", fontSize: "0.8rem", color: "#3b82f6" }}>{ad.link}</a>
                          : <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>}
                      </td>
                      <td className="col-sm text-center">
                        <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 10px", borderRadius: 20, fontWeight: 600, fontSize: "0.78rem", color: "#475569" }}>{ad.clicks || 0}</span>
                      </td>
                      <td className="col-sm text-center">
                        <span className={`status-badge ${ad.active ? "status-active" : "status-rejected"}`}>
                          {ad.active ? "Active" : "Off"}
                        </span>
                      </td>
                      <td className="col-actions text-center">
                        <ActionMenu>
                          <button className="action-menu-item" onClick={() => { setZoneMsg(""); setEditingZone(zone.id); }}>
                            <i className="bi bi-pencil-square"></i> Edit
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

      {/* ── In-Article / Strip Ads tab ── */}
      {tab === "article" && (
        <>
          {blogAdLoading ? (
            <div className="admin-card" style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
              <div className="spinner-border" style={{ width: 28, height: 28, borderWidth: 3, borderColor: "#ee5e42", borderRightColor: "transparent" }} role="status"></div>
              <p style={{ marginTop: 12, fontSize: "0.85rem" }}>Loading ads…</p>
            </div>
          ) : blogAds.length === 0 ? (
            <div className="admin-card" style={{ textAlign: "center", padding: "56px 24px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fff3f0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <i className="bi bi-megaphone" style={{ fontSize: "1.6rem", color: "#ee5e42" }}></i>
              </div>
              <h4 style={{ margin: "0 0 8px", color: "#1e293b", fontWeight: 700 }}>No in-article ads yet</h4>
              <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.88rem" }}>Create an ad that appears between paragraphs or as a full-width strip inside blog articles.</p>
              {isAdmin && (
                <button className="btn-primary" onClick={openNewBlogAd} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-plus-lg"></i> Create First Ad
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {blogAds.map(ad => (
                <div key={ad.id} className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
                  {/* Ad image banner */}
                  <div style={{ position: "relative", height: 120, background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    {ad.image
                      ? <img src={ad.image} alt={ad.title || "Ad"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <i className="bi bi-image" style={{ fontSize: "2rem", color: "#cbd5e1" }}></i>
                        </div>}
                    {/* Type badge */}
                    <span style={{
                      position: "absolute", top: 10, left: 10,
                      background: ad.ad_type === "strip" ? "#fef3c7" : "#eff6ff",
                      color: ad.ad_type === "strip" ? "#92400e" : "#1d4ed8",
                      borderRadius: 6, padding: "3px 10px", fontSize: "0.72rem", fontWeight: 700,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    }}>
                      {ad.ad_type === "strip" ? "⬛ Strip" : "¶ Inline"}
                    </span>
                    {/* Status badge */}
                    <span className={`status-badge ${ad.active ? "status-active" : "status-rejected"}`} style={{
                      position: "absolute", top: 10, right: 10, fontSize: "0.72rem",
                    }}>
                      {ad.active ? "Active" : "Off"}
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ad.title || "Untitled Ad"}
                        </h4>
                        <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#64748b" }}>
                            <i className="bi bi-bullseye"></i>
                            {ad.target === "all" ? "All blogs" : `${(ad.blog_slugs || []).length} blogs`}
                          </span>
                          {ad.ad_type === "inline" && (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#64748b" }}>
                              <i className="bi bi-paragraph"></i> After §{ad.position}
                            </span>
                          )}
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#64748b" }}>
                            <i className="bi bi-cursor"></i> {ad.clicks || 0} clicks
                          </span>
                        </div>
                      </div>
                      {isAdmin && (
                        <ActionMenu>
                          <button className="action-menu-item" onClick={() => openEditBlogAd(ad)}><i className="bi bi-pencil-square"></i> Edit</button>
                          <button className="action-menu-item" onClick={() => handleToggle(ad.id)}>
                            <i className={`bi ${ad.active ? "bi-pause-circle" : "bi-play-circle"}`}></i> {ad.active ? "Deactivate" : "Activate"}
                          </button>
                          <button className="action-menu-item danger" onClick={() => handleDeleteBlogAd(ad.id)}><i className="bi bi-trash"></i> Delete</button>
                        </ActionMenu>
                      )}
                    </div>

                    {ad.link && (
                      <a href={ad.link} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 10, fontSize: "0.75rem", color: "#94a3b8", wordBreak: "break-all", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <i className="bi bi-link-45deg"></i> {ad.link}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Zone ad edit modal ── */}
      {editingZone && (
        <div className="modal-overlay" onClick={() => setEditingZone(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Ad Zone</h3>
              <button className="modal-close-btn" onClick={() => setEditingZone(null)}>×</button>
            </div>
            <div className="modal-body" data-lenis-prevent>
              {zoneMsg && (
                <div style={{ padding: "10px 14px", background: zoneMsg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", color: zoneMsg.startsWith("✓") ? "#166534" : "#991b1b", border: `1px solid ${zoneMsg.startsWith("✓") ? "#bbf7d0" : "#fecaca"}`, borderRadius: 8, marginBottom: 16, fontSize: "0.85rem" }}>
                  {zoneMsg}
                </div>
              )}
              <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", marginBottom: 20, border: "1px solid #f1f5f9" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                  <strong style={{ color: "#334155" }}>{ZONE_ADS.find(z => z.id === editingZone)?.label}</strong>
                  <span style={{ marginLeft: 8, color: "#94a3b8" }}>{ZONE_ADS.find(z => z.id === editingZone)?.dimensions}</span>
                </p>
              </div>
              <form id="edit-zone-form" onSubmit={handleZoneSave}>
                <div className="form-group">
                  <label>Ad Image <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.78rem" }}>· Any size accepted</span></label>
                  {zoneAds[editingZone]?.image ? (
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <img src={zoneAds[editingZone].image} style={{ width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }} alt="Current ad" />
                      <label style={{ position: "absolute", bottom: 7, right: 7, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="bi bi-arrow-repeat"></i> Replace
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleZoneImageUpload(editingZone, e.target.files[0]); }} />
                      </label>
                    </div>
                  ) : (
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <div style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: "20px 16px", textAlign: "center", background: "#fafafa" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#ee5e42"; e.currentTarget.style.background = "#fff8f6"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fafafa"; }}
                      >
                        {zoneUploading === editingZone ? (
                          <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
                            <div style={{ width: 28, height: 28, border: "3px solid #ee5e42", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }}></div>
                            Uploading…
                          </p>
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up" style={{ fontSize: "1.6rem", color: "#cbd5e1", display: "block", marginBottom: 6 }}></i>
                            <p style={{ margin: "0 0 3px", color: "#475569", fontSize: "0.85rem", fontWeight: 600 }}>Click to upload</p>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.78rem" }}>JPG, PNG, WEBP · No size limit</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={!!zoneUploading} onChange={e => { if (e.target.files[0]) handleZoneImageUpload(editingZone, e.target.files[0]); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
                <div className="form-group">
                  <label>Destination Link</label>
                  <input type="url" value={zoneAds[editingZone]?.link || ""} onChange={e => handleZoneChange(editingZone, "link", e.target.value.trim())} placeholder="https://example.com" className="form-control" />
                </div>
                <div className="form-group">
                  <label className="admin-checkbox">
                    <input type="checkbox" checked={!!zoneAds[editingZone]?.active} onChange={e => handleZoneChange(editingZone, "active", e.target.checked)} />
                    <span></span> Show this ad (Active)
                  </label>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setEditingZone(null)}>Cancel</button>
              <button type="submit" form="edit-zone-form" className="btn-primary" disabled={zoneSaving || zoneUploading}>
                {zoneSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Blog ad create/edit modal ── */}
      {showBlogAdModal && (
        <div className="modal-overlay" onClick={() => setShowBlogAdModal(false)}>
          <div className="modal-container" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBlogAd ? "Edit In-Article Ad" : "New In-Article Ad"}</h3>
              <button className="modal-close-btn" onClick={() => setShowBlogAdModal(false)}>×</button>
            </div>
            <div className="modal-body" data-lenis-prevent>
              <form id="blog-ad-form" onSubmit={handleBlogAdSave}>

                <div className="form-group">
                  <label>Ad Title <span style={{ color: "#94a3b8", fontWeight: 400 }}>(internal label)</span></label>
                  <input className="form-control" placeholder="e.g. SAP Course Promo – June" value={blogAdForm.title} onChange={e => setBlogAdForm(p => ({ ...p, title: e.target.value }))} />
                </div>

                <div className="form-group">
                  <label>Ad Type</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <AdTypeCard
                      value="inline" selected={blogAdForm.ad_type === "inline"}
                      onClick={() => setBlogAdForm(p => ({ ...p, ad_type: "inline" }))}
                      icon="bi-paragraph" label="Inline" desc="Inserted between paragraphs inside the article"
                    />
                    <AdTypeCard
                      value="strip" selected={blogAdForm.ad_type === "strip"}
                      onClick={() => setBlogAdForm(p => ({ ...p, ad_type: "strip" }))}
                      icon="bi-layout-text-window" label="Strip" desc="Full-width banner below the article content"
                    />
                  </div>
                </div>

                {blogAdForm.ad_type === "inline" && (
                  <div className="form-group">
                    <label>Insert after paragraph #</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <input type="number" min={1} max={20} className="form-control" value={blogAdForm.position} onChange={e => setBlogAdForm(p => ({ ...p, position: Number(e.target.value) }))} style={{ maxWidth: 110 }} />
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>paragraph(s) from the top</span>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Target Blogs</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ v: "all", label: "All Blogs", icon: "bi-globe" }, { v: "specific", label: "Specific Blogs", icon: "bi-list-check" }].map(opt => (
                      <div key={opt.v} onClick={() => setBlogAdForm(p => ({ ...p, target: opt.v, blog_slugs: [] }))}
                        style={{ flex: 1, border: `2px solid ${blogAdForm.target === opt.v ? "#ee5e42" : "#e2e8f0"}`, borderRadius: 10, padding: "11px 14px", cursor: "pointer", background: blogAdForm.target === opt.v ? "#fff8f6" : "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${blogAdForm.target === opt.v ? "#ee5e42" : "#cbd5e1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {blogAdForm.target === opt.v && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ee5e42" }} />}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b" }}>{opt.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {blogAdForm.target === "specific" && (
                  <div className="form-group">
                    <label>Select Blogs <span style={{ color: "#64748b", fontWeight: 400 }}>({blogAdForm.blog_slugs.length} selected)</span></label>
                    <input className="form-control" placeholder="Search by title…" value={blogSearch} onChange={e => setBlogSearch(e.target.value)} style={{ marginBottom: 8 }} />
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, maxHeight: 180, overflowY: "auto" }} data-lenis-prevent>
                      {filteredBlogs.length === 0
                        ? <p style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.83rem", margin: 0 }}>No blogs found.</p>
                        : filteredBlogs.map(b => (
                          <label key={b.slug} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid #f8fafc", background: blogAdForm.blog_slugs.includes(b.slug) ? "#fff8f6" : "transparent", margin: 0 }}>
                            <input type="checkbox" checked={blogAdForm.blog_slugs.includes(b.slug)} onChange={() => toggleSlug(b.slug)} style={{ accentColor: "#ee5e42", width: 15, height: 15, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.83rem", color: "#334155" }}>{b.title || b.slug}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>
                    Ad Image
                    <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.78rem", marginLeft: 8 }}>
                      {blogAdForm.ad_type === "strip" ? "Recommended: 1200×120 px" : "Recommended: 728×90 px"} · Any size accepted
                    </span>
                  </label>

                  {blogAdForm.image ? (
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <img
                        src={blogAdForm.image}
                        alt="preview"
                        style={{ width: "100%", maxHeight: blogAdForm.ad_type === "strip" ? 70 : 110, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", display: "block" }}
                      />
                      <button
                        type="button"
                        onClick={() => setBlogAdForm(p => ({ ...p, image: "" }))}
                        style={{ position: "absolute", top: 7, right: 7, background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontSize: "0.8rem" }}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                      <label style={{ position: "absolute", bottom: 7, right: 7, background: "rgba(0,0,0,0.55)", borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                        <i className="bi bi-arrow-repeat"></i> Replace
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) handleBlogAdImageUpload(e.target.files[0]); }} />
                      </label>
                    </div>
                  ) : (
                    <label style={{ display: "block", cursor: "pointer" }}>
                      <div style={{ border: "2px dashed #e2e8f0", borderRadius: 10, padding: "24px 16px", textAlign: "center", background: "#fafafa", transition: "border-color 0.15s, background 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#ee5e42"; e.currentTarget.style.background = "#fff8f6"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#fafafa"; }}
                      >
                        {blogAdUploading ? (
                          <>
                            <div style={{ width: 36, height: 36, border: "3px solid #ee5e42", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 10px" }}></div>
                            <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>Uploading…</p>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up" style={{ fontSize: "1.8rem", color: "#cbd5e1", display: "block", marginBottom: 8 }}></i>
                            <p style={{ margin: "0 0 4px", color: "#475569", fontSize: "0.85rem", fontWeight: 600 }}>Click to upload ad image</p>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.78rem" }}>JPG, PNG, WEBP, GIF · No size limit</p>
                          </>
                        )}
                      </div>
                      <input type="file" accept="image/*" style={{ display: "none" }} disabled={blogAdUploading} onChange={e => { if (e.target.files[0]) handleBlogAdImageUpload(e.target.files[0]); e.target.value = ""; }} />
                    </label>
                  )}
                </div>

                <div className="form-group">
                  <label>Destination Link <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
                  <input type="url" className="form-control" placeholder="https://example.com" value={blogAdForm.link} onChange={e => setBlogAdForm(p => ({ ...p, link: e.target.value.trim() }))} />
                </div>

                <div className="form-group">
                  <label className="admin-checkbox">
                    <input type="checkbox" checked={blogAdForm.active} onChange={e => setBlogAdForm(p => ({ ...p, active: e.target.checked }))} />
                    <span></span> Publish this ad immediately (Active)
                  </label>
                </div>

              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowBlogAdModal(false)}>Cancel</button>
              <button type="submit" form="blog-ad-form" className="btn-primary" disabled={blogAdUploading || blogAdSaving}>
                {blogAdSaving ? "Saving…" : editingBlogAd ? "Save Changes" : "Create Ad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
