import React, { useState, useEffect } from "react";
import SEO from "../SEO";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import AmbassadorBadge from "../AmbassadorBadge";
import { TableSkeleton } from "./AdminSkeletons.jsx";
import ColumnToggle from "./ColumnToggle.jsx";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";
import ManageAmbassadorModal from "./ManageAmbassadorModal";
import useScrollLock from "../../hooks/useScrollLock";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getAmbassadors, updateAmbassadorStatus, getAmbassadorBadgeHistory } from "../../services/api";
import { downloadCSV } from "../../services/exportUtils";

const AdminAmbassadors = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("approved");
  const [filterCountry, setFilterCountry] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);
  const [badgeHistory, setBadgeHistory] = useState(null);
  const [managingAmbassador, setManagingAmbassador] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const { fetchBadges } = useOutletContext() || {};

  const AMBASSADOR_COLS = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "country", label: "Country" },
    { key: "contribs", label: "Contribs" },
    { key: "status", label: "Status" },
    { key: "role", label: "Current Role", optional: true },
    { key: "badge", label: "Badge", optional: true },
    { key: "date", label: "Date", optional: true },
    { key: "lastlogin", label: "Last Login", optional: true },
    { key: "logins", label: "Total Logins", optional: true },
    { key: "lastcontrib", label: "Last Contribution", optional: true },
    { key: "expertpapers", label: "Expert Papers", optional: true },
    { key: "actions", label: "Actions" },
  ];
  const [visibleCols, setVisibleCols] = useState(() => {
    try { const s = localStorage.getItem("admin_ambassadors_cols"); if (s) return new Set(JSON.parse(s)); } catch {}
    return new Set(AMBASSADOR_COLS.filter(c => !c.optional).map(c => c.key));
  });
  const handleColChange = (cols) => { setVisibleCols(cols); try { localStorage.setItem("admin_ambassadors_cols", JSON.stringify([...cols])); } catch {} };
  const show = (key) => visibleCols.has(key);

  useScrollLock(!!selectedApp || !!rejectingId);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await getAmbassadors();
      if (res.data) setApplications(res.data);
    } catch (error) {
      console.error("Error fetching ambassador applications:", error);
      addToast("Failed to load ambassador applications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedApp?.country) { setBadgeHistory(null); return; }
    setBadgeHistory(null);
    getAmbassadorBadgeHistory(selectedApp.country)
      .then((res) => setBadgeHistory(res.data?.history || []))
      .catch(() => setBadgeHistory([]));
  }, [selectedApp]);

  const performAction = async (id, action, reason = null) => {
    // Captured before the API call — fetchApplications() below refetches
    // asynchronously, so the in-memory row is what we still have handy to
    // pre-fill the "Manage Login" modal opened right after approval.
    const app = applications.find((a) => a.id === id);
    try {
      const res = await updateAmbassadorStatus({ id, action, reason });
      if (res.data?.status === "success") {
        setSelectedApp(null);
        setRejectingId(null);
        setRejectReason("");
        addToast(`Ambassador ${action}d successfully.`, "success");
        fetchBadges?.();
        fetchApplications();

        // Approval creates the member login the same way contributor approval
        // does — open Manage Login immediately so the admin can see/share it.
        if (action === "approve" && app) {
          setManagingAmbassador({ ...app, status: "approved" });
        }
      } else {
        addToast(res.data?.message || `Failed to ${action} ambassador.`, "error");
      }
    } catch (error) {
      addToast(error.response?.data?.message || "Connection error. Please try again.", "error");
    }
  };

  const handleApprove = (id) => {
    openConfirm({
      title: "Approve Ambassador",
      message: "This will grant the Country Ambassador recognition and create their member login, the same way contributor approval does.",
      confirmText: "Approve",
      onConfirm: () => performAction(id, "approve"),
    });
  };

  const handleReject = (id) => {
    setRejectingId(id);
    setRejectReason("");
    setRejectError("");
  };

  const submitRejection = () => {
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is mandatory.");
      return;
    }
    performAction(rejectingId, "reject", rejectReason);
  };

  const handleDeactivate = (id) => {
    openConfirm({
      title: "Deactivate Ambassador?",
      message: "Their public Ambassador recognition will be hidden and login disabled. They can still sign in as a regular member. They'll be notified by email.",
      confirmText: "Deactivate",
      isDanger: true,
      onConfirm: () => performAction(id, "deactivate"),
    });
  };

  const handleReactivate = (id) => {
    openConfirm({
      title: "Reactivate Ambassador?",
      message: "Their public Ambassador recognition and login will be restored.",
      confirmText: "Reactivate",
      onConfirm: () => performAction(id, "reactivate"),
    });
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Ambassador?",
      message: "This will remove the ambassador profile. They'll keep their member account.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: () => performAction(id, "delete"),
    });
  };

  const handleGrantBadge = (app) => {
    openConfirm({
      title: "Grant Country Ambassador Badge?",
      message: `This awards the "SAP Security Expert — Country Ambassador" recognition for ${app.country || "their country"} · ${new Date().getFullYear()}. Only one ambassador per country can hold it — granting this revokes it from anyone else currently holding it there.`,
      confirmText: "Grant Badge",
      onConfirm: () => performAction(app.id, "grant_badge"),
    });
  };

  const handleRevokeBadge = (id) => {
    openConfirm({
      title: "Revoke Badge?",
      message: "This removes the public Country Ambassador recognition from their profile.",
      confirmText: "Revoke",
      isDanger: true,
      onConfirm: () => performAction(id, "revoke_badge"),
    });
  };

  const countries = [...new Set(applications.map((a) => a.country).filter(Boolean))].sort();

  const filteredApps = applications.filter(
    (app) =>
      (filterStatus === "all" ? app.status !== "deleted" : app.status === filterStatus) &&
      (filterCountry === "all" || app.country === filterCountry) &&
      ((app.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.email || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleExport = () => {
    const headers = [
      { label: "Name", key: "name" },
      { label: "Email", key: "email" },
      { label: "Country", key: "country" },
      { label: "Current Role", key: "current_role" },
      { label: "Status", key: "status" },
      { label: "Date", key: "created_at" },
    ];
    downloadCSV(filteredApps, headers, "ambassadors_list");
  };

  return (
    <div className="admin-page-wrapper">
      <SEO title="Country Ambassador Management - Admin" />
      <div className="page-header">
        <div className="status-filter-tabs" style={{ margin: 0 }}>
          {["approved", "pending", "rejected", "deactivated", "all"].map((s) => (
            <button key={s} className={filterStatus === s ? "active" : ""} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="page-header-actions">
          <select
            className="btn-filter btn-sm"
            style={{ maxWidth: "100%", minWidth: 0 }}
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
          >
            <option value="all">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button onClick={handleExport} className="btn-filter btn-sm" title="Export to CSV">
            <i className="bi bi-download"></i> Export
          </button>
          <button onClick={fetchApplications} className="btn-primary btn-sm">
            <i className="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-card"><TableSkeleton cols={6} rows={8} /></div>
      ) : (
        <div className="admin-card">
          <div className="admin-table-controls">
            <ColumnToggle columns={AMBASSADOR_COLS} visible={visibleCols} onChange={handleColChange} />
          </div>
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-lg text-left">Name</th>
                  <th className="col-lg text-left">Email</th>
                  <th className="col-md text-left">Country</th>
                  <th className="col-sm text-center">Contribs</th>
                  <th className="col-sm text-center">Status</th>
                  {show("role") && <th className="col-xl text-left">Current Role</th>}
                  {show("badge") && <th className="col-sm text-center">Badge</th>}
                  {show("date") && <th className="col-md text-left">Date</th>}
                  {show("lastlogin") && <th className="col-md text-left">Last Login</th>}
                  {show("logins") && <th className="col-sm text-center">Total Logins</th>}
                  {show("lastcontrib") && <th className="col-md text-left">Last Contribution</th>}
                  {show("expertpapers") && <th className="col-sm text-center">Expert Papers</th>}
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center">No matching applications found.</td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id}>
                      <td className="col-lg text-left wrap-text">
                        <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{app.name}</strong>
                      </td>
                      <td className="col-lg text-left no-wrap" style={{ fontSize: "0.8rem" }}>{app.email}</td>
                      <td className="col-md text-left" style={{ fontSize: "0.8rem", color: "#64748b" }}>{app.country || "—"}</td>
                      <td className="col-sm text-center" style={{ fontSize: "0.8rem", fontWeight: 600 }}>{app.blog_count ?? 0}</td>
                      <td className="col-sm text-center">
                        <span className={`status-badge status-${app.status}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          {app.status}
                        </span>
                      </td>
                      {show("role") && (
                        <td className="col-xl text-left wrap-text">
                          <div className="truncate-2" style={{ fontSize: "0.8rem", color: "#64748b" }}>{app.current_role || "—"}</div>
                        </td>
                      )}
                      {show("badge") && (
                        <td className="col-sm text-center">
                          {app.has_badge ? (
                            <div style={{ display: "inline-flex", justifyContent: "center" }}>
                              <AmbassadorBadge country={app.country} year={app.badge_year} size={45} />
                            </div>
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>
                          )}
                        </td>
                      )}
                      {show("date") && (
                        <td className="col-md text-left">
                          <div style={{ fontSize: "0.8rem" }}>
                            {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        </td>
                      )}
                      {show("lastlogin") && (
                        <td className="col-md text-left" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {app.last_login ? new Date(app.last_login).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : <span style={{ color: "#cbd5e1" }}>Never</span>}
                        </td>
                      )}
                      {show("logins") && <td className="col-sm text-center" style={{ fontSize: "0.8rem", color: "#64748b" }}>{app.login_count || 0}</td>}
                      {show("lastcontrib") && (
                        <td className="col-md text-left" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {app.last_contribution ? new Date(app.last_contribution).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                      )}
                      {show("expertpapers") && <td className="col-sm text-center" style={{ fontSize: "0.8rem", color: "#64748b" }}>{app.expert_papers_count || 0}</td>}
                      <td className="col-actions text-center">
                        <ActionMenu>
                          <button className="action-menu-item" onClick={() => setSelectedApp(app)}>
                            <i className="bi bi-eye"></i> View Details
                          </button>

                          {app.status === "pending" && (
                            <>
                              <div className="action-menu-separator"></div>
                              <button className="action-menu-item" onClick={() => handleApprove(app.id)} style={{ color: "var(--success-green)" }}>
                                <i className="bi bi-check-circle"></i> Approve Now
                              </button>
                              <button className="action-menu-item" onClick={() => handleReject(app.id)} style={{ color: "var(--warning-yellow)" }}>
                                <i className="bi bi-x-circle"></i> Reject
                              </button>
                            </>
                          )}

                          {app.status === "approved" && (
                            <>
                              <div className="action-menu-separator"></div>
                              <button className="action-menu-item" onClick={() => setManagingAmbassador(app)}>
                                <i className="bi bi-shield-lock"></i> Manage Login
                              </button>
                              {app.has_badge ? (
                                <button className="action-menu-item" onClick={() => handleRevokeBadge(app.id)} style={{ color: "var(--warning-yellow)" }}>
                                  <i className="bi bi-award"></i> Revoke Badge
                                </button>
                              ) : (
                                <button className="action-menu-item" onClick={() => handleGrantBadge(app)} style={{ color: "var(--success-green)" }}>
                                  <i className="bi bi-award-fill"></i> Grant Badge
                                </button>
                              )}
                              <div className="action-menu-separator"></div>
                              <button className="action-menu-item" onClick={() => handleDeactivate(app.id)} style={{ color: "var(--warning-yellow)" }}>
                                <i className="bi bi-pause-circle"></i> Deactivate
                              </button>
                            </>
                          )}

                          {app.status === "deactivated" && (
                            <>
                              <div className="action-menu-separator"></div>
                              <button className="action-menu-item success" onClick={() => handleReactivate(app.id)} style={{ color: "var(--success-green)" }}>
                                <i className="bi bi-arrow-counterclockwise"></i> Reactivate
                              </button>
                            </>
                          )}

                          <div className="action-menu-separator"></div>
                          <button className="action-menu-item danger" onClick={() => handleDelete(app.id)}>
                            <i className="bi bi-trash"></i> Delete
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
      )}

      {selectedApp && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ambassador Application Details</h3>
              <button className="modal-close-btn" onClick={() => setSelectedApp(null)}>×</button>
            </div>
            <div className="modal-body" data-lenis-prevent="true">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", flexWrap: "wrap" }}>
                  <img
                    src={selectedApp.profile_image || "/assets/placeholder.webp"}
                    alt={selectedApp.name}
                    style={{ width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", border: "4px solid #f1f5f9" }}
                  />
                  {selectedApp.has_badge && (
                    <AmbassadorBadge country={selectedApp.country} year={selectedApp.badge_year} size={120} />
                  )}
                </div>
                <h3 style={{ marginTop: "15px", marginBottom: "5px", fontSize: "1.5rem" }}>{selectedApp.name}</h3>
                <span className={`status-badge status-${selectedApp.status}`}>{selectedApp.status}</span>
              </div>

              <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "20px", marginBottom: "20px" }}>
                <div><strong>Email:</strong><div style={{ color: "#475569" }}>{selectedApp.email}</div></div>
                <div><strong>LinkedIn:</strong><div>{selectedApp.linkedin ? <a href={selectedApp.linkedin} target="_blank" rel="noreferrer">View Profile</a> : "N/A"}</div></div>
                <div><strong>Country:</strong><div style={{ color: "#475569" }}>{selectedApp.country || "N/A"}{selectedApp.state ? `, ${selectedApp.state}` : ""}</div></div>
                <div><strong>Organization:</strong><div style={{ color: "#475569" }}>{selectedApp.organization || "N/A"}</div></div>
                <div><strong>Current Role:</strong><div style={{ color: "#475569" }}>{selectedApp.current_role || "N/A"}</div></div>
                <div><strong>Years Experience:</strong><div style={{ color: "#475569" }}>{selectedApp.years_experience || "N/A"}</div></div>
                <div><strong>Nomination Type:</strong><div style={{ color: "#475569" }}>{selectedApp.nomination_type || "self"}</div></div>
                <div>
                  <strong>Joined:</strong>
                  <div style={{ color: "#475569" }}>{new Date(selectedApp.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>

              {selectedApp.country && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Badge History for {selectedApp.country}:</strong>
                  {badgeHistory === null ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "6px 0 0" }}>Loading…</p>
                  ) : badgeHistory.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "6px 0 0" }}>No badge has ever been granted for this country.</p>
                  ) : (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                      {badgeHistory.map((h) => (
                        <div
                          key={h.badge_year}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", borderRadius: 8,
                            background: h.ambassador_id === selectedApp.id ? "#fff7ed" : "#f8fafc",
                            border: `1px solid ${h.ambassador_id === selectedApp.id ? "#fed7aa" : "#e2e8f0"}`,
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{h.badge_year}</span>
                          <span style={{ color: "#475569" }}>{h.full_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedApp.motivation && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Motivation:</strong>
                  <p style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{selectedApp.motivation}</p>
                </div>
              )}
              {selectedApp.contribution_examples && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Community Contribution Examples:</strong>
                  <p style={{ color: "#475569", whiteSpace: "pre-wrap" }}>{selectedApp.contribution_examples}</p>
                </div>
              )}
              {selectedApp.rejection_reason && (
                <div style={{ marginBottom: 16 }}>
                  <strong>Rejection Reason:</strong>
                  <p style={{ color: "#b91c1c" }}>{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedApp(null)}>Close</button>
              {selectedApp.status === "pending" && (
                <>
                  <button className="btn-reject" onClick={() => handleReject(selectedApp.id)}>Reject</button>
                  <button className="btn-approve" onClick={() => handleApprove(selectedApp.id)}>Approve</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {rejectingId && createPortal(
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "#991b1b" }}>Reject Ambassador Application</h3>
              <button className="modal-close-btn" onClick={() => setRejectingId(null)}>×</button>
            </div>
            <div className="modal-body" data-lenis-prevent="true">
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "16px" }}>
                Please provide a reason for rejecting this application. This feedback will be stored for audit purposes.
              </p>
              <div className="form-group">
                <label>Rejection Reason (Mandatory)</label>
                <textarea
                  className="form-control" rows="4" value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); if (e.target.value.trim()) setRejectError(""); }}
                  placeholder="e.g., Does not yet meet the experience/contribution criteria."
                  style={{ borderColor: rejectError ? "#ef4444" : "var(--slate-300)" }}
                />
                {rejectError && <small style={{ color: "#ef4444", fontWeight: 600, marginTop: "4px", display: "block" }}>{rejectError}</small>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setRejectingId(null)}>Cancel</button>
              <button className="btn-danger" onClick={submitRejection}>Confirm Rejection</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {managingAmbassador && (
        <ManageAmbassadorModal
          ambassador={managingAmbassador}
          onClose={() => setManagingAmbassador(null)}
        />
      )}
    </div>
  );
};

export default AdminAmbassadors;
