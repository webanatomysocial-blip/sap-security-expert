import React, { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../context/AuthContext";
import { getAdminMembers, manageAdminMember } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import ActionMenu from "./ActionMenu";
import ManageMemberModal from "./ManageMemberModal";
import TableScrollContainer from "./TableScrollContainer";
import useScrollLock from "../../hooks/useScrollLock";
import { downloadCSV } from "../../services/exportUtils";
import "../../css/AdminDashboard.css"; // Ensure standard admin CSS is used

const AdminManageUsers = () => {
  const { role } = useAuth();
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [managingMember, setManagingMember] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  useScrollLock(!!selectedMember || !!managingMember || !!rejectingId);

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getAdminMembers(filterStatus);
      if (res.data?.status === "success") {
        setMembers(res.data.members);
      } else {
        addToast(res.data?.message || "Failed to fetch members", "error");
      }
    } catch (err) {
      console.error(err);
      addToast("Error fetching members", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    if (action === "reject") {
      setRejectingId(id);
      setRejectReason("");
      setRejectError("");
      return;
    }

    const confirmMsg =
      action === "delete"
        ? "Are you sure you want to delete this member? This will deactivate their account and move them to the Deleted section."
        : `Are you sure you want to ${action} this member?`;

    openConfirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Member`,
      message: confirmMsg,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      isDanger: action === "delete" || action === "reject",
      onConfirm: async () => {
        try {
          const res = await manageAdminMember({ id, action });
          if (res.data?.status === "success") {
            addToast(`Member ${action}d successfully.`, "success");
            if (selectedMember && selectedMember.id === id) {
              if (action === "delete") {
                setSelectedMember(null);
              } else {
                setSelectedMember({
                  ...selectedMember,
                  status: action === "approve" ? "approved" : "rejected",
                });
              }
            }
            fetchMembers(); // refresh
          } else {
            addToast(
              res.data?.message || `Failed to ${action} member.`,
              "error",
            );
          }
        } catch (err) {
          console.error(err);
          addToast(`Error trying to ${action} member.`, "error");
        }
      },
    });
  };

  const submitRejection = async () => {
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is mandatory.");
      return;
    }

    try {
      const res = await manageAdminMember({
        id: rejectingId,
        action: "reject",
        rejection_reason: rejectReason,
      });

      if (res.data?.status === "success") {
        addToast("Member rejected successfully.", "success");
        if (selectedMember && selectedMember.id === rejectingId) {
          setSelectedMember({
            ...selectedMember,
            status: "rejected",
            rejection_reason: rejectReason,
          });
        }
        setRejectingId(null);
        setRejectReason("");
        setRejectError("");
        fetchMembers(); // refresh list
      } else {
        addToast(res.data?.message || "Failed to reject member.", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      (filterStatus === "all" || m.status === filterStatus) &&
      ((m.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || "").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleExport = () => {
    const headers = [
      { label: "Name", key: "name" },
      { label: "Email", key: "email" },
      { label: "Phone", key: "phone" },
      { label: "Company", key: "company_name" },
      { label: "Position", key: "job_role" },
      { label: "Location", key: "location" },
      { label: "Status", key: "status" },
      { label: "Reg. Date", key: "created_at" },
    ];
    downloadCSV(filteredMembers, headers, "members_list");
  };

  if (role !== "admin") {
    return (
      <div className="admin-page-wrapper">
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="admin-page-wrapper">
      <Helmet>
        <title>Manage Members - Admin</title>
      </Helmet>

      <div className="page-header">
        <h3>Manage Members</h3>
        <div className="status-filter-tabs" style={{ margin: 0 }}>
          <button
            className={filterStatus === "all" ? "active" : ""}
            onClick={() => setFilterStatus("all")}
          >
            All
          </button>
          <button
            className={filterStatus === "pending" ? "active" : ""}
            onClick={() => setFilterStatus("pending")}
          >
            Pending
          </button>
          <button
            className={filterStatus === "approved" ? "active" : ""}
            onClick={() => setFilterStatus("approved")}
          >
            Approved
          </button>
          <button
            className={filterStatus === "rejected" ? "active" : ""}
            onClick={() => setFilterStatus("rejected")}
          >
            Rejected
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
          <button onClick={fetchMembers} className="btn-primary">
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
                      <th className="col-md text-left">Confirmation</th>
                    </>
                  ) : (
                    <>
                      <th className="col-md text-left">Phone</th>
                      <th className="col-md text-left">Company</th>
                      <th className="col-md text-left">Position</th>
                      <th className="col-md text-left">Location</th>
                    </>
                  )}
                  <th className="col-sm text-center">Status</th>
                  <th className="col-sm text-left">Reg. Date</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr key="empty">
                    <td colSpan="9" className="text-center">
                      No members matching the filter.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td className="col-lg text-left wrap-text">
                        <strong className="truncate-2" style={{ fontSize: "0.85rem" }}>{m.name}</strong>
                      </td>
                      <td className="col-lg text-left no-wrap">
                        <div style={{ fontSize: "0.8rem" }}>{m.email}</div>
                      </td>
                      {filterStatus === "deleted" ? (
                        <>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {m.deleted_at ? new Date(m.deleted_at).toLocaleString() : "—"}
                          </td>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {m.deletion_ip || "—"}
                          </td>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {m.deletion_method || "—"}
                          </td>
                          <td className="col-md text-left no-wrap" style={{ fontSize: "0.8rem" }}>
                            {m.deletion_confirmation_method || "—"}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="col-md text-left no-wrap">
                            {m.phone ? (
                              <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                {m.phone}
                              </div>
                            ) : (
                              <span style={{ color: "#cbd5e1" }}>—</span>
                            )}
                          </td>
                          <td className="col-md text-left wrap-text">
                            <div
                              className="truncate-2"
                              style={{
                                fontWeight: 600,
                                color: "var(--slate-900)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {m.company_name || "—"}
                            </div>
                          </td>
                          <td className="col-md text-left wrap-text">
                            <div
                              className="truncate-2"
                              style={{ fontSize: "0.8rem", color: "#64748b" }}
                            >
                              {m.job_role || "—"}
                            </div>
                          </td>
                          <td className="col-md text-left wrap-text">
                            <div className="truncate-2" style={{ fontSize: "0.80rem" }}>
                              {m.location || "—"}
                            </div>
                          </td>
                        </>
                      )}
                      <td className="col-sm text-center">
                        <span className={`status-badge status-${m.status}`}>
                          {m.status === "approved" ? "Active" : m.status}
                        </span>
                      </td>
                      <td className="col-sm text-left" style={{ fontSize: "0.85rem" }}>
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="col-actions text-center">
                        <ActionMenu>
                          <button
                            className="action-menu-item"
                            onClick={() => setSelectedMember(m)}
                          >
                            <i className="bi bi-eye"></i> View Details
                          </button>

                          {m.status === "pending" && (
                            <button
                              className="action-menu-item"
                              onClick={() => handleAction(m.id, "approve")}
                              style={{ color: "var(--success-green)" }}
                            >
                              <i className="bi bi-check-circle"></i> Approve Now
                            </button>
                          )}

                          {m.status === "rejected" && (
                            <button
                              className="action-menu-item"
                              onClick={() => handleAction(m.id, "approve")}
                              style={{ color: "var(--success-green)" }}
                            >
                              <i className="bi bi-check-circle"></i> Re-Approve
                            </button>
                          )}

                          {m.status === "approved" && (
                            <>
                              <div className="action-menu-separator"></div>
                              <button
                                className="action-menu-item"
                                onClick={() => setManagingMember(m)}
                              >
                                <i className="bi bi-shield-lock"></i> Manage Login
                              </button>
                            </>
                          )}

                          {m.status === "pending" && (
                            <>
                              <div className="action-menu-separator"></div>
                              <button
                                className="action-menu-item"
                                onClick={() => handleAction(m.id, "reject")}
                                style={{ color: "var(--warning-yellow)" }}
                              >
                                <i className="bi bi-x-circle"></i> Reject
                              </button>
                            </>
                          )}

                          <div className="action-menu-separator"></div>
                          {m.status !== "deleted" && (
                            <button
                              className="action-menu-item danger"
                              onClick={() => handleAction(m.id, "delete")}
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

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div
            className="modal-container large"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Member Details</h3>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedMember(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body" data-lenis-prevent>
              <div style={{ textAlign: "center", marginBottom: "32px" }}>
                {selectedMember.profile_image ? (
                  <img
                    src={selectedMember.profile_image}
                    alt={selectedMember.name}
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: "4px solid var(--slate-50)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "50%",
                      background: "var(--slate-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      fontSize: "48px",
                      color: "var(--slate-500)",
                      border: "4px solid var(--slate-50)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    {selectedMember.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <h3
                  style={{
                    marginTop: "20px",
                    marginBottom: "8px",
                    fontSize: "1.75rem",
                    fontWeight: "800",
                    color: "var(--slate-900)",
                  }}
                >
                  {selectedMember.name}
                </h3>
                <span
                  className={`status-badge status-${selectedMember.status}`}
                >
                  {selectedMember.status}
                </span>
              </div>

              {selectedMember.status === "rejected" &&
                selectedMember.rejection_reason && (
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
                      }}
                    >
                      {selectedMember.rejection_reason}
                    </p>
                  </div>
                )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "32px",
                  padding: "24px",
                  background: "var(--slate-50)",
                  borderRadius: "16px",
                  border: "1px solid var(--slate-200)",
                }}
              >
                <div className="detail-item">
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--slate-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Email Address
                  </label>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "var(--slate-900)",
                    }}
                  >
                    {selectedMember.email}
                  </div>
                </div>
                <div className="detail-item">
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--slate-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Phone Number
                  </label>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "var(--slate-900)",
                    }}
                  >
                    {selectedMember.phone || "Not Provided"}
                  </div>
                </div>
                <div className="detail-item">
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--slate-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Location
                  </label>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "var(--slate-900)",
                    }}
                  >
                    {selectedMember.location || "Not Provided"}
                  </div>
                </div>
                <div className="detail-item">
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--slate-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Registration Date
                  </label>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "var(--slate-900)",
                    }}
                  >
                    {new Date(selectedMember.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      },
                    )}
                  </div>
                </div>
                <div className="detail-item">
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--slate-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Company Name
                  </label>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "var(--slate-900)",
                    }}
                  >
                    {selectedMember.company_name || "Not Provided"}
                  </div>
                </div>
                <div className="detail-item">
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "var(--slate-500)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginBottom: "4px",
                    }}
                  >
                    Job Role
                  </label>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "var(--slate-900)",
                    }}
                  >
                    {selectedMember.job_role || "Not Provided"}
                  </div>
                </div>

                {selectedMember.is_deleted == 1 && (
                  <>
                    <div className="detail-item" style={{ gridColumn: 'span 2', padding: '15px 0', borderTop: '1px solid #e2e8f0', marginTop: '10px' }}>
                      <strong style={{ color: '#ee5e42' }}>Account Deletion Metadata</strong>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase", marginBottom: "4px" }}>Deleted At</label>
                      <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--slate-900)" }}>{selectedMember.deleted_at ? new Date(selectedMember.deleted_at).toLocaleString() : "—"}</div>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase", marginBottom: "4px" }}>IP Address</label>
                      <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--slate-900)" }}>{selectedMember.deletion_ip || "—"}</div>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase", marginBottom: "4px" }}>Method</label>
                      <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--slate-900)" }}>{selectedMember.deletion_method || "—"}</div>
                    </div>
                    <div className="detail-item">
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--slate-500)", textTransform: "uppercase", marginBottom: "4px" }}>Confirmation Method</label>
                      <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--slate-900)" }}>{selectedMember.deletion_confirmation_method || "—"}</div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedMember(null)}
              >
                Close
              </button>
              {selectedMember.status === "pending" && (
                <>
                  <button
                    className="btn-reject"
                    onClick={() => handleAction(selectedMember.id, "reject")}
                  >
                    Reject
                  </button>
                  <button
                    className="btn-approve"
                    onClick={() => handleAction(selectedMember.id, "approve")}
                  >
                    Approve
                  </button>
                </>
              )}
              {selectedMember.status === "rejected" && (
                <button
                  className="btn-approve"
                  onClick={() => handleAction(selectedMember.id, "approve")}
                >
                  Re-Approve
                </button>
              )}
              <button
                className="btn-delete"
                onClick={() => handleAction(selectedMember.id, "delete")}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Member Modal */}
      {managingMember && (
        <ManageMemberModal
          member={managingMember}
          onClose={() => setManagingMember(null)}
        />
      )}

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="modal-overlay" onClick={() => setRejectingId(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "#991b1b" }}>Reject Member</h3>
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
                Please provide a reason for rejecting this member. This feedback
                will be stored for audit purposes.
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
                  placeholder="e.g., Incomplete profile or invalid information."
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

export default AdminManageUsers;
