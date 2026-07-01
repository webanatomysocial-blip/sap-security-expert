import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getChangelog, saveChangelogEntry, updateChangelogEntry, deleteChangelogEntry } from "../../services/api";
import { LuPlus, LuX, LuPencil, LuTrash2 } from "react-icons/lu";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";

const TYPE_META = {
  feature:     { label: "Feature",     bg: "#dcfce7", color: "#15803d" },
  fix:         { label: "Bug Fix",     bg: "#fee2e2", color: "#dc2626" },
  improvement: { label: "Improvement", bg: "#eff6ff", color: "#1d4ed8" },
  breaking:    { label: "Breaking",    bg: "#fef3c7", color: "#92400e" },
};

const EMPTY = { id: null, version: "", title: "", description: "", type: "feature" };

export default function AdminChangelog() {
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchLogs = useCallback(async () => {
    try {
      const res = await getChangelog();
      setLogs(res.data?.logs || []);
    } catch {
      addToast("Failed to load changelog", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const openModal = (entry = null) => {
    setErrors({});
    setForm(entry ? { ...entry } : EMPTY);
    setModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.version.trim()) e.version = "Version is required";
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.description.trim()) e.description = "Description is required";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (form.id) {
        await updateChangelogEntry(form.id, form);
      } else {
        await saveChangelogEntry(form);
      }
      addToast(form.id ? "Entry updated" : "Entry added", "success");
      setModal(false);
      fetchLogs();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id, title) => {
    openConfirm({
      title: "Delete Entry",
      message: `Remove "${title}" from the changelog?`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteChangelogEntry(id);
        addToast("Entry deleted", "success");
        fetchLogs();
      },
    });
  };

  const f = (v) => (k) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Change Logs</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Track platform updates, features, and fixes</p>
          </div>
          <button className="btn-primary" onClick={() => openModal()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <LuPlus size={16} /> Add Entry
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No changelog entries yet. Add the first one!</div>
        ) : (
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Version</th>
                  <th>Title</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th>Description</th>
                  <th style={{ width: 120 }}>Added By</th>
                  <th style={{ width: 110 }}>Date</th>
                  <th style={{ width: 70 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = TYPE_META[log.type] || TYPE_META.feature;
                  return (
                    <tr key={log.id}>
                      <td><code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>v{log.version}</code></td>
                      <td style={{ fontWeight: 600 }}>{log.title}</td>
                      <td>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ color: "#475569", fontSize: 13, maxWidth: 320, whiteSpace: "pre-wrap" }}>{log.description}</td>
                      <td style={{ color: "#64748b", fontSize: 13 }}>{log.author_name || "Admin"}</td>
                      <td style={{ color: "#94a3b8", fontSize: 13, whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        <ActionMenu>
                          <button className="action-menu-item" onClick={() => openModal(log)}>
                            <LuPencil size={14} style={{ marginRight: 6 }} /> Edit
                          </button>
                          <div className="action-menu-separator" />
                          <button className="action-menu-item danger" onClick={() => handleDelete(log.id, log.title)}>
                            <LuTrash2 size={14} style={{ marginRight: 6 }} /> Delete
                          </button>
                        </ActionMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScrollContainer>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{form.id ? "Edit Entry" : "New Changelog Entry"}</h3>
              <button className="modal-close-btn" onClick={() => setModal(false)}><LuX size={20} /></button>
            </div>
            <div className="modal-body" data-lenis-prevent="true" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Version <span style={{ color: "#dc2626" }}>*</span></label>
                  <input className="form-control" placeholder="e.g. 1.4.2" value={form.version} onChange={(e) => f(e.target.value)("version")} style={errors.version ? { borderColor: "#dc2626" } : {}} />
                  {errors.version && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{errors.version}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-control" value={form.type} onChange={(e) => f(e.target.value)("type")}>
                    {Object.entries(TYPE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Title <span style={{ color: "#dc2626" }}>*</span></label>
                <input className="form-control" placeholder="Short summary of the change" value={form.title} onChange={(e) => f(e.target.value)("title")} style={errors.title ? { borderColor: "#dc2626" } : {}} />
                {errors.title && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{errors.title}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">Description <span style={{ color: "#dc2626" }}>*</span></label>
                <textarea className="form-control" rows={4} placeholder="Describe what changed and why…" value={form.description} onChange={(e) => f(e.target.value)("description")} style={errors.description ? { borderColor: "#dc2626" } : {}} />
                {errors.description && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{errors.description}</p>}
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid #f1f5f9" }}>
              <button className="btn-secondary" onClick={() => setModal(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "8px 20px", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : form.id ? "Update" : "Add Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
