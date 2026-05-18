import React, { useState } from "react";
import { LuTriangleAlert, LuX, LuCircleCheck, LuKey } from "react-icons/lu";
import { sendOTP, api } from "../services/api";
import { useMemberAuth } from "../context/MemberAuthContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

const DeleteAccountModal = ({ isOpen, onClose }) => {
  const memberAuth = useMemberAuth();
  const adminAuth = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // Consolidate user data
  const currentUser = memberAuth.member || adminAuth.user;
  const userEmail = currentUser?.email || currentUser?.username; // Fallback for old accounts
  const handleLogout = () => {
    if (memberAuth.logout) memberAuth.logout();
    if (adminAuth.clearAuth) adminAuth.clearAuth();
  };

  const [step, setStep] = useState(1); // 1: Confirmation, 2: OTP, 3: Success
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSendOTP = async () => {
    if (!userEmail) {
      setError("User email not found. Please log in again.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await sendOTP(userEmail, "delete_account");
      if (res.data.status === "success") {
        setStep(2);
        addToast("Verification code sent to your email", "success");
      } else {
        setError(res.data.message || "Failed to send verification code.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/delete_account.php", { otp });
      if (res.data.status === "success") {
        setStep(3);
        addToast("Your account has been deleted.", "success");
        setTimeout(() => {
          handleLogout();
          onClose();
          navigate("/");
        }, 3000);
      } else {
        setError(res.data.message || "Failed to delete account.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "450px" }}>
        <div className="modal-header">
          <h3>Delete Account</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <LuX />
          </button>
        </div>

        <div className="modal-body" style={{ textAlign: "center", padding: "30px 20px" }}>
          {step === 1 && (
            <>
              <div style={{ color: "#ee5e42", fontSize: "48px", marginBottom: "20px" }}>
                <LuTriangleAlert style={{ margin: "0 auto" }} />
              </div>
              <h4 style={{ marginBottom: "15px", color: "#1e293b" }}>Are you sure?</h4>
              <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Permanently delete your account and associated data. This action cannot be undone.
              </p>
              <div style={{ marginTop: "30px", display: "flex", gap: "12px" }}>
                <button className="btn-cancel" onClick={onClose} style={{ flex: 1 }}>No, Keep Account</button>
                <button 
                  className="btn-primary" 
                  onClick={handleSendOTP} 
                  disabled={loading}
                  style={{ flex: 1, backgroundColor: "#ee5e42", color: "white" }}
                >
                  {loading ? "Sending..." : "Yes, Delete"}
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h4 style={{ marginBottom: "15px", color: "#1e293b" }}>Verify Deletion</h4>
              <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "20px" }}>
                Enter the 6-digit code sent to <strong>{userEmail}</strong>
              </p>
              
              {error && (
                <div style={{ color: "#ee5e42", fontSize: "0.85rem", marginBottom: "15px", background: "#fff5f2", padding: "10px", borderRadius: "6px" }}>
                  {error}
                </div>
              )}

              <input 
                type="text" 
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "24px",
                  textAlign: "center",
                  letterSpacing: "8px",
                  borderRadius: "8px",
                  border: "2px solid #e2e8f0",
                  marginBottom: "20px",
                  outline: "none"
                }}
              />

              <button 
                className="btn-primary" 
                onClick={handleDeleteConfirm} 
                disabled={loading || otp.length !== 6}
                style={{ width: "100%", backgroundColor: "#ee5e42", color: "white", padding: "12px" }}
              >
                {loading ? "Verifying..." : "Confirm Deletion"}
              </button>
              
              <button 
                onClick={handleSendOTP}
                disabled={loading}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.85rem", marginTop: "15px", cursor: "pointer", textDecoration: "underline" }}
              >
                Resend Code
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ color: "#10b981", fontSize: "48px", marginBottom: "20px" }}>
                <LuCircleCheck style={{ margin: "0 auto" }} />
              </div>
              <h4 style={{ marginBottom: "15px", color: "#1e293b" }}>Account Deleted</h4>
              <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: "1.6" }}>
                Your account has been successfully deleted. You will be redirected shortly.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
