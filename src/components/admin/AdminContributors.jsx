import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import "../../css/AdminDashboard.css";
import ActionMenu from "./ActionMenu";
import ManageContributorModal from "./ManageContributorModal";
import TableScrollContainer from "./TableScrollContainer";
import useScrollLock from "../../hooks/useScrollLock";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import {
  getContributors,
  updateContributorStatus,
  deleteContributor,
} from "../../services/api";
import { downloadCSV } from "../../services/exportUtils";

const AdminContributors = () => {
  // Mock Data for Demo
  // No mock data needed, fetching from API
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("approved"); // Default to approved
  const [selectedApp, setSelectedApp] = useState(null);
  const [managingContributor, setManagingContributor] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  useScrollLock(!!selectedApp || !!rejectingId);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await getContributors();
      if (res.data) {
        setApplications(res.data);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      addToast("Failed to fetch applications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedApp) {
      document.body.classList.add("modal-open");
      if (window.lenis) window.lenis.stop();
    } else {
      document.body.classList.remove("modal-open");
      if (window.lenis) window.lenis.start();
    }
    return () => {
      document.body.classList.remove("modal-open");
      if (window.lenis) window.lenis.start();
    };
  }, [selectedApp]);

  const updateStatus = async (id, status, rejection_reason = null) => {
    try {
      const res = await updateContributorStatus({
        id,
        status,
        rejection_reason,
      });
      if (res.data.status === "success") {
        // Optimistic update or refresh
        setApplications((prev) =>
          prev.map((app) =>
            app.id === id ? { ...app, status, rejection_reason } : app,
          ),
        );

        // Find the application AFTER state update logic setup to have the updated object
        const approvedApp = applications.find((app) => app.id === id);

        setSelectedApp(null);
        setRejectingId(null);
        setRejectReason("");
        addToast(`Application ${status} successfully.`, "success");

        // If newly approved, trigger Manage Login modal automatically
        if (status === "approved" && approvedApp) {
          setManagingContributor({ ...approvedApp, status: "approved" });
        }
      } else {
        addToast("Failed to update status: " + res.data.message, "error");
      }
    } catch (error) {
      console.error(`Error updating status to ${status}:`, error);
      addToast("Connection error. Please try again.", "error");
    }
  };

  const handleDelete = (id) => {
    openConfirm({
      title: "Delete Contributor?",
      message: "Are you sure you want to delete this contributor? This will deactivate their account and move them to the Deleted section.",
      confirmText: "Delete",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await deleteContributor(id);
          if (res.data.status === "success") {
            setApplications((prev) => prev.filter((app) => app.id !== id));
            if (selectedApp && selectedApp.id === id) {
              setSelectedApp(null);
            }
            addToast("Contributor deleted successfully.", "success");
          } else {
            addToast("Failed to delete: " + res.data.message, "error");
          }
        } catch (error) {
          console.error("Error deleting contributor:", error);
          addToast("Connection error. Please try again.", "error");
        }
      },
    });
  };

  const handleApprove = (id) => {
    openConfirm({
      title: "Approve Applicant",
      message: "Are you sure you want to approve this applicant?",
      confirmText: "Approve",
      onConfirm: () => updateStatus(id, "approved", null),
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
    updateStatus(rejectingId, "rejected", rejectReason);
  };

  const filteredApps = applications.filter(
    (app) =>
      (filterStatus === "all" ? app.status !== "deleted" : app.status === filterStatus) &&
      ((app.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.email || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleExport = () => {
    const headers = [
      { label: "Name", key: "name" },
      { label: "Email", key: "email" },
      { label: "Role", key: "role" },
      { label: "Phone", key: "phone" },
      { label: "LinkedIn", key: "linkedin_profile" },
      { label: "Status", key: "status" },
      { label: "Date", key: "created_at" },
    ];
    downloadCSV(filteredApps, headers, "contributors_list");
  };

  return (
    <div className="admin-page-wrapper">
      <Helmet>
        <title>Contributor Management - Admin</title>
      </Helmet>
      <div className="page-header">
        <h3>Contributor Management</h3>
        <div className="status-filter-tabs" style={{ margin: 0 }}>
          <button
            className={filterStatus === "approved" ? "active" : ""}
            onClick={() => setFilterStatus("approved")}
          >
            Approved
          </button>
          <button
            className={filterStatus === "pending" ? "active" : ""}
            onClick={() => setFilterStatus("pending")}
          >
            Pending
          </button>
          <button
            className={filterStatus === "rejected" ? "active" : ""}
            onClick={() => setFilterStatus("rejected")}
          >
            Rejected
          </button>
          <button
            className={filterStatus === "all" ? "active" : ""}
            onClick={() => setFilterStatus("all")}
          >
            All
          </button>
          <button
            className={filterStatus === "deleted" ? "active" : ""}
            onClick={() => setFilterStatus("deleted")}
          >
            Deleted
          </button>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="search-box">
            <i className="bi bi-search"></i>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={handleExport}
            className="btn-filter"
            title="Export to CSV"
          >
            <i className="bi bi-download"></i> Export
          </button>
          <button onClick={fetchApplications} className="btn-primary">
            <i className="bi bi-arrow-clockwise"></i> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-card">
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-lg text-left">Name</th>
                  <th className="col-lg text-left">Email</th>
                  {filterStatus === "deleted" ? (
                    <>
                      <th className="col-md text-left">Deleted At</th>
                      <th className="col-md text-left">IP Address</th>
                      <th className="col-md text-left">Method</th>
                    </>
                  ) : (
                    <th className="col-xl text-left">Role</th>
                  )}
                  <th className="col-sm text-center">Status</th>
                  <th className="col-md text-left">Date</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No matching applications found.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                     <tr key={app.id}>
                      <td className="col-lg text-left wrap-text">
                        <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{app.name}</strong>
                      </td>
                      <td className="col-lg text-left no-wrap" style={{ fontSize: "0.8rem" }}>{app.email}</td>
                      {filterStatus === "deleted" ? (
                        <>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {app.deleted_at ? new Date(app.deleted_at).toLocaleString() : "—"}
                          </td>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {app.deletion_ip || "—"}
                          </td>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {app.deletion_method || "—"}
                          </td>
                        </>
                      ) : (
                        <td className="col-xl text-left wrap-text">
                          <div className="truncate-2" style={{ fontSize: "0.8rem", color: "#64748b" }}>
                            {app.role}
                          </div>
                        </td>
                      )}
                      <td className="col-sm text-center">
                        <span
                          className={`status-badge status-${app.status}`}
                          style={{ fontSize: "0.7rem", padding: "2px 6px" }}
                        >
                          {app.status === "approved"
                            ? "Live"
                            : app.status === "pending"
                              ? "Pend"
                              : app.status === "rejected"
                                ? "Rej"
                              : app.status === "deleted"
                                ? "Del"
                                : app.status}
                        </span>
                      </td>
                      <td className="col-md text-left">
                        <div style={{ fontSize: "0.8rem" }}>
                          {new Date(app.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </div>
                      </td>
                        <td className="col-actions text-center">
                          <ActionMenu>
                            <button
                              className="action-menu-item"
                              onClick={() => setSelectedApp(app)}
                            >
                              <i className="bi bi-eye"></i> View Details
                            </button>

                            {app.status === "pending" && (
                              <button
                                className="action-menu-item"
                                onClick={() => handleApprove(app.id)}
                                style={{ color: "var(--success-green)" }}
                              >
                                <i className="bi bi-check-circle"></i> Approve
                                Now
                              </button>
                            )}

                            {app.status === "approved" && (
                              <>
                                <div className="action-menu-separator"></div>
                                <button
                                  className="action-menu-item"
                                  onClick={() => setManagingContributor(app)}
                                >
                                  <i className="bi bi-shield-lock"></i> Manage
                                  Login
                                </button>
                              </>
                            )}

                            {app.status === "pending" && (
                              <>
                                <div className="action-menu-separator"></div>
                                <button
                                  className="action-menu-item"
                                  onClick={() => handleReject(app.id)}
                                  style={{ color: "var(--warning-yellow)" }}
                                >
                                  <i className="bi bi-x-circle"></i> Reject
                                </button>
                              </>
                            )}

                            <div className="action-menu-separator"></div>
                            {app.status !== "deleted" && (
                              <button
                                className="action-menu-item danger"
                                onClick={() => handleDelete(app.id)}
                              >
                                <i className="bi bi-trash"></i> Delete
                              </button>
                            )}
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

      {selectedApp && (
        <div className="modal-overlay" onClick={() => setSelectedApp(null)}>
          <div
            className="modal-container large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Contributor Details</h3>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedApp(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body" data-lenis-prevent="true">
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                {selectedApp.profile_image ? (
                  <img
                    src={selectedApp.profile_image}
                    alt={selectedApp.name}
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid #f1f5f9",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      background: "#e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontSize: "40px",
                      color: "#64748b",
                      border: "4px solid #f1f5f9",
                    }}
                  >
                    {selectedApp.name.charAt(0)}
                  </div>
                )}
                <h3
                  style={{
                    marginTop: "15px",
                    marginBottom: "5px",
                    fontSize: "1.5rem",
                  }}
                >
                  {selectedApp.name}
                </h3>
                <span className={`status-badge status-${selectedApp.status}`}>
                  {selectedApp.status}
                </span>
              </div>

              <div
                className="detail-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <strong>Email:</strong>
                  <div style={{ color: "#475569" }}>{selectedApp.email}</div>
                </div>
                <div>
                  <strong>Role:</strong>
                  <div style={{ color: "#475569" }}>{selectedApp.role}</div>
                </div>
                <div>
                  <strong>Joined:</strong>
                  <div style={{ color: "#475569" }}>
                    {new Date(selectedApp.created_at).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    )}
                  </div>
                </div>
                <div>
                  <strong>Organization:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.organization || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Designation:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.designation || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Country:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.country || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>LinkedIn:</strong>
                  <div>
                    {selectedApp.linkedin ? (
                      <a
                        href={selectedApp.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#1e293b",
                          textDecoration: "underline",
                        }}
                      >
                        View Profile
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </div>
                </div>
                <div>
                  <strong>Experience:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.years_experience || "N/A"} years
                  </div>
                </div>
                <div>
                  <strong>Weekly Availability:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.weekly_time || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Preferred Frequency:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.preferred_frequency || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Volunteer for Events:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.volunteer_events || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Product Evaluation:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.product_evaluation || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Personal Website:</strong>
                  <div>
                    {selectedApp.personal_website ? (
                      <a
                        href={selectedApp.personal_website}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#1e293b" }}
                      >
                        Visit Data
                      </a>
                    ) : (
                      "N/A"
                    )}
                  </div>
                </div>
                <div>
                  <strong>Twitter / X:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.twitter_handle || "N/A"}
                  </div>
                </div>
                <div>
                  <strong>Contributed Elsewhere:</strong>
                  <div style={{ color: "#475569" }}>
                    {selectedApp.contributed_elsewhere || "N/A"}
                  </div>
                </div>
                {selectedApp.contributed_elsewhere === "Yes" && (
                  <div style={{ gridColumn: "span 2" }}>
                    <strong>Previous Work Links:</strong>
                    <div
                      style={{
                        color: "#475569",
                        background: "#f8f9fa",
                        padding: "8px",
                        borderRadius: "4px",
                        marginTop: "4px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {selectedApp.previous_work_links || "N/A"}
                    </div>
                  </div>
                )}
                {selectedApp.is_deleted == 1 && (
                  <>
                    <div style={{ gridColumn: "span 2", padding: '15px 0', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
                      <strong style={{ color: '#ee5e42' }}>Account Deletion Metadata</strong>
                    </div>
                    <div>
                      <strong>Deleted At:</strong>
                      <div style={{ color: "#475569" }}>{selectedApp.deleted_at ? new Date(selectedApp.deleted_at).toLocaleString() : "—"}</div>
                    </div>
                    <div>
                      <strong>IP Address:</strong>
                      <div style={{ color: "#475569" }}>{selectedApp.deletion_ip || "—"}</div>
                    </div>
                    <div>
                      <strong>Method:</strong>
                      <div style={{ color: "#475569" }}>{selectedApp.deletion_method || "—"}</div>
                    </div>
                    <div>
                      <strong>Confirmation Method:</strong>
                      <div style={{ color: "#475569" }}>{selectedApp.deletion_confirmation_method || "—"}</div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Primary Motivation:</strong>
                <p
                  style={{
                    background: "#f8f9fa",
                    padding: "12px",
                    borderRadius: "6px",
                    marginTop: "5px",
                    color: "#334155",
                  }}
                >
                  {selectedApp.primary_motivation || "N/A"}
                </p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Short Bio:</strong>
                <p
                  style={{
                    background: "#f8f9fa",
                    padding: "12px",
                    borderRadius: "6px",
                    marginTop: "5px",
                    lineHeight: "1.5",
                    color: "#334155",
                  }}
                >
                  {selectedApp.short_bio || "No bio provided."}
                </p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Contribution Types:</strong>
                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "12px",
                    borderRadius: "6px",
                    marginTop: "5px",
                    color: "#334155",
                  }}
                >
                  {(() => {
                    const typeLabels = {
                      technicalArticle: "Technical Article / Tutorial",
                      opinionPiece: "Opinion Piece / Thought Leadership",
                      news: "News / Industry Updates",
                      tools: "Tools, Scripts, or Resources",
                    };
                    if (!selectedApp.contribution_types) return "None";
                    try {
                      const types =
                        typeof selectedApp.contribution_types === "string"
                          ? JSON.parse(selectedApp.contribution_types)
                          : selectedApp.contribution_types;
                      if (typeof types === "object" && !Array.isArray(types)) {
                        const active = Object.keys(types)
                          .filter((k) => types[k] === true)
                          .map((k) => typeLabels[k] || k);
                        return active.length > 0 ? active.join(", ") : "None";
                      }
                      return JSON.stringify(types);
                    } catch {
                      return selectedApp.contribution_types;
                    }
                  })()}
                </div>
              </div>

              {selectedApp.status === "rejected" &&
                selectedApp.rejection_reason && (
                  <div
                    style={{
                      marginBottom: "24px",
                      background: "#fff1f2",
                      padding: "20px",
                      borderRadius: "12px",
                      border: "1px solid #fecaca",
                    }}
                  >
                    <strong
                      style={{
                        color: "#991b1b",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Rejection Reason:
                    </strong>
                    <p
                      style={{
                        margin: 0,
                        color: "#b91c1c",
                        fontSize: "0.95rem",
                        lineHeight: "1.6",
                        fontWeight: 500,
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedApp.rejection_reason}
                    </p>
                  </div>
                )}

              <div style={{ marginBottom: "15px" }}>
                <strong>Proposed Topics:</strong>
                <p
                  style={{
                    background: "#f8f9fa",
                    padding: "12px",
                    borderRadius: "6px",
                    marginTop: "5px",
                    color: "#334155",
                    wordBreak: "break-word",
                  }}
                >
                  {selectedApp.proposed_topics || "N/A"}
                </p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <strong>Expertise:</strong>
                <div
                  style={{
                    background: "#f8f9fa",
                    padding: "12px",
                    borderRadius: "6px",
                    marginTop: "5px",
                    color: "#334155",
                    wordBreak: "break-word",
                  }}
                >
                  {(() => {
                    const expertiseLabels = {
                      sapSecurity: "SAP Security (ABAP/Java)",
                      sapGrc: "SAP GRC (Access Control, Process Control, RM)",
                      sapIag: "Audit & Compliance",
                      sapBtp: "Cybersecurity",
                      sapCyber: "IAM / Cloud Security",
                      sapLicensing: "Data Security & Privacy",
                    };
                    if (!selectedApp.expertise) return "None listed";
                    try {
                      const exp =
                        typeof selectedApp.expertise === "string"
                          ? JSON.parse(selectedApp.expertise)
                          : selectedApp.expertise;

                      if (!Array.isArray(exp) && typeof exp === "object") {
                        const active = Object.keys(exp)
                          .filter((k) => exp[k] === true)
                          .map((k) => expertiseLabels[k] || k);
                        return active.length > 0
                          ? active.join(", ")
                          : "None listed";
                      }

                      return Array.isArray(exp)
                        ? exp.join(", ")
                        : JSON.stringify(exp);
                    } catch {
                      return selectedApp.expertise;
                    }
                  })()}
                </div>
                {selectedApp.other_expertise && (
                  <div style={{ marginTop: "10px" }}>
                    <strong>Other Expertise:</strong>
                    <p
                      style={{
                        background: "#f8f9fa",
                        padding: "12px",
                        borderRadius: "6px",
                        marginTop: "5px",
                        color: "#334155",
                      }}
                    >
                      {selectedApp.other_expertise}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {selectedApp.status !== "approved" && (
                <>
                  <button
                    className="btn-approve"
                    onClick={() => {
                      handleApprove(selectedApp.id);
                      setSelectedApp({ ...selectedApp, status: "approved" });
                    }}
                  >
                    Approve
                  </button>
                  {selectedApp.status !== "rejected" && (
                    <button
                      className="btn-reject"
                      onClick={() => {
                        handleReject(selectedApp.id);
                        setSelectedApp({ ...selectedApp, status: "rejected" });
                      }}
                    >
                      Reject
                    </button>
                  )}
                </>
              )}
              <button
                className="btn-delete"
                onClick={() => {
                  handleDelete(selectedApp.id);
                  setSelectedApp(null);
                }}
              >
                Delete
              </button>
              <button
                className="btn-cancel"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Login Modal */}
      {managingContributor && (
        <ManageContributorModal
          contributor={managingContributor}
          onClose={() => setManagingContributor(null)}
        />
      )}
      {/* Rejection Modal */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "#991b1b" }}>Reject Application</h3>
              <button
                className="modal-close-btn"
                onClick={() => setRejectingId(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body" data-lenis-prevent="true">
              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.9rem",
                  marginBottom: "16px",
                }}
              >
                Please provide a reason for rejecting this applicant. This
                feedback will be stored for audit purposes.
              </p>
              <div className="form-group">
                <label>Rejection Reason (Mandatory)</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (e.target.value.trim()) setRejectError("");
                  }}
                  placeholder="e.g., Application lacks required experience or incomplete profile."
                  style={{
                    borderColor: rejectError ? "#ef4444" : "var(--slate-300)",
                  }}
                />
                {rejectError && (
                  <small
                    style={{
                      color: "#ef4444",
                      fontWeight: 600,
                      marginTop: "4px",
                      display: "block",
                    }}
                  >
                    {rejectError}
                  </small>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setRejectingId(null)}
              >
                Cancel
              </button>
              <button className="btn-danger" onClick={submitRejection}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContributors;
