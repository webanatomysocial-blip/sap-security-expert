import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { getChangelog } from "../../services/api";
import TableScrollContainer from "./TableScrollContainer";
import { APP_VERSION } from "../../config/appVersion";

const TYPE_META = {
  feature:     { label: "Feature",     bg: "#dcfce7", color: "#15803d" },
  fix:         { label: "Bug Fix",     bg: "#fee2e2", color: "#dc2626" },
  improvement: { label: "Improvement", bg: "#eff6ff", color: "#1d4ed8" },
  breaking:    { label: "Breaking",    bg: "#fef3c7", color: "#92400e" },
};

export default function AdminChangelog() {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <div className="admin-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Change Logs</h2>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 800, background: "#f0f9ff", color: "#0369a1", border: "1.5px solid #bae6fd", letterSpacing: "0.04em" }}>
                App v{APP_VERSION}
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#94a3b8" }}>Track platform updates, features, and fixes automatically from git commits</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No changelog entries found.</div>
        ) : (
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 110 }}>Version</th>
                  <th>Title</th>
                  <th style={{ width: 110 }}>Type</th>
                  <th>Description</th>
                  <th style={{ width: 150 }}>Author</th>
                  <th style={{ width: 150 }}>Date</th>
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
                      <td style={{ color: "#64748b", fontSize: 13 }}>{log.author_name || "System"}</td>
                      <td style={{ color: "#94a3b8", fontSize: 13, whiteSpace: "nowrap" }}>
                        {new Date(log.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScrollContainer>
        )}
      </div>
    </div>
  );
}
