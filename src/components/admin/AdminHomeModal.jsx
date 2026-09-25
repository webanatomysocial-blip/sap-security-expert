import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { getAdminSettings, saveAdminSetting } from "../../services/api";
import { compressImage } from "../../utils/compressImage";

const empty = { enabled: false, image: "", button_text: "", button_link: "" };

const AdminHomeModal = () => {
  const { addToast } = useToast();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getAdminSettings()
      .then((r) => {
        try { setForm({ ...empty, ...JSON.parse(r.data.settings?.home_modal || "{}") }); } catch { /* keep defaults */ }
      })
      .catch(() => addToast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image", await compressImage(file, { maxWidth: 1000, maxHeight: 1000 }));
    fd.append("zone", "home-modal");
    fd.append("old_image", form.image || "");
    try {
      const res = await fetch("/api/upload-ad-image", {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": localStorage.getItem("csrf_token") || "" },
        body: fd,
      });
      const data = await res.json();
      if (data.status === "success") set("image", data.path);
      else addToast(data.message || "Upload failed", "error");
    } catch {
      addToast("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (form.enabled && !form.image) return addToast("Upload an image before enabling the modal", "error");
    if (!!form.button_text !== !!form.button_link) return addToast("Button needs both text and a link", "error");
    setSaving(true);
    try {
      await saveAdminSetting("home_modal", JSON.stringify(form));
      addToast("Home modal saved", "success");
    } catch (err) {
      addToast(err.response?.data?.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="admin-page-wrapper"><p>Loading…</p></div>;

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Home Modal</h3>
        <div className="page-header-actions">
          <button className="btn-approve btn-sm" onClick={handleSave} disabled={saving || uploading}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div className="admin-card" style={{ padding: 24, flex: "1 1 340px", maxWidth: 560 }}>
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => set("enabled", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: "#ee5e42" }}
              />
              Show this modal on the home page (opens 1 second after load)
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Image (1:1 square works best)</label>
            <input
              type="file"
              accept="image/*"
              className="form-control"
              onChange={(e) => handleUpload(e.target.files[0])}
              disabled={uploading}
            />
            {uploading && <small>Uploading…</small>}
          </div>

          <div className="form-group">
            <label className="form-label">Button text</label>
            <input
              type="text"
              className="form-control"
              maxLength={60}
              value={form.button_text}
              onChange={(e) => set("button_text", e.target.value)}
              placeholder="e.g. Register Now"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Button link</label>
            <input
              type="text"
              className="form-control"
              value={form.button_link}
              onChange={(e) => set("button_link", e.target.value)}
              placeholder="https://… or /learning-hub"
            />
            <small style={{ color: "#64748b" }}>Leave text and link empty to show the image only.</small>
          </div>
        </div>

        <div style={{ flex: "0 0 auto" }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Preview</p>
          <div style={{ width: 300, background: "#fff", borderRadius: 16, boxShadow: "0 12px 30px rgba(15,23,42,.2)", overflow: "hidden" }}>
            {form.image ? (
              <img src={form.image} alt="" style={{ display: "block", width: "100%", aspectRatio: "1 / 1", objectFit: "cover" }} />
            ) : (
              <div style={{ aspectRatio: "1 / 1", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                No image
              </div>
            )}
            {form.button_text && (
              <div style={{ padding: 14 }}>
                <div style={{ background: "#ee5e42", color: "#fff", textAlign: "center", padding: "11px 14px", borderRadius: 10, fontWeight: 600 }}>
                  {form.button_text}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHomeModal;
