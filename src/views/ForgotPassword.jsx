import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import { sendOTP, verifyOTP, resetPasswordOTP } from "../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("email"); // email | otp | reset | success
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await sendOTP(email, "reset");
      if (res.data.status === "success") {
        addToast(res.data.message, "success");
        setStep("otp");
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to send reset code.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await verifyOTP(email, otp, "reset");
      if (res.data.status === "success") {
        addToast("Verification successful!", "success");
        setStep("reset");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Invalid or expired code.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await resetPasswordOTP({ email, password: newPassword });
      if (res.data.status === "success") {
        addToast(res.data.message, "success");
        setStep("success");
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || "Failed to update password.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "100px 20px",
        display: "flex",
        justifyContent: "center",
        background: "#f8fafc",
        minHeight: "80vh",
      }}
    >
      <Helmet>
        <title>Reset Password | SAP Security Expert</title>
      </Helmet>
      <div
        style={{
          maxWidth: "450px",
          width: "100%",
          background: "#fff",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
        {step === "email" && (
          <>
            <h2 style={{ marginBottom: "12px", fontWeight: "700" }}>
              Forgot Password?
            </h2>
            <p style={{ color: "#64748b", marginBottom: "32px", lineHeight: "1.6" }}>
              Enter your registered email address and we'll send you a 6-digit
              verification code to reset your password.
            </p>
            <form onSubmit={handleSendOTP}>
              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="name@example.com"
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", height: "48px" }}
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </button>
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <Link
                  to="/member/login"
                  style={{
                    fontSize: "0.95rem",
                    color: "#64748b",
                    textDecoration: "none",
                    fontWeight: "500",
                  }}
                >
                  Back to Login
                </Link>
              </div>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h2 style={{ marginBottom: "12px", fontWeight: "700" }}>
              Verify Your Email
            </h2>
            <p style={{ color: "#64748b", marginBottom: "32px", lineHeight: "1.6" }}>
              We've sent a 6-digit verification code to <strong>{email}</strong>.
              Enter it below to proceed.
            </p>
            <form onSubmit={handleVerifyOTP}>
              <div className="form-group" style={{ marginBottom: "24px" }}>
                <label className="form-label">6-Digit Code *</label>
                <input
                  type="text"
                  className="form-control"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                  placeholder="000000"
                  style={{ textAlign: "center", letterSpacing: "8px", fontSize: "1.5rem", fontWeight: "700" }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", height: "48px" }}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "0.95rem",
                    color: "#64748b",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Change Email
                </button>
              </div>
            </form>
          </>
        )}

        {step === "reset" && (
          <>
            <h2 style={{ marginBottom: "12px", fontWeight: "700" }}>
              Set New Password
            </h2>
            <p style={{ color: "#64748b", marginBottom: "32px", lineHeight: "1.6" }}>
              Verification successful! Please choose a strong new password for
              your account.
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label className="form-label">New Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="8"
                  placeholder="Min 8 characters"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "32px" }}>
                <label className="form-label">Confirm New Password *</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", height: "48px" }}
                disabled={loading}
              >
                {loading ? "Updating..." : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {step === "success" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: "20px" }}>✅</div>
            <h2 style={{ marginBottom: "12px", fontWeight: "700" }}>
              Password Reset!
            </h2>
            <p style={{ color: "#64748b", marginBottom: "32px", lineHeight: "1.6" }}>
              Your password has been updated securely. You can now log in with
              your new credentials.
            </p>
            <Link
              to="/member/login"
              className="btn-primary"
              style={{
                display: "inline-flex",
                width: "100%",
                height: "48px",
                textDecoration: "none",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Sign In Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
