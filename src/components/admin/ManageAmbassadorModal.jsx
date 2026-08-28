import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  LuX,
  LuUser,
  LuShieldCheck,
  LuTriangleAlert,
  LuRefreshCcw,
  LuCopy,
  LuCircleCheck,
} from "react-icons/lu";
import PermissionCheckboxGroup from "./PermissionCheckboxGroup";
import { useToast } from "../../context/ToastContext";
import { getAmbassadorLogin, createAmbassadorLogin, updateAmbassadorAccess } from "../../services/api";
import api from "../../services/api";
import useScrollLock from "../../hooks/useScrollLock";

const DEFAULT_PERMS = {
  can_manage_blogs: false,
  can_manage_ads: false,
  can_manage_comments: false,
  can_manage_announcements: false,
  can_review_blogs: false,
  can_access_premium_articles: false,
};

/**
 * ManageAmbassadorModal
 * Props:
 *   ambassador: { id, name, email } — the selected ambassador row
 *   onClose: () => void
 */
const ManageAmbassadorModal = ({ ambassador, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [hasLogin, setHasLogin] = useState(false);
  const [copied, setCopied] = useState(false);

  const [generatedUser, setGeneratedUser] = useState("");
  const [generatedPass, setGeneratedPass] = useState("");
  const [newResetPass, setNewResetPass] = useState("");
  const [created, setCreated] = useState(false);

  const [permissions, setPermissions] = useState({ ...DEFAULT_PERMS });
  const [userId, setUserId] = useState(null);
  const [isActive, setIsActive] = useState(true);

  const { addToast } = useToast();

  useScrollLock(!!ambassador);

  const genUsername = () =>
    ambassador.email ||
    ambassador.name?.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getAmbassadorLogin(ambassador.id);
        const data = res.data;
        if (data.has_login) {
          setHasLogin(true);
          setUserId(data.user_id);
          setIsActive(data.is_active);
          setPermissions({ ...DEFAULT_PERMS, ...(data.permissions || {}) });
        } else {
          setHasLogin(false);
          setPermissions({ ...DEFAULT_PERMS });
          setGeneratedUser(genUsername());
          setGeneratedPass("Will be generated on save");
        }
      } catch {
        setError("Failed to load ambassador login data.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambassador.id]);

  const handlePermChange = (key, checked) => {
    setPermissions((prev) => ({ ...prev, [key]: checked }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await createAmbassadorLogin({ ambassador_id: ambassador.id, permissions });
      setGeneratedUser(res.data.username || ambassador.email);
      setGeneratedPass(res.data.password || "");
      setCreated(true);
      setHasLogin(true);
      addToast(`Account created for ${ambassador.name}`, "success");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create login.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateAmbassadorAccess({ user_id: userId, permissions, is_active: isActive });
      addToast("Ambassador access updated", "success");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update access.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    setNewResetPass("");
    setError("");
    try {
      const res = await api.post("/admin/reset-ambassador-password", { user_id: userId });
      setNewResetPass(res.data.new_password);
      addToast("Password reset successfully", "success");
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed.");
    } finally {
      setResetting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!ambassador) return null;

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ padding: 10, background: "var(--slate-100)", borderRadius: 10, color: "var(--slate-900)" }}>
              <LuShieldCheck size={20} />
            </div>
            <div>
              <h3>Manage Access</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--slate-500)" }}>{ambassador.name}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX size={20} />
          </button>
        </div>

        <div className="modal-body" data-lenis-prevent="true">
          {loading ? (
            <div className="modal-loading">Loading...</div>
          ) : (
            <form id="manage-ambassador-access-form" onSubmit={hasLogin && !created ? handleUpdate : handleCreate}>
              {error && (
                <div className="form-error">
                  <LuTriangleAlert /> {error}
                </div>
              )}

              {created && (
                <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 12, padding: "20px 24px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <LuCircleCheck style={{ color: "#16a34a", fontSize: 18 }} />
                    <span style={{ fontWeight: 700, color: "#166534", fontSize: "0.875rem" }}>Login Created Successfully</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: 8 }}>Share these credentials with the ambassador:</div>
                  <div style={{ background: "#fff", border: "1px solid #d1fae5", borderRadius: 8, padding: "10px 12px", fontFamily: "monospace", fontSize: "0.875rem", color: "#1e293b" }}>
                    <div><strong>Username:</strong> {generatedUser}</div>
                    <div><strong>Password:</strong> {generatedPass}</div>
                  </div>
                  <button
                    type="button" className="btn-secondary btn-sm" style={{ marginTop: 10 }}
                    onClick={() => copyToClipboard(`Username: ${generatedUser}\nPassword: ${generatedPass}`)}
                  >
                    {copied ? <LuCircleCheck style={{ color: "#16a34a" }} /> : <LuCopy />}
                    {copied ? "Copied!" : "Copy Credentials"}
                  </button>
                </div>
              )}

              {hasLogin && !created && (
                <>
                  <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                    <LuShieldCheck style={{ color: "#1e293b" }} />
                    <span style={{ fontSize: "0.875rem", color: "#334155", fontWeight: 600 }}>Account exists</span>
                    <span style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: isActive ? "#dcfce7" : "#fee2e2", color: isActive ? "#166534" : "#991b1b" }}>
                      {isActive ? "Active" : "Deactivated"}
                    </span>
                  </div>

                  <div className="form-group">
                    <label><LuUser /> Username</label>
                    <input type="text" className="form-control" value={genUsername()} readOnly style={{ background: "#f8fafc", color: "#64748b" }} />
                  </div>

                  <div className="form-group">
                    <label style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span>Password</span>
                      <button
                        type="button" className="btn-secondary btn-sm" onClick={handleResetPassword} disabled={resetting}
                        style={{ display: "flex", alignItems: "center", gap: 5 }}
                      >
                        <LuRefreshCcw style={{ fontSize: 13 }} />
                        {resetting ? "Resetting..." : "Reset Password"}
                      </button>
                    </label>
                    {newResetPass && (
                      <div style={{ background: "#fff7ed", border: "1.5px solid #fdba74", borderRadius: 8, padding: "10px 12px", marginTop: 6 }}>
                        <div style={{ fontFamily: "monospace", fontSize: "0.875rem", color: "#1e293b", marginBottom: 6 }}>
                          <strong>New password:</strong> {newResetPass}
                        </div>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => copyToClipboard(newResetPass)}>
                          {copied ? <LuCircleCheck style={{ color: "#16a34a" }} /> : <LuCopy />}
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!hasLogin && !created && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8, fontWeight: 600 }}>Auto-generated credentials</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#334155" }}>
                    <div><strong>Username:</strong> {generatedUser}</div>
                    <div><strong>Password:</strong> {generatedPass}</div>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "6px 0 0" }}>Share these with the ambassador after creation.</p>
                </div>
              )}

              {!created && (
                <div className="form-group">
                  <label style={{ marginBottom: 8, display: "block" }}>Permissions</label>
                  <PermissionCheckboxGroup value={permissions} onChange={handlePermChange} />
                </div>
              )}

              {hasLogin && !created && (
                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <div
                      className={`toggle-switch ${isActive ? "on" : ""}`} onClick={() => setIsActive((v) => !v)}
                      role="switch" aria-checked={isActive} tabIndex={0}
                      onKeyDown={(e) => e.key === " " && setIsActive((v) => !v)}
                    />
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155" }}>
                      {isActive ? "Account Active" : "Account Deactivated"}
                    </span>
                  </label>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {created ? "Close" : "Cancel"}
          </button>
          {!created && (
            <button type="submit" form="manage-ambassador-access-form" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : hasLogin ? "Update Access" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManageAmbassadorModal;
