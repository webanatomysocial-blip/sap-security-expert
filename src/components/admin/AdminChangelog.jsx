import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import {
  getChangelog,
  saveChangelogEntry,
  updateChangelogEntry,
  deleteChangelogEntry,
} from "../../services/api";
import TableScrollContainer from "./TableScrollContainer";
import ActionMenu from "./ActionMenu";

const TYPE_META = {
  feature:     { label: "Feature",     bg: "#dcfce7", color: "#15803d" },
  fix:         { label: "Bug Fix",     bg: "#fee2e2", color: "#dc2626" },
  improvement: { label: "Improvement", bg: "#eff6ff", color: "#1d4ed8" },
  breaking:    { label: "Breaking",    bg: "#fef3c7", color: "#92400e" },
};

const EMPTY = { version: "", title: "", description: "", type: "feature" };

// Bump version: breaking/feature (large) → minor, fix/improvement (small) → patch
function suggestNextVersion(currentVersion, type) {
  const parts = String(currentVersion || "3.0.0").split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return currentVersion;
  const [major, minor, patch] = parts;
  if (type === "breaking") return `${major + 1}.0.0`;
  if (type === "feature")  return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`; // fix / improvement → patch
}

function EntryModal({ initial, latestVersion, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { ...EMPTY, version: suggestNextVersion(latestVersion, "feature") }
  );
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // When type changes (add mode only), auto-suggest a new version
  const handleTypeChange = (newType) => {
    if (initial) { set("type", newType); return; } // editing — don't clobber version
    setForm((f) => ({ ...f, type: newType, version: suggestNextVersion(latestVersion, newType) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.version.trim() || !form.title.trim() || !form.description.trim()) {
      addToast("Version, title, and description are required.", "error");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch {
      addToast("Failed to save entry.", "error");
    } finally {
      setSaving(false);
    }
  };

  const overlay = {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    backdropFilter: "blur(3px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 9000, padding: 20,
  };
  const box = {
    background: "#fff", borderRadius: 16, padding: "28px 28px 24px",
    width: "100%", maxWidth: 540, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
  };
  const label = { display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 6 };
  const input = { width: "100%", padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: "0.88rem", fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
  const row = { marginBottom: 16 };

  return (
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#1e293b" }}>
            {initial ? "Edit Changelog Entry" : "Add Changelog Entry"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={label}>Version *</label>
              <input style={input} placeholder="e.g. 3.2.0" value={form.version} onChange={(e) => set("version", e.target.value)} />
              {!initial && <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 4, display: "block" }}>Auto-suggested · edit if needed</span>}
            </div>
            <div>
              <label style={label}>Type *</label>
              <select style={input} value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                {Object.entries(TYPE_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={row}>
            <label style={label}>Title *</label>
            <input style={input} placeholder="Short summary of the change" value={form.title} onChange={(e) => set("title", e.target.value)} />
          </div>

          <div style={row}>
            <label style={label}>Description *</label>
            <textarea
              style={{ ...input, minHeight: 90, resize: "vertical" }}
              placeholder="Detailed description of what changed..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: "9px 20px", border: "1.5px solid #e2e8f0", borderRadius: 8, background: "#fff", fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: "9px 22px", background: "#e85d2f", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.88rem", cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving…" : "Save Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminChangelog() {
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', entry }

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

  const handleSave = async (form) => {
    if (modal?.mode === "edit") {
      await updateChangelogEntry(modal.entry.id, form);
      addToast("Entry updated.", "success");
    } else {
      await saveChangelogEntry(form);
      addToast("Entry added.", "success");
    }
    fetchLogs();
  };

  const handleDelete = (log) => {
    openConfirm({
      title: "Delete Entry",
      message: `Delete "${log.title}"? This cannot be undone.`,
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteChangelogEntry(log.id);
          addToast("Entry deleted.", "success");
          fetchLogs();
        } catch {
          addToast("Failed to delete entry.", "error");
        }
      },
    });
  };

  // Compute latest version for the badge
  const latestVersion = logs.length > 0 ? logs[0].version : "—";

  return (
    <div>
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Change Logs</h2>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800, background: "#f0f9ff", color: "#0369a1", border: "1.5px solid #bae6fd", letterSpacing: "0.04em" }}>
                Latest v{latestVersion}
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Auto-loaded from <code style={{ fontSize: 11 }}>CHANGELOG.md</code> · manual entries can be added below</p>
          </div>
          <button
            onClick={() => setModal({ mode: "add" })}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "#e85d2f", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: "0.88rem", cursor: "pointer", fontFamily: "inherit" }}
          >
            <i className="bi bi-plus-lg"></i> Add Entry
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
            <p style={{ color: "#64748b", margin: 0 }}>No changelog entries yet.</p>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 6 }}>Click "Add Entry" to log the first version update.</p>
          </div>
        ) : (
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-xs">Version</th>
                  <th>Title</th>
                  <th className="col-sm">Type</th>
                  <th>Description</th>
                  <th className="col-md">Added By</th>
                  <th className="col-md">Date</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const meta = TYPE_META[log.type] || TYPE_META.improvement;
                  return (
                    <tr key={log.id}>
                      <td><code style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: 5, fontSize: 12, fontWeight: 700 }}>v{log.version}</code></td>
                      <td style={{ fontWeight: 600 }}>{log.title}</td>
                      <td>
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                      </td>
                      <td style={{ color: "#475569", fontSize: 13, maxWidth: 300, whiteSpace: "pre-wrap" }}>{log.description}</td>
                      <td style={{ color: "#64748b", fontSize: 13 }}>{log.author_name || "Admin"}</td>
                      <td style={{ color: "#94a3b8", fontSize: 13, whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        {log.source === "db" ? (
                          <ActionMenu items={[
                            { label: "Edit", icon: "bi-pencil", onClick: () => setModal({ mode: "edit", entry: log }) },
                            { label: "Delete", icon: "bi-trash", danger: true, onClick: () => handleDelete(log) },
                          ]} />
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "#0369a1", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>
                            <i className="bi bi-file-earmark-text"></i> CHANGELOG.md
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScrollContainer>
        )}
      </div>

      {modal && (
        <EntryModal
          initial={modal.mode === "edit" ? modal.entry : null}
          latestVersion={latestVersion}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
