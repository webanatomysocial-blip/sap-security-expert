import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { getEmailTemplates, getEmailTemplate, saveEmailTemplate } from "../../services/api";
import { LuMail, LuSave, LuEye, LuChevronRight } from "react-icons/lu";

const CATEGORY_LABELS = {
  member: "Member",
  contributor: "Contributor",
  comments: "Comments",
  contact: "Contact",
  system: "System",
};

export default function AdminEmailTemplates() {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // { key, content }
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await getEmailTemplates();
      setTemplates(res.data?.templates || []);
    } catch {
      addToast("Failed to load email templates", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openTemplate = async (key) => {
    try {
      const res = await getEmailTemplate(key);
      setSelected({ key, content: res.data.content });
      setEditContent(res.data.content);
      setPreview(false);
    } catch {
      addToast("Failed to load template", "error");
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await saveEmailTemplate(selected.key, editContent);
      addToast("Template saved successfully", "success");
      setSelected((p) => ({ ...p, content: editContent }));
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save template", "error");
    } finally {
      setSaving(false);
    }
  };

  // Group templates by category
  const grouped = templates.reduce((acc, t) => {
    const cat = t.key.split("/")[0];
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, items]) => {
    const filtered = items.filter((t) =>
      !search.trim() || t.label.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length) acc[cat] = filtered;
    return acc;
  }, {});

  const friendlyName = (key) => key.split("/").slice(1).join(" ").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ display: "flex", height: "calc(100vh - 80px)", gap: 0, background: "#f8fafc" }}>
      {/* Sidebar list */}
      <div style={{ width: 280, flexShrink: 0, background: "#fff", borderRight: "1px solid #e2e8f0", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <LuMail size={18} style={{ color: "#ee5e42" }} /> Email Templates
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>Click a template to edit</p>
        </div>
        <div style={{ padding: "10px 12px" }}>
          <input
            className="form-control"
            placeholder="Search templates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
        {loading ? (
          <div style={{ padding: 20, color: "#94a3b8", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {Object.entries(filteredGrouped).map(([cat, items]) => (
              <div key={cat}>
                <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                  {CATEGORY_LABELS[cat] || cat}
                </div>
                {items.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => openTemplate(t.key)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "9px 16px", border: "none", textAlign: "left",
                      cursor: "pointer", fontSize: 13, fontWeight: selected?.key === t.key ? 600 : 400,
                      background: selected?.key === t.key ? "#eff6ff" : "transparent",
                      color: selected?.key === t.key ? "#1d4ed8" : "#374151",
                      borderLeft: selected?.key === t.key ? "3px solid #1d4ed8" : "3px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <span>{friendlyName(t.key)}</span>
                    {selected?.key === t.key && <LuChevronRight size={14} />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor / Preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", flexDirection: "column", gap: 12 }}>
            <LuMail size={40} style={{ opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 15 }}>Select a template from the left to edit</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>{friendlyName(selected.key)}</h3>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>{selected.key}.html</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setPreview((p) => !p)}
                  style={{ padding: "7px 14px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: preview ? "#1e293b" : "#fff", color: preview ? "#fff" : "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  <LuEye size={14} /> {preview ? "Edit" : "Preview"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || editContent === selected.content}
                  style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: "#ee5e42", color: "#fff", fontWeight: 600, fontSize: 13, cursor: saving || editContent === selected.content ? "not-allowed" : "pointer", opacity: saving || editContent === selected.content ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <LuSave size={14} /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {/* Placeholder hint */}
            <div style={{ padding: "8px 20px", background: "#fffbeb", borderBottom: "1px solid #fde68a", fontSize: 12, color: "#92400e" }}>
              <strong>Tip:</strong> Use <code style={{ background: "#fef3c7", padding: "1px 4px", borderRadius: 3 }}>{"{{placeholder}}"}</code> for dynamic values. Do not remove existing placeholders.
            </div>

            {/* Editor or Preview */}
            {preview ? (
              <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
                <div
                  style={{ maxWidth: 680, margin: "0 auto", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
                  dangerouslySetInnerHTML={{ __html: editContent }}
                />
              </div>
            ) : (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  flex: 1, width: "100%", border: "none", outline: "none", resize: "none",
                  fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 13, lineHeight: 1.6,
                  padding: 20, background: "#1e293b", color: "#e2e8f0", boxSizing: "border-box",
                }}
                spellCheck={false}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
