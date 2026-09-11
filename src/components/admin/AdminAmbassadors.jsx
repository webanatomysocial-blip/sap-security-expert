import React, { useState, useEffect } from "react";
import SEO from "../SEO";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import AmbassadorBadge from "../AmbassadorBadge";
import { TableSkeleton } from "./AdminSkeletons.jsx";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";
import useScrollLock from "../../hooks/useScrollLock";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getAmbassadors, updateAmbassadorStatus, getAmbassadorBadgeHistory } from "../../services/api";
import { 
  LuAward, 
  LuCalendar, 
  LuCheck, 
  LuSparkles, 
  LuUserCheck, 
  LuMail, 
  LuLinkedin, 
  LuMapPin, 
  LuBuilding, 
  LuBriefcase, 
  LuClock, 
  LuExternalLink, 
  LuHistory, 
  LuFileText, 
  LuShieldCheck, 
  LuX 
} from "react-icons/lu";
import { downloadCSV } from "../../services/exportUtils";

const EXPERTISE_LABELS = {
  s4hanaSecurity: "S/4HANA Security", sapGrc: "SAP GRC / Access Governance", sapIag: "SAP IAG",
  btpSecurity: "BTP Security", sapCyber: "SAP Cybersecurity", iam: "IAM / Identity",
  sapAudit: "SAP Audit / Risk & Compliance", other: "Other",
};
const COMMUNITY_CONTRIBUTION_LABELS = {
  publishedArticles: "Published technical articles or Expert Papers", presentedConferences: "Presented at conferences or industry events",
  webinars: "Conducted webinars or expert sessions", podcasts: "Participated in podcasts",
  sapCommunity: "Contributed to SAP Community or other professional communities", mentored: "Mentored SAP Security professionals",
  research: "Conducted research or surveys", organizedEvents: "Organized community events or discussions",
  none: "Has not yet made a significant community contribution",
};
const AMBASSADOR_MOTIVATION_LABELS = {
  helpConnect: "Help professionals in their country connect", shareKnowledge: "Share knowledge and experience",
  mentor: "Mentor emerging professionals", representLocal: "Represent local SAP Security perspectives globally",
  contributeResearch: "Contribute to research and industry discussions", expandNetwork: "Expand professional network",
  buildBrand: "Build personal brand", promoteCompany: "Promote company/services", other: "Other",
};

// Renders a JSON-stringified {key:boolean} checkbox-group field (expertise,
// community_contribution, ambassador_motivations) as a tag list.
const TagList = ({ json, labels }) => {
  let obj = json;
  if (typeof obj === "string") {
    try { obj = JSON.parse(obj); } catch { obj = {}; }
  }
  const keys = Object.keys(obj || {}).filter((k) => obj[k]);
  if (keys.length === 0) return <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>None selected</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {keys.map((k) => (
        <span key={k} style={{ background: "#f1f5f9", color: "#334155", borderRadius: 999, padding: "4px 10px", fontSize: "0.78rem", fontWeight: 600 }}>
          {labels[k] || k}
        </span>
      ))}
    </div>
  );
};

const AdminAmbassadors = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("approved");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterBadge, setFilterBadge] = useState("all");
  const [selectedApp, setSelectedApp] = useState(null);
  const [badgeHistory, setBadgeHistory] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [grantingBadgeApp, setGrantingBadgeApp] = useState(null);
  const [revokingBadgeApp, setRevokingBadgeApp] = useState(null);
  const [revokingBadgeYears, setRevokingBadgeYears] = useState([]);
  const currentYear = new Date().getFullYear();
  const [grantYear, setGrantYear] = useState(currentYear);
  const [revokeYear, setRevokeYear] = useState(currentYear);
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();
  const { fetchBadges } = useOutletContext() || {};

  useScrollLock(!!selectedApp || !!rejectingId || !!grantingBadgeApp || !!revokingBadgeApp);

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

  const performAction = async (id, action, reason = null, extra = {}) => {
    try {
      await updateAmbassadorStatus({ id, action, reason, ...extra });
      const actionLabels = {
        approve: "Ambassador application approved",
        reject: "Ambassador application rejected",
        grant_badge: extra.badge_year ? `Badge granted for year ${extra.badge_year}` : "Badge granted",
        revoke_badge: extra.badge_year ? `Badge revoked for year ${extra.badge_year}` : "Badge revoked",
        deactivate: "Ambassador deactivated",
        reactivate: "Ambassador reactivated",
        delete: "Ambassador application deleted",
      };
      addToast(actionLabels[action] || "Action completed", "success");
      fetchApplications();

      if (selectedApp && selectedApp.id === id) {
        if (action === "delete") {
          setSelectedApp(null);
        } else {
          const res = await getAmbassadors();
          if (res.data) {
            const updated = res.data.find((a) => a.id === id);
            if (updated) setSelectedApp(updated);
          }
        }
      }

      if (typeof fetchBadges === "function") fetchBadges();
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      addToast(error.response?.data?.message || `Failed to ${action}`, "error");
    }
  };

  const handleApprove = (id) => {
    openConfirm({
      title: "Approve Ambassador Application?",
      message: "This will grant this user official Country Ambassador status.",
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
      setRejectError("Please provide a reason for rejection.");
      return;
    }
    performAction(rejectingId, "reject", rejectReason.trim());
    setRejectingId(null);
  };

  const handleDeactivate = (id) => {
    openConfirm({
      title: "Deactivate Ambassador?",
      message: "This will pause their active Ambassador status. They can be reactivated anytime.",
      confirmText: "Deactivate",
      isDanger: true,
      onConfirm: () => performAction(id, "deactivate"),
    });
  };

  const handleReactivate = (id) => {
    openConfirm({
      title: "Reactivate Ambassador?",
      message: "This will restore their active Ambassador status.",
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
    setGrantYear(Math.max(2026, currentYear));
    setGrantingBadgeApp(app);
  };

  const confirmGrantBadge = () => {
    performAction(grantingBadgeApp.id, "grant_badge", null, { badge_year: grantYear });
    setGrantingBadgeApp(null);
  };

  const handleRevokeBadge = async (appOrId, year = null) => {
    const targetApp = typeof appOrId === "object" ? appOrId : applications.find((a) => a.id === appOrId);
    if (!targetApp) return;

    if (year) {
      openConfirm({
        title: `Revoke ${year} Badge?`,
        message: `This removes the ${year} Country Ambassador badge recognition for ${targetApp.name || "this profile"}.`,
        confirmText: "Revoke",
        isDanger: true,
        onConfirm: () => performAction(targetApp.id, "revoke_badge", null, { badge_year: year }),
      });
      return;
    }

    let years = [];
    try {
      const res = await getAmbassadorBadgeHistory(targetApp.country);
      const history = res.data?.history || [];
      const userHistory = history.filter((h) => String(h.ambassador_id) === String(targetApp.id) && Number(h.badge_year) >= 2026);
      years = userHistory.map((h) => Number(h.badge_year));
    } catch (e) {
      console.error("Error fetching badge history for revoke modal:", e);
    }

    if (targetApp.badge_year && Number(targetApp.badge_year) >= 2026 && !years.includes(Number(targetApp.badge_year))) {
      years.push(Number(targetApp.badge_year));
    }

    years = [...new Set(years)].sort((a, b) => b - a);

    if (years.length === 0 && targetApp.has_badge) {
      years = [targetApp.badge_year ? Number(targetApp.badge_year) : Math.max(2026, currentYear)];
    }

    setRevokingBadgeYears(years);
    setRevokeYear(years[0] || Math.max(2026, currentYear));
    setRevokingBadgeApp(targetApp);
  };

  const confirmRevokeBadge = () => {
    if (!revokingBadgeApp) return;
    performAction(revokingBadgeApp.id, "revoke_badge", null, { badge_year: revokeYear });
    setRevokingBadgeApp(null);
  };

  const countries = [...new Set(applications.map((a) => a.country).filter(Boolean))].sort();

  const filteredApps = applications.filter(
    (app) =>
      (filterStatus === "all" ? app.status !== "deleted" : app.status === filterStatus) &&
      (filterCountry === "all" || app.country === filterCountry) &&
      (filterBadge === "all" || (filterBadge === "has" ? !!app.has_badge : !app.has_badge)) &&
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
          <select
            className="btn-filter btn-sm"
            style={{ maxWidth: "100%", minWidth: 0 }}
            value={filterBadge}
            onChange={(e) => setFilterBadge(e.target.value)}
          >
            <option value="all">All Badges</option>
            <option value="has">Has Badge</option>
            <option value="none">No Badge</option>
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
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-lg text-left">Name</th>
                  <th className="col-lg text-left">Email</th>
                  <th className="col-md text-left">Country</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-sm text-center">Badge</th>
                  <th className="col-md text-left">Date</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">No matching applications found.</td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id}>
                      <td className="col-lg text-left wrap-text">
                        <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{app.name}</strong>
                      </td>
                      <td className="col-lg text-left no-wrap" style={{ fontSize: "0.8rem" }}>{app.email}</td>
                      <td className="col-md text-left" style={{ fontSize: "0.8rem", color: "#64748b" }}>{app.country || "—"}</td>
                      <td className="col-sm text-center">
                        <span className={`status-badge status-${app.status}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          {app.status}
                        </span>
                      </td>
                      <td className="col-sm text-center">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 48 }}>
                          {app.has_badge ? (
                            <AmbassadorBadge country={app.country} year={app.badge_year} size={52} />
                          ) : (
                            <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td className="col-md text-left">
                        <div style={{ fontSize: "0.8rem" }}>
                          {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>
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
          <div
            className="modal-container large"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "760px",
              borderRadius: "16px",
              boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              className="modal-header"
              style={{
                padding: "16px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #7dd3fc",
                  }}
                >
                  <LuUserCheck size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                    Ambassador Application Details
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.76rem", color: "#64748b" }}>
                    Review candidate qualifications, country representation, and recognition status
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedApp(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f1f5f9",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  lineHeight: 1,
                  transition: "all 0.15s ease",
                }}
              >
                <LuX size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              className="modal-body"
              data-lenis-prevent="true"
              style={{
                padding: "24px",
                background: "#f8fafc",
                maxHeight: "75vh",
                overflowY: "auto",
              }}
            >
              {/* Profile Hero Header Card */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 20,
                  padding: "20px 24px",
                  borderRadius: 14,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  marginBottom: 20,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 240 }}>
                  <img
                    src={selectedApp.profile_image || "/assets/placeholder.webp"}
                    alt={selectedApp.name}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "3px solid #f1f5f9",
                      boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>
                      {selectedApp.name}
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: "0.85rem", marginTop: 4 }}>
                      <LuMapPin size={14} color="#f97316" />
                      <span>{selectedApp.country || "Global"}{selectedApp.state ? `, ${selectedApp.state}` : ""}</span>
                      {selectedApp.organization && (
                        <>
                          <span style={{ opacity: 0.5 }}>•</span>
                          <span>{selectedApp.organization}</span>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`status-badge status-${selectedApp.status}`}>
                        {selectedApp.status}
                      </span>
                      {selectedApp.has_badge && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#fff7ed",
                            color: "#c2410c",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            border: "1px solid #fed7aa",
                          }}
                        >
                          <LuAward size={12} /> Active Ambassador ({selectedApp.badge_year})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick actions for ambassador if approved */}
                {selectedApp.status === "approved" && (
                  <div>
                    {!selectedApp.has_badge ? (
                      <button
                        type="button"
                        onClick={() => handleGrantBadge(selectedApp)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 10,
                          fontSize: "0.82rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                          color: "#ffffff",
                          border: "none",
                          boxShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <LuAward size={14} /> Grant Badge
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRevokeBadge(selectedApp.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 10,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "#fff",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                        }}
                      >
                        Revoke Badge
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Earned & Scheduled Badges Section */}
              {(() => {
                const ambassadorHistoricalBadges = (badgeHistory || []).filter(
                  (h) => h.ambassador_id === selectedApp.id && Number(h.badge_year) >= 2026
                );
                const earnedBadgesList = [];

                if (selectedApp.has_badge && selectedApp.badge_year && Number(selectedApp.badge_year) >= 2026) {
                  earnedBadgesList.push({
                    year: selectedApp.badge_year,
                    country: selectedApp.country,
                    isCurrent: true,
                  });
                }

                ambassadorHistoricalBadges.forEach((h) => {
                  if (!earnedBadgesList.some((b) => String(b.year) === String(h.badge_year))) {
                    earnedBadgesList.push({
                      year: Number(h.badge_year),
                      country: selectedApp.country,
                      isCurrent: String(h.badge_year) === String(selectedApp.badge_year) && Number(h.badge_year) <= currentYear,
                    });
                  }
                });

                earnedBadgesList.sort((a, b) => b.year - a.year);

                if (earnedBadgesList.length === 0) return null;

                return (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: "16px 20px",
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #fffbf0 0%, #fff7ed 100%)",
                      border: "1px solid #fed7aa",
                      boxShadow: "0 2px 8px rgba(249, 115, 22, 0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: "#ffedd5",
                            color: "#c2410c",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <LuAward size={16} />
                        </div>
                        <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#9a3412" }}>
                          Ambassador Badges ({earnedBadgesList.length})
                        </span>
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#c2410c", fontWeight: 600, background: "#ffffff", padding: "3px 10px", borderRadius: 999, border: "1px solid #fed7aa" }}>
                        Official Recognition · {selectedApp.country}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "stretch", gap: 14, flexWrap: "wrap" }}>
                      {earnedBadgesList.map((b) => {
                        const isFuture = b.year > currentYear;
                        return (
                          <div
                            key={b.year}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 14,
                              background: "#ffffff",
                              padding: "12px 16px",
                              borderRadius: 12,
                              border: isFuture ? "1.5px dashed #3b82f6" : "1px solid #fed7aa",
                              boxShadow: "0 2px 6px rgba(249, 115, 22, 0.06)",
                            }}
                          >
                            <AmbassadorBadge country={b.country} year={b.year} size={72} />
                            <div>
                              <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                                {b.year}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {b.country} Ambassador
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                                <span
                                  style={{
                                    display: "inline-block",
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    background: isFuture ? "#eff6ff" : b.isCurrent ? "#ffedd5" : "#f1f5f9",
                                    color: isFuture ? "#1d4ed8" : b.isCurrent ? "#c2410c" : "#64748b",
                                    border: isFuture ? "1px solid #bfdbfe" : "none",
                                  }}
                                >
                                  {isFuture ? `📅 Scheduled (${b.year})` : b.isCurrent ? "● Active" : "Archived"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRevokeBadge(selectedApp.id, b.year)}
                                  style={{
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                    borderRadius: "6px",
                                    padding: "2px 8px",
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                  title={`Revoke ${b.year} Badge`}
                                >
                                  Revoke {b.year}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Detail Info Grid */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  padding: "18px 20px",
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 14 }}>
                  Application Details
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "16px 20px",
                  }}
                >
                  <div style={{ display: "flex", gap: 10 }}>
                    <LuMail size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Email</div>
                      <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600, wordBreak: "break-all" }}>
                        {selectedApp.email}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <LuLinkedin size={16} color="#0a66c2" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>LinkedIn Profile</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600 }}>
                        {selectedApp.linkedin ? (
                          <a
                            href={selectedApp.linkedin}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#0a66c2", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            View Profile <LuExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <LuBriefcase size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Current Role</div>
                      <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>
                        {selectedApp.current_role || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <LuBuilding size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Organization</div>
                      <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>
                        {selectedApp.organization || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <LuClock size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Experience</div>
                      <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>
                        {selectedApp.years_experience || "N/A"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <LuCalendar size={16} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>Application Date</div>
                      <div style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 600 }}>
                        {new Date(selectedApp.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Country Badge History */}
              {selectedApp.country && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    padding: "18px 20px",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      <LuHistory size={14} /> Badge History for {selectedApp.country}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>All-time records</span>
                  </div>

                  {badgeHistory === null ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "6px 0 0" }}>Loading history…</p>
                  ) : badgeHistory.length === 0 ? (
                    <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "6px 0 0" }}>No badge has ever been granted for this country yet.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {badgeHistory.map((h) => {
                        const isThisAmbassador = h.ambassador_id === selectedApp.id;
                        return (
                          <div
                            key={`${h.ambassador_id}-${h.badge_year}`}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "10px 14px",
                              borderRadius: 10,
                              background: isThisAmbassador ? "#fff7ed" : "#f8fafc",
                              border: `1px solid ${isThisAmbassador ? "#fed7aa" : "#e2e8f0"}`,
                              fontSize: "0.85rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color: isThisAmbassador ? "#c2410c" : "#0f172a",
                                  background: isThisAmbassador ? "#ffedd5" : "#e2e8f0",
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  fontSize: "0.8rem",
                                }}
                              >
                                {h.badge_year}
                              </span>
                              <span style={{ color: "#0f172a", fontWeight: isThisAmbassador ? 700 : 500 }}>
                                {h.full_name}
                              </span>
                            </div>
                            {isThisAmbassador && (
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#c2410c", background: "#ffedd5", padding: "2px 8px", borderRadius: 999 }}>
                                Current Candidate
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Questionnaire Cards */}
              {[
                { icon: LuSparkles, label: "Areas of Expertise", content: <TagList json={selectedApp.expertise} labels={EXPERTISE_LABELS} /> },
                selectedApp.other_expertise && { icon: LuSparkles, label: "Other Expertise", content: selectedApp.other_expertise },
                { icon: LuUserCheck, label: "Community Contribution Types", content: <TagList json={selectedApp.community_contribution} labels={COMMUNITY_CONTRIBUTION_LABELS} /> },
                selectedApp.contribution_links && { icon: LuExternalLink, label: "Published Work / Links", content: selectedApp.contribution_links },
                selectedApp.mentorship_experience && { icon: LuUserCheck, label: "Mentorship Experience", content: selectedApp.mentorship_experience },
                selectedApp.community_helping_frequency && { icon: LuUserCheck, label: "Helped Local Community", content: selectedApp.community_helping_frequency },
                selectedApp.motivation && { icon: LuFileText, label: "How They'd Contribute as Ambassador", content: selectedApp.motivation },
                selectedApp.country_challenge && { icon: LuFileText, label: "SAP Security Challenge/Trend in Their Country", content: selectedApp.country_challenge },
                selectedApp.contribution_examples && { icon: LuShieldCheck, label: "Community Initiative Example", content: selectedApp.contribution_examples },
                { icon: LuAward, label: "Motivation to Become Ambassador", content: <TagList json={selectedApp.ambassador_motivations} labels={AMBASSADOR_MOTIVATION_LABELS} /> },
                selectedApp.other_motivation_text && { icon: LuAward, label: "Other Motivation", content: selectedApp.other_motivation_text },
                selectedApp.contribution_willingness && { icon: LuCheck, label: "Willingness to Contribute Regularly", content: selectedApp.contribution_willingness },
                selectedApp.ambassador_definition && { icon: LuAward, label: "Their Definition of a Country Ambassador", content: selectedApp.ambassador_definition },
              ].filter(Boolean).map((item) => {
                const Icon = item.icon;
                const { label, content } = item;
                return (
                <div
                  key={label}
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #e2e8f0",
                    padding: "18px 20px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                    <Icon size={14} /> {label}
                  </div>
                  {typeof content === "string" ? (
                    <p style={{ color: "#334155", fontSize: "0.9rem", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
                      {content}
                    </p>
                  ) : content}
                </div>
                );
              })}

              {selectedApp.rejection_reason && (
                <div
                  style={{
                    background: "#fef2f2",
                    borderRadius: 14,
                    border: "1px solid #fecaca",
                    padding: "16px 20px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                    Rejection Reason
                  </div>
                  <p style={{ color: "#991b1b", fontSize: "0.88rem", margin: 0 }}>
                    {selectedApp.rejection_reason}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="modal-footer"
              style={{
                padding: "16px 24px",
                background: "#ffffff",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                margin: 0,
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSelectedApp(null)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              {selectedApp.status === "pending" && (
                <>
                  <button
                    type="button"
                    className="btn-reject"
                    onClick={() => handleReject(selectedApp.id)}
                    style={{
                      padding: "9px 20px",
                      borderRadius: 10,
                      fontSize: "0.88rem",
                      fontWeight: 600,
                    }}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="btn-approve"
                    onClick={() => handleApprove(selectedApp.id)}
                    style={{
                      padding: "9px 22px",
                      borderRadius: 10,
                      fontSize: "0.88rem",
                      fontWeight: 700,
                    }}
                  >
                    Approve Application
                  </button>
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

      {grantingBadgeApp && createPortal(
        <div className="modal-overlay" onClick={() => setGrantingBadgeApp(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "580px",
              borderRadius: "16px",
              boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #fcd34d",
                    boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)",
                  }}
                >
                  <LuAward size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                    Grant Country Ambassador Badge
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                    Assign official recognition for {grantingBadgeApp.country || "selected region"}
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setGrantingBadgeApp(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f1f5f9",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  lineHeight: 1,
                  transition: "all 0.15s ease",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div
              className="modal-body"
              data-lenis-prevent="true"
              style={{ padding: "20px 24px", background: "#f8fafc", maxHeight: "75vh", overflowY: "auto" }}
            >
              {/* Ambassador Card / Live Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  padding: "16px 20px",
                  borderRadius: "14px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 200 }}>
                  <img
                    src={grantingBadgeApp.profile_image || "/assets/placeholder.webp"}
                    alt={grantingBadgeApp.name}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "2.5px solid #fed7aa",
                      boxShadow: "0 2px 8px rgba(249, 115, 22, 0.12)",
                    }}
                  />
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                      {grantingBadgeApp.name}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 2 }}>
                      {grantingBadgeApp.country || "Unknown Country"}
                      {grantingBadgeApp.state ? ` · ${grantingBadgeApp.state}` : ""}
                    </div>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        color: "#c2410c",
                        background: "#fff7ed",
                        padding: "2px 8px",
                        borderRadius: 999,
                        marginTop: 4,
                        border: "1px solid #ffedd5",
                      }}
                    >
                      <LuSparkles size={11} /> Badge Candidate
                    </div>
                  </div>
                </div>

                {/* Badge Visual Preview */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #fffbf0 0%, #fff7ed 100%)",
                    padding: "8px 14px",
                    borderRadius: "12px",
                    border: "1px solid #fed7aa",
                    marginLeft: "auto",
                  }}
                >
                  <AmbassadorBadge
                    country={grantingBadgeApp.country || "Country"}
                    year={grantYear}
                    size={78}
                  />
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#9a3412", marginTop: 4 }}>
                    Preview · {grantYear}
                  </span>
                </div>
              </div>

              {/* Year Selection Section */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <label
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#334155",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    <LuCalendar size={14} color="#64748b" /> Select Recognition Year
                  </label>
                  <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                    Selected: <strong style={{ color: "#0f172a" }}>{grantYear}</strong>
                  </span>
                </div>

                {/* Year Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "8px",
                  }}
                >
                  {Array.from({ length: 10 }, (_, i) => 2026 + i).map((y) => {
                    const isSelected = y === grantYear;
                    const isCurrent = y === currentYear;
                    const isFuture = y > currentYear;

                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setGrantYear(y)}
                        style={{
                          position: "relative",
                          padding: "10px 4px",
                          borderRadius: "10px",
                          fontWeight: isSelected ? 800 : 600,
                          fontSize: "0.92rem",
                          cursor: "pointer",
                          transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: "54px",
                          background: isSelected
                            ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
                            : isCurrent
                            ? "#fffbeb"
                            : isFuture
                            ? "#f8fafc"
                            : "#ffffff",
                          color: isSelected
                            ? "#ffffff"
                            : isCurrent
                            ? "#92400e"
                            : "#334155",
                          border: isSelected
                            ? "2px solid #0f172a"
                            : isCurrent
                            ? "2px solid #f59e0b"
                            : isFuture
                            ? "1.5px dashed #cbd5e1"
                            : "1px solid #e2e8f0",
                          boxShadow: isSelected
                            ? "0 4px 12px rgba(15, 23, 42, 0.25)"
                            : "0 1px 2px rgba(0, 0, 0, 0.03)",
                          transform: isSelected ? "scale(1.02)" : "none",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {isSelected && <LuCheck size={12} color="#f59e0b" />}
                          {y}
                        </span>
                        {isCurrent ? (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: isSelected ? "#fcd34d" : "#b45309",
                              marginTop: "2px",
                              letterSpacing: "0.02em",
                              textTransform: "uppercase",
                            }}
                          >
                            Current
                          </span>
                        ) : isFuture ? (
                          <span
                            style={{
                              fontSize: "0.6rem",
                              fontWeight: 600,
                              color: isSelected ? "#93c5fd" : "#64748b",
                              marginTop: "2px",
                              letterSpacing: "0.01em",
                            }}
                          >
                            Future
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informational callout banner */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: grantYear > currentYear ? "#fff7ed" : "#eff6ff",
                  border: grantYear > currentYear ? "1px solid #fed7aa" : "1px solid #bfdbfe",
                  fontSize: "0.8rem",
                  color: grantYear > currentYear ? "#9a3412" : "#1e40af",
                  lineHeight: 1.45,
                  display: "flex",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{grantYear > currentYear ? "📅" : "ℹ️"}</span>
                <div>
                  {grantYear > currentYear ? (
                    <>
                      <strong>Future Year Selected ({grantYear}):</strong> This badge will be scheduled and will automatically become active on <strong>{grantingBadgeApp.name}</strong>'s public profile when the calendar enters {grantYear}.
                    </>
                  ) : (
                    <>
                      This badge awards the <strong>{grantYear} Country Ambassador</strong> badge to{" "}
                      <strong>{grantingBadgeApp.name}</strong>. It will be publicly showcased on their member profile and the Ambassador directory immediately.
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                padding: "16px 24px",
                background: "#ffffff",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                margin: 0,
              }}
            >
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setGrantingBadgeApp(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmGrantBadge}
                style={{
                  padding: "9px 22px",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <LuAward size={16} /> Grant Badge for {grantYear}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {revokingBadgeApp && createPortal(
        <div className="modal-overlay" onClick={() => setRevokingBadgeApp(null)}>
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "580px",
              borderRadius: "16px",
              boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #f1f5f9",
                background: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px solid #fca5a5",
                    boxShadow: "0 2px 6px rgba(220, 38, 38, 0.15)",
                  }}
                >
                  <LuAward size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
                    Revoke Country Ambassador Badge
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                    Remove official recognition for {revokingBadgeApp.country || "selected region"}
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setRevokingBadgeApp(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "none",
                  background: "#f1f5f9",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  lineHeight: 1,
                  transition: "all 0.15s ease",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div
              className="modal-body"
              data-lenis-prevent="true"
              style={{ padding: "20px 24px", background: "#f8fafc", maxHeight: "75vh", overflowY: "auto" }}
            >
              {/* Ambassador Card / Live Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "16px",
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "20px",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img
                    src={revokingBadgeApp.profile_image || "/assets/placeholder.webp"}
                    alt={revokingBadgeApp.name}
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "12px",
                      objectFit: "cover",
                      border: "2px solid #e2e8f0",
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                      {revokingBadgeApp.name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                      <LuMapPin size={12} color="#94a3b8" />
                      {revokingBadgeApp.country || "Unknown Country"}
                      {revokingBadgeApp.state ? ` · ${revokingBadgeApp.state}` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <AmbassadorBadge country={revokingBadgeApp.country || "Country"} year={revokeYear} size={56} />
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#dc2626", marginTop: "2px" }}>
                    Target: {revokeYear}
                  </span>
                </div>
              </div>

              {/* Year Selection Section */}
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    color: "#334155",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  Select Badge Year to Revoke
                </label>

                {/* Year Buttons Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                  {(() => {
                    const yearOptions = revokingBadgeYears.length > 0
                      ? revokingBadgeYears
                      : [Number(revokingBadgeApp.badge_year || Math.max(2026, currentYear))];

                    return yearOptions.map((y) => {
                      const isSelected = revokeYear === y;
                      const isCurrent = y === currentYear;
                      const isFuture = y > currentYear;

                      return (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setRevokeYear(y)}
                          style={{
                            padding: "10px 8px",
                            borderRadius: "12px",
                            fontWeight: isSelected ? 800 : 600,
                            fontSize: "0.92rem",
                            cursor: "pointer",
                            transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: "54px",
                            background: isSelected
                              ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
                              : isCurrent
                              ? "#fffbeb"
                              : isFuture
                              ? "#f8fafc"
                              : "#ffffff",
                            color: isSelected
                              ? "#ffffff"
                              : isCurrent
                              ? "#92400e"
                              : "#334155",
                            border: isSelected
                              ? "2px solid #dc2626"
                              : isCurrent
                              ? "2px solid #f59e0b"
                              : isFuture
                              ? "1.5px dashed #cbd5e1"
                              : "1px solid #e2e8f0",
                            boxShadow: isSelected
                              ? "0 4px 12px rgba(220, 38, 38, 0.25)"
                              : "0 1px 2px rgba(0, 0, 0, 0.03)",
                            transform: isSelected ? "scale(1.02)" : "none",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            {isSelected && <LuCheck size={12} color="#ffffff" />}
                            {y}
                          </span>
                          {isCurrent ? (
                            <span
                              style={{
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                color: isSelected ? "#fecaca" : "#b45309",
                                marginTop: "2px",
                                letterSpacing: "0.02em",
                                textTransform: "uppercase",
                              }}
                            >
                              Current
                            </span>
                          ) : isFuture ? (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 600,
                                color: isSelected ? "#fecaca" : "#64748b",
                                marginTop: "2px",
                                letterSpacing: "0.01em",
                              }}
                            >
                              Future
                            </span>
                          ) : null}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Informational callout banner */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  fontSize: "0.8rem",
                  color: "#991b1b",
                  lineHeight: 1.45,
                  display: "flex",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>⚠️</span>
                <div>
                  <strong>Revoking Badge ({revokeYear}):</strong> This will remove the <strong>{revokeYear} Country Ambassador</strong> badge for <strong>{revokingBadgeApp.name}</strong>. Their active badge status will be recalculated based on their remaining active badge history.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="modal-footer"
              style={{
                padding: "16px 24px",
                background: "#ffffff",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                margin: 0,
              }}
            >
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setRevokingBadgeApp(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRevokeBadge}
                style={{
                  padding: "9px 22px",
                  borderRadius: "10px",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  color: "#ffffff",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <LuAward size={16} /> Revoke Badge for {revokeYear}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminAmbassadors;
