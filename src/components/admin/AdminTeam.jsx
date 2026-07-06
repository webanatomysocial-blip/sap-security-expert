import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import ActionMenu from "./ActionMenu";
import TableScrollContainer from "./TableScrollContainer";
import { TableSkeleton } from "./AdminSkeletons.jsx";
import useScrollLock from "../../hooks/useScrollLock";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmationContext";
import { getAdminTeam, createAdminAccount, toggleAdminActive, resetAdminTeamMemberPassword } from "../../services/api";

function CreateAdminModal({ onClose, onCreated }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setSaving(true);
    try {
      const res = await createAdminAccount({ full_name: fullName.trim(), email: email.trim() });
      if (res.data?.status === "success") {
        setResult({ username: res.data.username, password: res.data.password });
        onCreated();
        addToast("Admin account created.", "success");
      } else {
        setError(res.data?.message || "Failed to create admin.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Connection error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Admin Account</h3>
          <button className="modal-close-btn" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        {result ? (
          <div style={{ padding: 24 }}>
            <p style={{ color: "#16a34a", fontWeight: 600, marginBottom: 16 }}>
              <i className="bi bi-check-circle-fill" /> Admin account created and credentials emailed.
            </p>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
              <p style={{ margin: "0 0 6px" }}><strong>Username:</strong> {result.username}</p>
              <p style={{ margin: 0 }}><strong>Password:</strong> {result.password}</p>
            </div>
            <button type="button" className="btn-primary" style={{ marginTop: 20, width: "100%" }} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 24 }}>
            {error && <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 14 }}>{error}</p>}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: -8, marginBottom: 16 }}>
              A secure password will be generated automatically and emailed to this address.
            </p>
            <div className="modal-footer" style={{ padding: 0, border: "none" }}>
              <button type="button" className="btn-cancel" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
                {saving ? "Creating…" : "Create Admin"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminTeam() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { addToast } = useToast();
  const { openConfirm } = useConfirm();

  useScrollLock(showCreate);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await getAdminTeam();
      setAdmins(res.data?.admins || []);
    } catch {
      addToast("Failed to fetch admin accounts", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = (admin) => {
    openConfirm({
      title: admin.is_active ? "Deactivate Admin?" : "Reactivate Admin?",
      message: admin.is_active
        ? `${admin.full_name} will no longer be able to log in.`
        : `${admin.full_name} will be able to log in again.`,
      confirmText: admin.is_active ? "Deactivate" : "Reactivate",
      isDanger: !!admin.is_active,
      onConfirm: async () => {
        try {
          const res = await toggleAdminActive(admin.id);
          if (res.data?.status === "success") {
            addToast(res.data.message, "success");
            fetchAdmins();
          } else {
            addToast(res.data?.message || "Action failed.", "error");
          }
        } catch (err) {
          addToast(err.response?.data?.message || "Connection error. Please try again.", "error");
        }
      },
    });
  };

  const handleResetPassword = (admin) => {
    openConfirm({
      title: "Reset Password?",
      message: `A new password will be generated for ${admin.full_name}.`,
      confirmText: "Reset Password",
      onConfirm: async () => {
        try {
          const res = await resetAdminTeamMemberPassword(admin.id);
          if (res.data?.status === "success") {
            addToast(`New password: ${res.data.new_password}`, "success");
          } else {
            addToast(res.data?.message || "Action failed.", "error");
          }
        } catch (err) {
          addToast(err.response?.data?.message || "Connection error. Please try again.", "error");
        }
      },
    });
  };

  return (
    <div className="admin-page-wrapper">
      <Helmet><title>Manage Admins - Admin</title></Helmet>
      <div className="page-header">
        <div className="page-header-actions">
          <button onClick={() => setShowCreate(true)} className="btn-primary btn-sm">
            <i className="bi bi-person-plus-fill" /> Create Admin
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-card"><TableSkeleton cols={5} rows={5} /></div>
      ) : (
        <div className="admin-card">
          <TableScrollContainer>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="col-lg text-left">Name</th>
                  <th className="col-lg text-left">Email</th>
                  <th className="col-sm text-center">Status</th>
                  <th className="col-md text-left">Created</th>
                  <th className="col-actions text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr><td colSpan="5" className="text-center">No admin accounts found.</td></tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="col-lg text-left wrap-text">
                        <strong style={{ fontSize: "0.85rem" }}>{admin.full_name}</strong>
                      </td>
                      <td className="col-lg text-left no-wrap" style={{ fontSize: "0.8rem" }}>{admin.email}</td>
                      <td className="col-sm text-center">
                        <span className={`status-badge status-${admin.is_active ? "approved" : "rejected"}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="col-md text-left">
                        <div style={{ fontSize: "0.8rem" }}>
                          {new Date(admin.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </td>
                      <td className="col-actions text-center">
                        <ActionMenu>
                          <button className="action-menu-item" onClick={() => handleResetPassword(admin)}>
                            <i className="bi bi-key" /> Reset Password
                          </button>
                          <div className="action-menu-separator" />
                          <button
                            className={`action-menu-item${admin.is_active ? " danger" : ""}`}
                            onClick={() => handleToggleActive(admin)}
                          >
                            <i className={`bi ${admin.is_active ? "bi-slash-circle" : "bi-check-circle"}`} />
                            {admin.is_active ? " Deactivate" : " Reactivate"}
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

      {showCreate && (
        <CreateAdminModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchAdmins}
        />
      )}
    </div>
  );
}
