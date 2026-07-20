import { useState, useEffect, useCallback } from "react";
import { getAuditLogs } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import TableScrollContainer from "./TableScrollContainer";

const ACTION_META = {
  member_approved:            { label: "Member Approved",            color: "#22c55e" },
  member_rejected:            { label: "Member Rejected",            color: "#ef4444" },
  member_suspended:           { label: "Member Suspended",           color: "#f97316" },
  member_reactivated:         { label: "Member Reactivated",         color: "#22c55e" },
  member_deactivated:         { label: "Member Deactivated",         color: "#f97316" },
  member_hard_deleted:        { label: "Member Deleted",             color: "#ef4444" },
  member_password_reset:      { label: "Password Reset",             color: "#a855f7" },
  blog_approved:              { label: "Blog Approved",              color: "#22c55e" },
  blog_rejected:              { label: "Blog Rejected",              color: "#ef4444" },
  blog_moved_to_draft:        { label: "Blog → Draft",              color: "#eab308" },
  blog_exclusive_toggled:     { label: "Exclusive Toggled",          color: "#3b82f6" },
  blog_premium_toggled:       { label: "Premium Toggled",            color: "#3b82f6" },
  blog_expert_pick_toggled:   { label: "Expert Pick Toggled",        color: "#3b82f6" },
  contributor_approved:       { label: "Contributor Approved",       color: "#22c55e" },
  contributor_rejected:       { label: "Contributor Rejected",       color: "#ef4444" },
  contributor_deleted:        { label: "Contributor Deleted",        color: "#ef4444" },
  contributor_login_created:  { label: "Contributor Login Created",  color: "#3b82f6" },
  contributor_access_updated: { label: "Contributor Access Updated", color: "#3b82f6" },
  contributor_password_reset: { label: "Contributor Pwd Reset",      color: "#a855f7" },
  setting_changed:            { label: "Setting Changed",            color: "#06b6d4" },
  login_success:              { label: "Admin Login",                color: "#6b7280" },
  login_failure:              { label: "Login Failed",               color: "#ef4444" },
};

const ALL_ACTIONS = Object.keys(ACTION_META);

// Extract name + email from strings like "John Doe (john@example.com)"
function parseNameEmail(str) {
  const m = str?.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: str || "", email: null };
}

// Extract reason after ". Reason: " or "Reason:"
function extractReason(str) {
  const m = str?.match(/\.?\s*[Rr]eason:\s*(.+)$/);
  return m ? m[1].trim() : null;
}

function By({ actor }) {
  if (!actor) return null;
  return <> — by <strong>{actor}</strong></>;
}

// Parse raw details string into structured JSX description based on action
function renderDescription(action, details, actor) {
  const d = details || "";

  if (action === "member_approved" || action === "member_reactivated") {
    const subject = d.replace(/^(Approved|Reactivated) member:\s*/i, "").replace(/\. Reason:.+$/i, "");
    const { name, email } = parseNameEmail(subject);
    return <>Member <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#22c55e" }}>approved</strong><By actor={actor} /></>;
  }

  if (action === "member_rejected") {
    const subject = d.replace(/^Rejected member:\s*/i, "").replace(/\. Reason:.+$/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    const reason = extractReason(d);
    return <>Member <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#ef4444" }}>rejected</strong><By actor={actor} />{reason && <><br /><em style={{ color: "var(--text-muted, #888)", fontSize: 12 }}>Reason: {reason}</em></>}</>;
  }

  if (action === "member_suspended") {
    const subject = d.replace(/^Suspended member:\s*/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    return <>Member <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#f97316" }}>suspended</strong><By actor={actor} /></>;
  }

  if (action === "member_deactivated") {
    const subject = d.replace(/^Deactivated member:\s*/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    return <>Member <strong>{name}</strong>{email && <> ({email})</>} account was <strong style={{ color: "#f97316" }}>deactivated</strong><By actor={actor} /></>;
  }

  if (action === "member_hard_deleted") {
    const subject = d.replace(/^Permanently deleted member record:\s*/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    return <>Member <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#ef4444" }}>permanently deleted</strong><By actor={actor} /></>;
  }

  if (action === "member_password_reset") {
    const emailMatch = d.match(/\(([^)]+)\)/);
    const email = emailMatch ? emailMatch[1] : null;
    return <>Password <strong style={{ color: "#a855f7" }}>reset</strong> for member{email && <> (<strong>{email}</strong>)</>}<By actor={actor} /></>;
  }

  if (action === "blog_approved") {
    const m = d.match(/Approved blog:\s*"(.+?)"\s+by\s+(.+)$/i);
    if (m) return <>Blog <strong>"{m[1]}"</strong> submitted by <em>{m[2]}</em> was <strong style={{ color: "#22c55e" }}>approved &amp; published</strong><By actor={actor} /></>;
    return <>{d}<By actor={actor} /></>;
  }

  if (action === "blog_rejected") {
    const titleMatch = d.match(/Rejected blog:\s*"(.+?)"/i);
    const reason = extractReason(d);
    return <>Blog <strong>"{titleMatch?.[1] || "unknown"}"</strong> was <strong style={{ color: "#ef4444" }}>rejected</strong><By actor={actor} />{reason && <><br /><em style={{ color: "var(--text-muted, #888)", fontSize: 12 }}>Reason: {reason}</em></>}</>;
  }

  if (action === "blog_moved_to_draft") {
    const titleMatch = d.match(/Moved to draft:\s*"(.+?)"/i);
    const noteMatch = d.match(/Note:\s*(.+)$/i);
    return <>Blog <strong>"{titleMatch?.[1] || "unknown"}"</strong> moved to <strong style={{ color: "#eab308" }}>draft</strong><By actor={actor} />{noteMatch?.[1] && noteMatch[1] !== "none" && <><br /><em style={{ color: "var(--text-muted, #888)", fontSize: 12 }}>{noteMatch[1]}</em></>}</>;
  }

  if (action === "blog_exclusive_toggled") {
    const onOff = d.includes("exclusive=1") ? "enabled" : "disabled";
    const idMatch = d.match(/Blog #(\d+)/i);
    return <>Exclusive access <strong>{onOff}</strong> for blog{idMatch && <> #{idMatch[1]}</>}<By actor={actor} /></>;
  }

  if (action === "blog_premium_toggled") {
    const onOff = d.includes("premium=1") ? "enabled" : "disabled";
    const idMatch = d.match(/Blog #(\d+)/i);
    const credits = d.match(/credits_required=(\d+)/)?.[1];
    return <>Premium paywall <strong>{onOff}</strong> for blog{idMatch && <> #{idMatch[1]}</>}{credits && credits !== "n/a" && <> ({credits} credits)</>}<By actor={actor} /></>;
  }

  if (action === "blog_expert_pick_toggled") {
    const onOff = d.includes("expert_pick=1") ? "marked as Expert Pick" : "removed from Expert Picks";
    const idMatch = d.match(/Blog #(\d+)/i);
    return <>Blog{idMatch && <> #{idMatch[1]}</>} <strong>{onOff}</strong><By actor={actor} /></>;
  }

  if (action === "contributor_approved") {
    const subject = d.replace(/^Approved contributor:\s*/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    return <>Contributor <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#22c55e" }}>approved</strong><By actor={actor} /></>;
  }

  if (action === "contributor_rejected") {
    const subject = d.replace(/^Rejected contributor:\s*/i, "").replace(/\. Reason:.+$/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    const reason = extractReason(d);
    return <>Contributor <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#ef4444" }}>rejected</strong><By actor={actor} />{reason && reason !== "none" && <><br /><em style={{ color: "var(--text-muted, #888)", fontSize: 12 }}>Reason: {reason}</em></>}</>;
  }

  if (action === "contributor_deleted") {
    const subject = d.replace(/^Deleted contributor:\s*/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    return <>Contributor <strong>{name}</strong>{email && <> ({email})</>} was <strong style={{ color: "#ef4444" }}>deleted</strong><By actor={actor} /></>;
  }

  if (action === "contributor_login_created") {
    const subject = d.replace(/^Created login for contributor:\s*/i, "").trim();
    const { name, email } = parseNameEmail(subject);
    return <>Login credentials created for contributor <strong>{name}</strong>{email && <> ({email})</>}<By actor={actor} /></>;
  }

  if (action === "contributor_access_updated") {
    const active = d.includes("active=1") ? "activated" : "deactivated";
    const permMatch = d.match(/permissions:\s*(.+)$/i);
    const perms = permMatch?.[1] && permMatch[1] !== "none"
      ? permMatch[1].split(",").map(p => p.trim().replace(/^can_/, "").replace(/_/g, " "))
      : null;
    return <>Contributor access <strong>{active}</strong>{perms && <> — Permissions: {perms.map((p, i) => <span key={i} style={{ background: "#3b82f620", color: "#3b82f6", borderRadius: 3, padding: "1px 5px", fontSize: 11, marginLeft: 3 }}>{p}</span>)}</>}<By actor={actor} /></>;
  }

  if (action === "contributor_password_reset") {
    const emailMatch = d.match(/\(([^)]+)\)/);
    return <>Contributor password <strong style={{ color: "#a855f7" }}>reset</strong>{emailMatch && <> for <strong>{emailMatch[1]}</strong></>}<By actor={actor} /></>;
  }

  if (action === "setting_changed") {
    const m = d.match(/Setting "(.+?)" changed to "(.+?)"/i);
    if (m) {
      const label = m[1].replace(/_/g, " ");
      return <>Setting <strong>{label}</strong> changed to <strong style={{ color: "#06b6d4" }}>"{m[2]}"</strong><By actor={actor} /></>;
    }
    return <>{d}<By actor={actor} /></>;
  }

  if (action === "login_success") {
    return <><strong>{actor || "Admin"}</strong> logged in successfully</>;
  }

  if (action === "login_failure") {
    return <>Failed login attempt — username: <strong>{d.replace(/^login_failure.*?for\s*/i, "").replace(/IP:.+$/i, "").trim() || actor || "unknown"}</strong></>;
  }

  return <>{d || "—"}{actor && <By actor={actor} />}</>;
}

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { label: action.replace(/_/g, " "), color: "#6b7280" };
  return (
    <span style={{
      display: "inline-block",
      padding: "3px 9px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      background: meta.color + "18",
      color: meta.color,
      border: `1px solid ${meta.color}40`,
      whiteSpace: "nowrap",
    }}>
      {meta.label}
    </span>
  );
}

function formatDate(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return (
    <>
      <div style={{ fontWeight: 500, fontSize: 12 }}>
        {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
      <div style={{ color: "var(--text-muted, #888)", fontSize: 11 }}>
        {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </>
  );
}

const PAGE_SIZE = 50;

const AdminAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [actorInput, setActorInput] = useState("");
  const { addToast } = useToast();

  const fetchLogs = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page: pg, limit: PAGE_SIZE, action: actionFilter, actor: actorFilter });
      setLogs(res.data?.logs || []);
      setTotal(res.data?.total || 0);
      setPage(pg);
    } catch {
      addToast("Failed to load change logs", "error");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, actorFilter, addToast]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleActorSearch = (e) => {
    e.preventDefault();
    setActorFilter(actorInput.trim());
  };

  return (
    <div className="admin-card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Change Logs</h2>
        <span style={{ fontSize: 13, color: "var(--text-muted, #888)" }}>
          {total} record{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-color, #ddd)", fontSize: 13, background: "var(--input-bg, #fff)", color: "var(--text-color, #222)" }}
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
          ))}
        </select>

        <form onSubmit={handleActorSearch} style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            placeholder="Filter by admin..."
            value={actorInput}
            onChange={(e) => setActorInput(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border-color, #ddd)", fontSize: 13, minWidth: 160, background: "var(--input-bg, #fff)", color: "var(--text-color, #222)" }}
          />
          <button type="submit" className="btn-primary" style={{ padding: "6px 14px", fontSize: 13 }}>Search</button>
          {(actorFilter || actionFilter) && (
            <button type="button" className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}
              onClick={() => { setActorFilter(""); setActorInput(""); setActionFilter(""); }}>
              Clear
            </button>
          )}
        </form>
      </div>

      <TableScrollContainer>
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 110 }}>Date &amp; Time</th>
              <th style={{ width: 160 }}>Action</th>
              <th>What Happened</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: 32, color: "var(--text-muted, #888)" }}>Loading…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={3} style={{ textAlign: "center", padding: 32, color: "var(--text-muted, #888)" }}>No records found.</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td style={{ verticalAlign: "top" }}>{formatDate(log.created_at)}</td>
                <td style={{ verticalAlign: "top", paddingTop: 10 }}><ActionBadge action={log.action} /></td>
                <td style={{ fontSize: 13, lineHeight: 1.6, verticalAlign: "top", paddingTop: 9 }}>
                  {renderDescription(log.action, log.details, log.actor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScrollContainer>

      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", justifyContent: "center" }}>
          <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 13 }}
            disabled={page <= 1} onClick={() => fetchLogs(page - 1)}>Prev</button>
          <span style={{ fontSize: 13 }}>Page {page} of {totalPages}</span>
          <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 13 }}
            disabled={page >= totalPages} onClick={() => fetchLogs(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogs;
