import { useState, useEffect } from "react";
import {
  LuX,
  LuShieldCheck,
  LuTriangleAlert,
  LuRefreshCcw,
  LuCopy,
  LuCircleCheck,
} from "react-icons/lu";
import { useToast } from "../../context/ToastContext";
import { resetMemberPassword, getMemberCreditBalance, grantAdminCredits } from "../../services/api";
import useScrollLock from "../../hooks/useScrollLock";

const ManageMemberModal = ({ member, onClose }) => {
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [newResetPass, setNewResetPass] = useState("");

  const [creditBalance, setCreditBalance] = useState(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditError, setCreditError] = useState("");
  const [savingCredits, setSavingCredits] = useState(false);

  const { addToast } = useToast();

  useScrollLock(!!member);

  useEffect(() => {
    if (member?.id) {
      getMemberCreditBalance(member.id)
        .then((res) => setCreditBalance(res.data?.balance ?? 0))
        .catch(() => setCreditBalance(0));
    }
  }, [member?.id]);

  const handleGrantCredits = async (e) => {
    e.preventDefault();
    const amount = parseInt(creditAmount);
    if (!amount || isNaN(amount)) {
      setCreditError("Enter a non-zero integer.");
      return;
    }
    setCreditError("");
    setSavingCredits(true);
    try {
      const res = await grantAdminCredits(member.id, amount, creditNote.trim() || undefined);
      if (res.data.status === "success") {
        setCreditBalance(res.data.new_balance);
        setCreditAmount("");
        setCreditNote("");
        addToast(res.data.message, "success");
      } else {
        setCreditError(res.data.message || "Failed to update credits.");
      }
    } catch (err) {
      setCreditError(err.response?.data?.message || "Failed to update credits.");
    } finally {
      setSavingCredits(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    setNewResetPass("");
    setError("");
    try {
      const res = await resetMemberPassword(member.id);
      if (res.data.status === "success") {
        setNewResetPass(res.data.new_password);
        addToast("Password reset successfully", "success");
      } else {
        setError(res.data.message || "Password reset failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed. Please check connection.");
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

  if (!member) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-container">
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                padding: 10,
                background: "var(--slate-100)",
                borderRadius: 10,
                color: "var(--slate-900)",
              }}
            >
              <LuShieldCheck size={20} />
            </div>
            <div>
              <h3>Manage Member Login</h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--slate-500)",
                }}
              >
                {member.name}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX size={20} />
          </button>
        </div>

        <div className="modal-body" data-lenis-prevent="true">
          <div className="form-group" style={{ marginBottom: 24 }}>
            <p style={{ color: "var(--slate-600)", fontSize: "0.9rem", lineHeight: 1.5 }}>
              Resetting the password will generate a new random password for <strong>{member.email}</strong>. 
              Please ensure you copy the new password and share it with the member securely.
            </p>
          </div>

          {error && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              <LuTriangleAlert /> {error}
            </div>
          )}

          <div className="form-group">
            <label
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: 600 }}>Login Credentials</span>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleResetPassword}
                disabled={resetting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  background: "var(--slate-900)",
                  color: "white",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                <LuRefreshCcw className={resetting ? "spin" : ""} style={{ fontSize: 13 }} />
                {resetting ? "Resetting..." : "Generate New Password"}
              </button>
            </label>

            {newResetPass && (
              <div
                style={{
                  background: "#fff7ed",
                  border: "1.5px solid #fdba74",
                  borderRadius: 12,
                  padding: "16px",
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.95rem",
                    color: "#1e293b",
                    marginBottom: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4
                  }}
                >
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#9a3412", fontWeight: 700 }}>New Password</span>
                  <div style={{ wordBreak: "break-all", background: "white", padding: "8px", borderRadius: "6px", border: "1px solid #fed7aa" }}>
                    {newResetPass}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => copyToClipboard(newResetPass)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    border: "1px solid var(--slate-200)",
                    background: "white",
                    cursor: "pointer"
                  }}
                >
                  {copied ? (
                    <LuCircleCheck style={{ color: "#16a34a" }} />
                  ) : (
                    <LuCopy />
                  )}
                  {copied ? "Copied to Clipboard!" : "Copy New Password"}
                </button>
              </div>
            )}
          </div>

          {/* ── Credit Management ─────────────────────────────────────── */}
          <div className="form-group" style={{ marginTop: 28, borderTop: "1px solid var(--slate-100)", paddingTop: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>Credit Balance</span>
              <span style={{
                background: "#fffbeb", border: "1px solid #fcd34d",
                borderRadius: 20, padding: "3px 12px", fontSize: 13, fontWeight: 700, color: "#92400e",
              }}>
                {creditBalance === null ? "…" : `${creditBalance} credits`}
              </span>
            </div>
            <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", marginBottom: 14 }}>
              Add or deduct credits. Use a negative number to deduct (e.g. <code>-5</code>).
            </p>
            {creditError && (
              <div className="form-error" style={{ marginBottom: 12 }}>
                <LuTriangleAlert /> {creditError}
              </div>
            )}
            <form onSubmit={handleGrantCredits} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                type="number"
                placeholder="Amount (e.g. 10 or -5)"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                style={{ flex: "1 1 120px", minWidth: 100, padding: "7px 10px", border: "1.5px solid var(--slate-200)", borderRadius: 6, fontSize: 13 }}
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={creditNote}
                onChange={(e) => setCreditNote(e.target.value)}
                style={{ flex: "2 1 180px", padding: "7px 10px", border: "1.5px solid var(--slate-200)", borderRadius: 6, fontSize: 13 }}
              />
              <button
                type="submit"
                disabled={savingCredits || !creditAmount}
                style={{
                  padding: "7px 16px", background: "#1e293b", color: "#fff",
                  border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: savingCredits || !creditAmount ? "not-allowed" : "pointer",
                  opacity: savingCredits || !creditAmount ? 0.6 : 1,
                }}
              >
                {savingCredits ? "Saving…" : "Apply"}
              </button>
            </form>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: "1px solid var(--slate-100)", padding: "16px 24px" }}>
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--slate-200)",
              background: "white",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageMemberModal;
