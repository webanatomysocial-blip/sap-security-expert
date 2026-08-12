import React, { useState } from "react";
import SEO from "../components/SEO";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { sendOTP, verifyOTP, resetPasswordOTP } from "../services/api";
import "../css/MemberLogin.css";

const STEPS = ["email", "otp", "reset", "success"];

const StepDot = ({ label, index, current }) => {
  const idx = STEPS.indexOf(current);
  const done = index < idx;
  const active = index === idx;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        background: done ? "#ee5e42" : active ? "#1e293b" : "#e2e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.2s",
      }}>
        {done
          ? <i className="bi bi-check" style={{ color: "#fff", fontSize: 14, fontWeight: 700 }} />
          : <span style={{ fontSize: "0.75rem", fontWeight: 700, color: active ? "#fff" : "#94a3b8" }}>{index + 1}</span>
        }
      </div>
      <span style={{ fontSize: "0.7rem", fontWeight: 600, color: active ? "#0f172a" : "#94a3b8", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
};

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

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
      addToast(err.response?.data?.message || "Failed to send reset code.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOTP(email, otp, "reset");
      setStep("reset");
    } catch (err) {
      addToast(err.response?.data?.message || "Invalid or expired code.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { addToast("Passwords do not match.", "error"); return; }
    setLoading(true);
    try {
      const res = await resetPasswordOTP({ email, password: newPassword });
      if (res.data.status === "success") {
        addToast(res.data.message, "success");
        setStep("success");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to update password.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <SEO title="Reset Password | SAP Security Expert" />

      <div className="login-page-container">
        <div className="login-split-grid">

          {/* ── LEFT INFO PANEL ── */}
          <div className="login-info-side">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff0ec", border: "1px solid #fecdb5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-shield-lock-fill" style={{ color: "#ee5e42", fontSize: "1.1rem" }} />
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ee5e42", letterSpacing: 1, textTransform: "uppercase" }}>Account Recovery</span>
            </div>

            <h2>Reset Your<br />Password Safely</h2>
            <div className="login-accent-line" />
            <p className="login-info-desc">
              We use a secure OTP-based verification process to ensure only you can reset your account password — no guessing, no gaps.
            </p>

            <div className="login-features-list">
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper orange">
                  <i className="bi bi-envelope-check-fill" />
                </div>
                <div className="login-feature-text">
                  <h4>Email Verification</h4>
                  <p>A 6-digit code is sent to your registered address. Codes expire in 10 minutes.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper blue">
                  <i className="bi bi-key-fill" />
                </div>
                <div className="login-feature-text">
                  <h4>One-time Code</h4>
                  <p>Each reset code works exactly once. Request a fresh one anytime if it expires.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper green">
                  <i className="bi bi-lock-fill" />
                </div>
                <div className="login-feature-text">
                  <h4>Encrypted Storage</h4>
                  <p>Your new password is hashed and stored securely — we never see it in plain text.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT FORM CARD ── */}
          <div className="login-form-side">
            <div className="login-card-form">

              {/* Step indicator */}
              {step !== "success" && (
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 0, marginBottom: 32, position: "relative" }}>
                  {["Email", "Verify", "Reset"].map((label, i) => (
                    <React.Fragment key={i}>
                      <StepDot label={label} index={i} current={step} />
                      {i < 2 && (
                        <div style={{
                          flex: 1, height: 2, background: STEPS.indexOf(step) > i ? "#ee5e42" : "#e2e8f0",
                          marginTop: 15, transition: "background 0.3s", minWidth: 40,
                        }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* ── STEP: Email ── */}
              {step === "email" && (
                <>
                  <div className="login-lock-badge">
                    <i className="bi bi-envelope-fill" style={{ color: "#ee5e42", fontSize: "1.3rem" }} />
                  </div>
                  <h3>Forgot Password?</h3>
                  <p className="login-subtitle">Enter your registered email and we'll send a 6-digit code to verify it's you.</p>
                  <form onSubmit={handleSendOTP}>
                    <div className="login-form-group">
                      <label className="login-label">Email Address</label>
                      <div className="login-input-wrapper">
                        <i className="bi bi-envelope login-input-icon" />
                        <input
                          type="email"
                          className="login-input"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>
                    <button type="submit" className="login-btn-submit" disabled={loading || !email}>
                      {loading
                        ? <><span className="spinner-border spinner-border-sm" /> Sending...</>
                        : <><i className="bi bi-send-fill" /> Send Reset Code</>
                      }
                    </button>
                  </form>
                  <p className="login-signup-prompt" style={{ marginTop: 20 }}>
                    Remembered it? <Link to="/member/login">Back to Login</Link>
                  </p>
                </>
              )}

              {/* ── STEP: OTP ── */}
              {step === "otp" && (
                <>
                  <div className="login-lock-badge" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb" }}>
                    <i className="bi bi-shield-check-fill" style={{ color: "#2563eb", fontSize: "1.3rem" }} />
                  </div>
                  <h3>Verify Your Email</h3>
                  <p className="login-subtitle">
                    We sent a 6-digit code to <strong style={{ color: "#0f172a" }}>{email}</strong>. Enter it below.
                  </p>
                  <form onSubmit={handleVerifyOTP}>
                    <div className="login-form-group">
                      <label className="login-label">6-Digit Code</label>
                      <input
                        type="text"
                        className="login-input"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required
                        autoFocus
                        placeholder="000000"
                        style={{ textAlign: "center", letterSpacing: 10, fontSize: "1.6rem", fontWeight: 700, padding: "13px 16px" }}
                      />
                    </div>
                    <button type="submit" className="login-btn-submit" disabled={loading || otp.length < 6}>
                      {loading
                        ? <><span className="spinner-border spinner-border-sm" /> Verifying...</>
                        : <><i className="bi bi-check2-circle" /> Verify Code</>
                      }
                    </button>
                  </form>
                  <p className="login-signup-prompt" style={{ marginTop: 20 }}>
                    Wrong email?{" "}
                    <button onClick={() => setStep("email")} style={{ background: "none", border: "none", color: "#ee5e42", fontWeight: 600, cursor: "pointer", fontSize: "inherit", padding: 0 }}>
                      Change it
                    </button>
                  </p>
                </>
              )}

              {/* ── STEP: Reset ── */}
              {step === "reset" && (
                <>
                  <div className="login-lock-badge" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>
                    <i className="bi bi-key-fill" style={{ color: "#16a34a", fontSize: "1.3rem" }} />
                  </div>
                  <h3>Set New Password</h3>
                  <p className="login-subtitle">Choose a strong password — at least 8 characters with a mix of letters and numbers.</p>
                  <form onSubmit={handleResetPassword}>
                    <div className="login-form-group">
                      <label className="login-label">New Password</label>
                      <div className="login-input-wrapper">
                        <i className="bi bi-lock login-input-icon" />
                        <input
                          type={showNew ? "text" : "password"}
                          className="login-input"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength="8"
                          placeholder="Min 8 characters"
                          style={{ paddingRight: 44 }}
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)} style={{ position: "absolute", right: 14, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                          <i className={`bi ${showNew ? "bi-eye-slash" : "bi-eye"}`} />
                        </button>
                      </div>
                    </div>
                    <div className="login-form-group">
                      <label className="login-label">Confirm New Password</label>
                      <div className="login-input-wrapper">
                        <i className="bi bi-lock-fill login-input-icon" />
                        <input
                          type={showConfirm ? "text" : "password"}
                          className="login-input"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          placeholder="Repeat new password"
                          style={{
                            paddingRight: 44,
                            borderColor: confirmPassword && newPassword !== confirmPassword ? "#ef4444" : "",
                          }}
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 14, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                          <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`} />
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p style={{ fontSize: "0.78rem", color: "#ef4444", marginTop: 4 }}>Passwords don't match</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="login-btn-submit"
                      disabled={loading || !newPassword || newPassword !== confirmPassword}
                    >
                      {loading
                        ? <><span className="spinner-border spinner-border-sm" /> Updating...</>
                        : <><i className="bi bi-shield-check-fill" /> Reset Password</>
                      }
                    </button>
                  </form>
                </>
              )}

              {/* ── STEP: Success ── */}
              {step === "success" && (
                <div style={{ textAlign: "center", padding: "10px 0" }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: "linear-gradient(135deg, #ee5e42, #d34c31)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                    boxShadow: "0 12px 32px rgba(238,94,66,0.3)",
                  }}>
                    <i className="bi bi-check-lg" style={{ color: "#fff", fontSize: 32 }} />
                  </div>
                  <h3 style={{ marginBottom: 8 }}>Password Reset!</h3>
                  <p className="login-subtitle">Your password has been updated securely. You can now sign in with your new credentials.</p>

                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
                    {[
                      { icon: "bi-shield-check", color: "#16a34a", text: "Password encrypted and stored securely" },
                      { icon: "bi-clock-history", color: "#2563eb", text: "All previous sessions have been invalidated" },
                      { icon: "bi-bell", color: "#ee5e42", text: "A confirmation was sent to your email" },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 2 ? "1px solid #f1f5f9" : "none" }}>
                        <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: "1rem", flexShrink: 0 }} />
                        <span style={{ fontSize: "0.83rem", color: "#475569" }}>{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <Link to="/member/login" className="login-btn-submit" style={{ display: "flex", textDecoration: "none", marginBottom: 16 }}>
                    <i className="bi bi-box-arrow-in-right" /> Sign In Now
                  </Link>
                  <Link to="/" style={{ fontSize: "0.85rem", color: "#94a3b8", textDecoration: "none" }}>← Back to Homepage</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="login-trust-bar">
          {[
            { icon: "bi-shield-lock-fill", title: "256-bit Encryption", sub: "All data transmitted securely" },
            { icon: "bi-clock-fill", title: "10-min Expiry", sub: "OTP codes auto-expire" },
            { icon: "bi-eye-slash-fill", title: "Zero Knowledge", sub: "We never see your password" },
            { icon: "bi-person-lock", title: "Account Protected", sub: "Suspicious activity is blocked" },
          ].map((item, i) => (
            <div className="login-trust-item" key={i}>
              <div className="login-trust-icon-box"><i className={`bi ${item.icon}`} /></div>
              <div className="login-trust-text"><h5>{item.title}</h5><p>{item.sub}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
