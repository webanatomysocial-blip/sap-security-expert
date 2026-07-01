import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import "../css/ContactForm.css"; // Reuse existing clean form styles

const MemberSignup = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Form
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    phone: "",
    location: "",
    company_name: "",
    job_role: "",
    password: "",
    confirmPassword: "",
    otp: "",
    receive_blog_emails: true
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedConsent, setAgreedConsent] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { sendOTP } = await import("../services/api");
      const res = await sendOTP(formData.email);
      if (res.data.status === "success") {
        addToast("Verification code sent to your email.", "success");
        setStep(2);
      } else {
        addToast(res.data.message || "Failed to send code.", "error");
      }
    } catch (err) {
      if (err.response?.data?.status === "deactivated") {
        setShowReactivateModal(true);
      } else {
        addToast(err.response?.data?.message || "Failed to send verification code.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { verifyOTP } = await import("../services/api");
      const res = await verifyOTP(formData.email, formData.otp);
      if (res.data.status === "success") {
        addToast("Email verified successfully!", "success");
        setStep(3);
      } else {
        addToast(res.data.message || "Invalid code.", "error");
      }
    } catch (err) {
      addToast(err.response?.data?.message || "Verification failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      addToast("Passwords do not match.", "error");
      return;
    }

    setLoading(true);
    try {
      const { memberSignup } = await import("../services/api");
      const res = await memberSignup(formData);

      if (res.data.status === "success") {
        setSuccess(true);
        addToast(
          "Account created successfully! Pending admin approval.",
          "success",
        );
      } else {
        addToast(res.data.message || "Failed to register.", "error");
      }
    } catch (err) {
      if (err.response?.data?.status === "deactivated") {
        setShowReactivateModal(true);
      } else {
        addToast(
          err.response?.data?.message ||
            err.message ||
            "Network error during registration.",
          "error",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="contact-form-container"
      style={{ paddingTop: "60px", minHeight: "80vh", maxWidth: success ? "900px" : "600px", transition: "max-width 0.3s ease" }}
    >
      <Helmet>
        <title>Become a Member | SAP Security Expert</title>
      </Helmet>

      <div className="contact-form-header">
        <h2>Become a Member</h2>
        <p>Join our exclusive community of SAP security professionals.</p>
      </div>

      <div
        className="contact-form"
        style={{
          background: "#fff",
          padding: success ? "44px 48px" : "40px",
          borderRadius: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.07)",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center" }}>

            {/* ── Checkmark ── */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 22px",
              boxShadow: "0 12px 32px rgba(59,130,246,0.35)"
            }}>
              <i className="bi bi-check-lg" style={{ color: "#fff", fontSize: 32 }}></i>
            </div>

            <h2 style={{ fontSize: "2rem", fontWeight: 800, color: "#1e293b", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
              Registration Received! 🎉
            </h2>
            <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.65, margin: "0 0 36px" }}>
              Thank you for joining SAP Security Expert!<br />
              Your registration is submitted and is currently being reviewed by our admin team.
            </p>

            {/* ── Progress Steps ── */}
            <div style={{
              display: "flex", alignItems: "flex-start", justifyContent: "space-between",
              marginBottom: 28,
              background: "#f8fafc", borderRadius: 16, padding: "24px 20px 20px",
              border: "1px solid #f1f5f9"
            }}>
              {[
                { num: 1, icon: "bi-send-check-fill", label: "Submitted", sub: "You're all set!", done: true },
                { num: 2, icon: "bi-person-lines-fill", label: "Under Review", sub: "Our team is reviewing your request", done: false },
                { num: 3, icon: "bi-envelope-fill", label: "Approval Email", sub: "We'll email you once approved", done: false },
                { num: 4, icon: "bi-rocket-takeoff-fill", label: "Welcome Aboard", sub: "Start exploring the community!", done: false },
              ].map((s, i, arr) => (
                <React.Fragment key={i}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ position: "relative", marginBottom: 10 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: s.done ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "#e2e8f0",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: s.done ? "0 4px 14px rgba(59,130,246,0.3)" : "none"
                      }}>
                        <i className={`bi ${s.icon}`} style={{ fontSize: 20, color: s.done ? "#fff" : "#94a3b8" }}></i>
                      </div>
                      <div style={{
                        position: "absolute", top: -5, right: -5,
                        width: 18, height: 18, borderRadius: "50%",
                        background: s.done ? "#ee5e42" : "#cbd5e1",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: "#fff",
                        border: "2px solid #f8fafc"
                      }}>{s.num}</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: s.done ? "#1e293b" : "#475569", textAlign: "center" }}>{s.label}</span>
                    <span style={{ fontSize: "0.65rem", color: "#94a3b8", lineHeight: 1.4, marginTop: 3, textAlign: "center", maxWidth: 100 }}>{s.sub}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ paddingTop: 22, flexShrink: 0 }}>
                      <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                        <path d="M0 6 H18 M14 1 L20 6 L14 11" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* ── Credits Earned ── */}
            <div style={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)",
              border: "1.5px solid #fde68a", borderRadius: 18,
              padding: "28px 28px", marginBottom: 16, textAlign: "left",
              position: "relative", overflow: "hidden"
            }}>
              {/* Decorative circles */}
              <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(251,191,36,0.08)" }}></div>
              <div style={{ position: "absolute", bottom: -30, right: 60, width: 80, height: 80, borderRadius: "50%", background: "rgba(251,191,36,0.06)" }}></div>

              <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
                {/* 3D Credit Box */}
                <div style={{ flexShrink: 0, position: "relative" }}>
                  <div style={{
                    width: 80, height: 80,
                    background: "linear-gradient(145deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%)",
                    borderRadius: 16,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 8px 24px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>10</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd", letterSpacing: 1, marginTop: 2 }}>CREDITS</span>
                  </div>
                  {/* Coin decorations */}
                  <div style={{ position: "absolute", top: -10, right: -10, width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 2px 6px rgba(245,158,11,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-coin" style={{ fontSize: 11, color: "#fff" }}></i>
                  </div>
                  <div style={{ position: "absolute", bottom: -8, left: -8, width: 20, height: 20, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 2px 6px rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-coin" style={{ fontSize: 9, color: "#fff" }}></i>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "1.15rem", color: "#1e293b" }}>
                    You've earned <span style={{ color: "#f59e0b" }}>10 Credits!</span>
                  </p>
                  <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#64748b", lineHeight: 1.55 }}>
                    Use your credits to unlock expert articles &amp; guides, insights, tools and more.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#fff", border: "1.5px solid #e2e8f0",
                      borderRadius: 10, padding: "10px 16px",
                      fontSize: "0.82rem", fontWeight: 600, color: "#1e293b",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <i className="bi bi-book-half" style={{ color: "#3b82f6", fontSize: 16 }}></i>
                      Unlock Premium Content
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      background: "#fff", border: "1.5px solid #e2e8f0",
                      borderRadius: 10, padding: "10px 16px",
                      fontSize: "0.82rem", fontWeight: 600, color: "#1e293b",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                    }}>
                      <i className="bi bi-wallet2" style={{ color: "#f59e0b", fontSize: 16 }}></i>
                      Your Current Balance
                      <span style={{
                        background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff",
                        borderRadius: 8, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700
                      }}>10 Credits</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── LinkedIn Share ── */}
            <div style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              border: "1.5px solid #bfdbfe", borderRadius: 18,
              padding: "24px 28px", marginBottom: 16, textAlign: "left",
              display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden"
            }}>
              <div style={{ position: "absolute", top: -16, left: -16, width: 80, height: 80, borderRadius: "50%", background: "rgba(37,99,235,0.06)" }}></div>

              {/* LinkedIn Icon Block */}
              <div style={{
                width: 58, height: 58, borderRadius: 14, flexShrink: 0,
                background: "#0077b5",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 20px rgba(0,119,181,0.35)"
              }}>
                <i className="bi bi-linkedin" style={{ color: "#fff", fontSize: 26 }}></i>
              </div>

              <div style={{ flex: 1, position: "relative" }}>
                <p style={{ margin: "0 0 5px", fontWeight: 800, fontSize: "0.95rem", color: "#1e293b" }}>
                  Share that you've registered on SAP Security Expert and earn more!
                </p>
                <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
                  Share on LinkedIn and get 5 extra credits once your registration is approved.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    <i className="bi bi-star-fill" style={{ color: "#f59e0b", marginRight: 4 }}></i>Get approved faster
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    <i className="bi bi-graph-up-arrow" style={{ color: "#3b82f6", marginRight: 4 }}></i>Increase your visibility
                  </span>
                </div>
                <button
                  onClick={() => {
                    localStorage.setItem("linkedin_shared_pending", "1");
                    window.open(
                      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`,
                      "_blank", "noopener,noreferrer"
                    );
                  }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, marginTop: 14,
                    background: "#0077b5", color: "#fff", border: "none", cursor: "pointer",
                    padding: "10px 20px", borderRadius: 9, fontSize: "0.85rem", fontWeight: 700,
                    boxShadow: "0 4px 14px rgba(0,119,181,0.3)", fontFamily: "inherit"
                  }}
                >
                  <i className="bi bi-linkedin"></i> Share on LinkedIn
                </button>
              </div>

              {/* +5 Credits Badge */}
              <div style={{
                flexShrink: 0, background: "#fff", border: "2px solid #fde68a",
                borderRadius: 14, padding: "14px 18px", textAlign: "center",
                boxShadow: "0 4px 16px rgba(245,158,11,0.15)"
              }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                  <i className="bi bi-star-fill" style={{ color: "#fff", fontSize: 16 }}></i>
                </div>
                <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#f59e0b", display: "block", lineHeight: 1 }}>+5</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5 }}>Credits</span>
              </div>
            </div>

            {/* ── How to Earn Credits ── */}
            <div style={{
              background: "#fff", border: "1.5px solid #e2e8f0",
              borderRadius: 18, padding: "24px 28px", marginBottom: 16, textAlign: "left"
            }}>
              <p style={{ margin: "0 0 16px", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
                💡 Ways to Earn Credits
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                    <th style={{ textAlign: "left", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Activity</th>
                    <th style={{ textAlign: "center", padding: "8px 0", color: "#64748b", fontWeight: 600 }}>Credits</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", color: "#64748b", fontWeight: 600 }}>Why it works</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { icon: "bi-person-check-fill", activity: "New Registration", credits: 10, why: "Experience premium quality", color: "#3b82f6" },
                    { icon: "bi-chat-dots-fill", activity: "Approved Comment", credits: 2, why: "Encourages meaningful discussions", color: "#10b981" },
                    { icon: "bi-people-fill", activity: "Referral (new member registers)", credits: 2, why: "Organic growth", color: "#8b5cf6" },
                    { icon: "bi-file-earmark-text-fill", activity: "Article Published (Community Author)", credits: 20, why: "Builds content library", color: "#f59e0b" },
                    { icon: "bi-mic-fill", activity: "Podcast Guest", credits: 20, why: "Attracts industry leaders", color: "#ee5e42" },
                    { icon: "bi-flag-fill", activity: "Report an Error", credits: 1, why: "Improves content quality", color: "#64748b" },
                    { icon: "bi-person-badge-fill", activity: "Complete Profile", credits: 2, why: "Better audience insights", color: "#0ea5e9" },
                    { icon: "bi-star-fill", activity: "Submit a Product Review", credits: 5, why: "Grows review ecosystem", color: "#f59e0b" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td style={{ padding: "10px 0", color: "#1e293b", fontWeight: 500 }}>
                        <i className={`bi ${row.icon}`} style={{ color: row.color, marginRight: 8 }}></i>
                        {row.activity}
                      </td>
                      <td style={{ padding: "10px 0", textAlign: "center" }}>
                        <span style={{
                          background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff",
                          borderRadius: 6, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 700
                        }}>+{row.credits}</span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#64748b" }}>{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── What Happens Next ── */}
            <div style={{
              background: "#f8fafc", border: "1.5px solid #e2e8f0",
              borderRadius: 18, padding: "22px 28px", marginBottom: 28,
              display: "flex", alignItems: "center", gap: 20, textAlign: "left"
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: 13, flexShrink: 0,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 14px rgba(99,102,241,0.3)"
              }}>
                <i className="bi bi-shield-check-fill" style={{ color: "#fff", fontSize: 22 }}></i>
              </div>
              <div>
                <p style={{ margin: "0 0 5px", fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                  What happens next?
                </p>
                <p style={{ margin: 0, fontSize: "0.845rem", color: "#64748b", lineHeight: 1.6 }}>
                  Our team will review your details. Once approved, you'll receive an email with instructions to activate your account and start your journey.
                </p>
              </div>
            </div>

            <Link to="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
              ← Back to Homepage
            </Link>
          </div>
        ) : (
          <div className="signup-steps">
            {step === 1 && (
              <form onSubmit={handleSendOTP}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="john@example.com"
                  />
                </div>
                <button type="submit" className="btn-primary" style={{width:'100%'}} disabled={loading || !formData.email}>
                  {loading ? "Sending Code..." : "Verify Email with OTP"}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <div className="form-group">
                  <label className="form-label">Verification Code *</label>
                  <input
                    type="text"
                    name="otp"
                    className="form-control"
                    value={formData.otp}
                    onChange={handleChange}
                    required
                    placeholder="6-digit code"
                    maxLength="6"
                  />
                  <p style={{fontSize:'0.85rem', color:'#64748b', marginTop:'8px'}}>
                    Sent to {formData.email}. <span onClick={() => setStep(1)} style={{color:'#3b82f6', cursor:'pointer'}}>Change email</span>
                  </p>
                </div>
                <button type="submit" className="btn-primary" style={{width:'100%'}} disabled={loading || !formData.otp}>
                  {loading ? "Verifying..." : "Verify Code"}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleSubmit}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "20px"
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Username (Optional)</label>
                    <input
                      type="text"
                      name="username"
                      className="form-control"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="johndoe"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Verified Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    disabled
                    style={{background:'#f1f5f9'}}
                  />
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginBottom: "20px"
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      className="form-control"
                      value={formData.company_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Job Role *</label>
                    <input
                      type="text"
                      name="job_role"
                      className="form-control"
                      value={formData.job_role}
                      onChange={handleChange}
                      required
                      placeholder="e.g. SAP Security Lead"
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                  }}
                >
                  <div className="form-group">
                    <label className="form-label">Phone (Optional)</label>
                    <input
                      type="tel"
                      name="phone"
                      className="form-control"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location *</label>
                    <input
                      type="text"
                      name="location"
                      className="form-control"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", cursor: "pointer", fontWeight: "normal" }}>
                    <input
                      type="checkbox"
                      name="receive_blog_emails"
                      checked={formData.receive_blog_emails}
                      onChange={(e) => setFormData({ ...formData, receive_blog_emails: e.target.checked })}
                      style={{ marginRight: "10px", width: "18px", height: "18px" }}
                    />
                    Subscribe to receive the latest blog articles and updates via email
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Create a strong password"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-control"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    placeholder="Repeat password"
                    style={{
                      borderColor:
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword
                          ? "#ef4444"
                          : "",
                    }}
                  />
                </div>

                {/* Consent checkboxes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: "#ee5e42", flexShrink: 0, cursor: "pointer" }}
                    />
                    <span>
                      I have read and agree to the{" "}
                      <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#ee5e42", textDecoration: "underline" }}>Privacy Policy</a>
                      {" "}and{" "}
                      <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" style={{ color: "#ee5e42", textDecoration: "underline" }}>Terms of Use</a>.
                    </span>
                  </label>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.85rem", color: "#475569", lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={agreedConsent}
                      onChange={(e) => setAgreedConsent(e.target.checked)}
                      style={{ marginTop: 2, width: 16, height: 16, accentColor: "#ee5e42", flexShrink: 0, cursor: "pointer" }}
                    />
                    <span>
                      I consent to SAP Security Expert collecting and processing my personal information for the purpose of creating and managing my account.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    loading ||
                    !formData.name ||
                    !formData.password ||
                    formData.password !== formData.confirmPassword ||
                    !agreedTerms ||
                    !agreedConsent
                  }
                  style={{ width: "100%", marginTop: "20px" }}
                >
                  {loading ? "Completing Registration..." : "Complete Registration"}
                </button>
              </form>
            )}
            
            <div
              style={{
                textAlign: "center",
                marginTop: "24px",
                paddingTop: "20px",
                borderTop: "1px solid #eee",
              }}
            >
              <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
                Already a member?{" "}
                <Link
                  to="/member/login"
                  style={{
                    color: "#3b82f6",
                    textDecoration: "none",
                    fontWeight: "600",
                  }}
                >
                  Log in here
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
      {showReactivateModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowReactivateModal(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '24px',
              padding: '40px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button 
              onClick={() => setShowReactivateModal(false)}
              style={{
                position: 'absolute',
                top: '20px', right: '20px',
                background: 'none', border: 'none',
                fontSize: '24px', cursor: 'pointer',
                color: '#64748b', transition: 'color 0.2s'
              }}
            >
              ×
            </button>
            <div style={{
              width: '64px', height: '64px',
              background: '#eff6ff', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px', color: '#2563eb'
            }}>
              <i className="bi bi-info-circle-fill" style={{ fontSize: '28px' }}></i>
            </div>
            <h3 style={{
              fontSize: '1.5rem', fontWeight: 800,
              color: '#0f172a', marginBottom: '16px'
            }}>
              Account Deactivated
            </h3>
            <p style={{
              color: '#475569', fontSize: '1rem',
              lineHeight: 1.6, marginBottom: '32px'
            }}>
              This account was previously deactivated. You can reactivate this account by writing an email to the admin.
            </p>
            <a 
              href="mailto:hello@sapsecurityexpert.com?subject=Account Reactivation Request"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '12px 24px',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)'
              }}
            >
              <i className="bi bi-envelope-fill"></i> Email: hello@sapsecurityexpert.com
            </a>
            <button
              onClick={() => setShowReactivateModal(false)}
              style={{
                background: 'none', border: 'none',
                marginTop: '16px', color: '#64748b',
                fontWeight: 500, cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberSignup;
