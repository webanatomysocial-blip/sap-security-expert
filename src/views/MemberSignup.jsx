import React, { useState, useMemo } from "react";
import SEO from "../components/SEO";
import { createPortal } from "react-dom";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { COUNTRIES, statesForCountry, citiesForCountry } from "../constants/countries";
import SearchableSelect from "../components/SearchableSelect";

import "../css/MemberLogin.css";

const GOALS = [
  "Learn",
  "Share expertise",
  "Network with SAP Security professionals",
  "Find career opportunities",
  "Attend expert sessions",
  "Contribute articles",
  "Access research & tools",
];

const ROLES = [
  "SAP Security Consultant",
  "SAP GRC / Access Governance Consultant",
  "SAP Security Architect",
  "SAP Security Manager",
  "SAP Cybersecurity Professional",
  "SAP Auditor / Internal Auditor",
  "SAP Basis / Technology",
  "IAM / Identity Professional",
  "Risk & Compliance",
  "CISO / Security Leadership",
  "SAP Customer / Business User",
  "SAP Partner / Consulting",
  "Student / Early Career",
  "Other",
];

const MemberSignup = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Form
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: "", email: "", username: "", phone: "", location: "", country: "", state: "",
    company_name: "", job_role: "", password: "", confirmPassword: "",
    otp: "", receive_blog_emails: true,
    goals: [], currentRole: "", researchOptIn: "",
    ref_code: searchParams.get("ref") || "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedConsent, setAgreedConsent] = useState(false);
  const { addToast } = useToast();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const stateOptions = useMemo(() => statesForCountry(formData.country), [formData.country]);
  const cityOptions = useMemo(() => citiesForCountry(formData.country, formData.state), [formData.country, formData.state]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { sendOTP } = await import("../services/api");
      const res = await sendOTP(formData.email);
      if (res.data.status === "success") {
        addToast("Verification code sent to your email.", "success");
        setStep(2);
      } else { addToast(res.data.message || "Failed to send code.", "error"); }
    } catch (err) {
      if (err.response?.data?.status === "deactivated") setShowReactivateModal(true);
      else addToast(err.response?.data?.message || "Failed to send verification code.", "error");
    } finally { setLoading(false); }
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
      } else { addToast(res.data.message || "Invalid code.", "error"); }
    } catch (err) {
      addToast(err.response?.data?.message || "Verification failed.", "error");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { addToast("Passwords do not match.", "error"); return; }
    setLoading(true);
    try {
      const { memberSignup } = await import("../services/api");
      const res = await memberSignup(formData);
      if (res.data.status === "success") {
        setSuccess(true);
        addToast("Account created successfully! Pending admin approval.", "success");
      } else { addToast(res.data.message || "Failed to register.", "error"); }
    } catch (err) {
      if (err.response?.data?.status === "deactivated") setShowReactivateModal(true);
      else addToast(err.response?.data?.message || err.message || "Network error during registration.", "error");
    } finally { setLoading(false); }
  };

  // ── LEFT PANEL content per step ──
  const stepInfo = {
    1: {
      icon: "bi-people-fill",
      badge: "Join the Community",
      headline: "Join the SAP Security\nCommunity",
      desc: "Join thousands of SAP Security, GRC, and BTP professionals sharing insights, resources, and expertise.",
      features: [
        { icon: "bi-book-half", theme: "blue", title: "Exclusive Content", desc: "Access member-only articles, guides, and expert insights." },
        { icon: "bi-chat-dots-fill", theme: "orange", title: "Community Discussions", desc: "Engage with peers and ask questions in a trusted environment." },
        { icon: "bi-coin", theme: "green", title: "Earn Credits", desc: "Get rewarded for contributing, commenting, and sharing." },
      ],
    },
    2: {
      icon: "bi-envelope-check-fill",
      badge: "Email Verification",
      headline: "Verify Your\nEmail Address",
      desc: "We've sent a 6-digit code to your inbox. This ensures your account is linked to a real email address.",
      features: [
        { icon: "bi-clock-fill", theme: "orange", title: "Code Expires in 10 min", desc: "Request a new one anytime if it expires." },
        { icon: "bi-shield-fill-check", theme: "blue", title: "Secure Verification", desc: "One-time codes are encrypted and single-use." },
        { icon: "bi-envelope-exclamation-fill", theme: "green", title: "Check Your Spam", desc: "Didn't see it? Check your spam or junk folder." },
      ],
    },
    3: {
      icon: "bi-person-badge-fill",
      badge: "Complete Profile",
      headline: "Almost There —\nTell Us About You",
      desc: "A complete profile helps us connect you with the right content and community members in your area of expertise.",
      features: [
        { icon: "bi-coin", theme: "orange", title: "10 Welcome Credits", desc: "Credited instantly once your account is approved." },
        { icon: "bi-eye-slash-fill", theme: "blue", title: "Privacy First", desc: "Your data is never sold or shared with third parties." },
        { icon: "bi-lightning-charge-fill", theme: "green", title: "Fast Approval", desc: "Most accounts are reviewed and approved within 24 hours." },
      ],
    },
  };

  const info = stepInfo[step] || stepInfo[1];

  if (success) {
    return (
      <div style={{ padding: "60px 24px", maxWidth: 900, margin: "0 auto" }}>
        <SEO title="Registration Received | SAP Security Expert" />

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "linear-gradient(135deg, #ee5e42 0%, #d34c31 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", boxShadow: "0 12px 32px rgba(238,94,66,0.3)",
          }}>
            <i className="bi bi-check-lg" style={{ color: "#fff", fontSize: 36 }} />
          </div>
          <h2 style={{ fontSize: "2.2rem", fontWeight: 800, color: "#1e293b", margin: "0 0 10px", letterSpacing: "-0.5px" }}>
            Registration Received! 🎉
          </h2>
          <p style={{ color: "#64748b", fontSize: "1rem", lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
            Thank you for joining SAP Security Expert! Your registration is submitted and is currently being reviewed by our admin team.
          </p>
        </div>

        {/* Progress steps */}
        <div style={{ background: "#f8fafc", borderRadius: 20, padding: "28px 24px", border: "1px solid #f1f5f9", marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          {[
            { num: 1, icon: "bi-send-check-fill", label: "Submitted", sub: "You're all set!", done: true },
            { num: 2, icon: "bi-person-lines-fill", label: "Under Review", sub: "Our team is reviewing", done: false },
            { num: 3, icon: "bi-envelope-fill", label: "Approval Email", sub: "We'll email you soon", done: false },
            { num: 4, icon: "bi-rocket-takeoff-fill", label: "Welcome Aboard", sub: "Start exploring!", done: false },
          ].map((s, i, arr) => (
            <React.Fragment key={i}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", background: s.done ? "linear-gradient(135deg, #ee5e42, #d34c31)" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: s.done ? "0 4px 14px rgba(238,94,66,0.3)" : "none" }}>
                    <i className={`bi ${s.icon}`} style={{ fontSize: 20, color: s.done ? "#fff" : "#94a3b8" }} />
                  </div>
                  <div style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: s.done ? "#2563eb" : "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff", border: "2px solid #f8fafc" }}>{s.num}</div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: s.done ? "#1e293b" : "#475569", textAlign: "center" }}>{s.label}</span>
                <span style={{ fontSize: "0.65rem", color: "#94a3b8", lineHeight: 1.4, marginTop: 3, textAlign: "center", maxWidth: 100 }}>{s.sub}</span>
              </div>
              {i < arr.length - 1 && (
                <div style={{ paddingTop: 24, flexShrink: 0 }}>
                  <svg width="24" height="12" viewBox="0 0 24 12" fill="none"><path d="M0 6 H18 M14 1 L20 6 L14 11" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Credits earned */}
        <div style={{ background: "linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)", border: "1.5px solid #fde68a", borderRadius: 20, padding: "28px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(251,191,36,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
            <div style={{ flexShrink: 0, position: "relative" }}>
              <div style={{ width: 80, height: 80, background: "linear-gradient(145deg, #2563eb 0%, #1d4ed8 60%, #1e40af 100%)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(37,99,235,0.45)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1 }}>10</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#93c5fd", letterSpacing: 1, marginTop: 2 }}>CREDITS</span>
              </div>
              <div style={{ position: "absolute", top: -10, right: -10, width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 2px 6px rgba(245,158,11,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className="bi bi-coin" style={{ fontSize: 11, color: "#fff" }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "1.1rem", color: "#1e293b" }}>You've earned <span style={{ color: "#f59e0b" }}>10 Welcome Credits!</span></p>
              <p style={{ margin: "0 0 16px", fontSize: "0.875rem", color: "#64748b", lineHeight: 1.55 }}>Use credits to unlock expert articles, guides, tools, and more once your account is approved.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { icon: "bi-book-half", color: "#3b82f6", text: "Unlock Premium Content" },
                  { icon: "bi-wallet2", color: "#f59e0b", text: "Your Balance: 10 Credits" },
                ].map((chip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 14px", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <i className={`bi ${chip.icon}`} style={{ color: chip.color, fontSize: 15 }} />{chip.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LinkedIn share */}
        <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", border: "1.5px solid #bfdbfe", borderRadius: 20, padding: "24px 28px", marginBottom: 16, display: "flex", alignItems: "center", gap: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ width: 58, height: 58, borderRadius: 14, flexShrink: 0, background: "#0077b5", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(0,119,181,0.35)" }}>
            <i className="bi bi-linkedin" style={{ color: "#fff", fontSize: 26 }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: "0.95rem", color: "#1e293b" }}>Share on LinkedIn and earn 5 extra credits!</p>
            <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>Share that you've joined SAP Security Expert and get bonus credits once approved.</p>
            <button
              onClick={() => { localStorage.setItem("linkedin_shared_pending", "1"); window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer"); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0077b5", color: "#fff", border: "none", cursor: "pointer", padding: "9px 18px", borderRadius: 9, fontSize: "0.85rem", fontWeight: 700, boxShadow: "0 4px 14px rgba(0,119,181,0.3)", fontFamily: "inherit" }}
            >
              <i className="bi bi-linkedin" /> Share on LinkedIn
            </button>
          </div>
          <div style={{ flexShrink: 0, background: "#fff", border: "2px solid #fde68a", borderRadius: 14, padding: "14px 18px", textAlign: "center", boxShadow: "0 4px 16px rgba(245,158,11,0.15)" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #d97706)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
              <i className="bi bi-star-fill" style={{ color: "#fff", fontSize: 16 }} />
            </div>
            <span style={{ fontSize: "1.2rem", fontWeight: 900, color: "#f59e0b", display: "block", lineHeight: 1 }}>+5</span>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5 }}>Credits</span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <Link to="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>← Back to Homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page-wrapper">
      <SEO title="Become a Member | SAP Security Expert" />

      <div className="login-page-container">
        <div className="login-split-grid">

          {/* ── LEFT INFO PANEL ── */}
          <div className="login-info-side">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#fff0ec", border: "1px solid #fecdb5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={`bi ${info.icon}`} style={{ color: "#ee5e42", fontSize: "1.1rem" }} />
              </div>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ee5e42", letterSpacing: 1, textTransform: "uppercase" }}>{info.badge}</span>
            </div>
            <h2 style={{ whiteSpace: "pre-line" }}>{info.headline}</h2>
            <div className="login-accent-line" />
            <p className="login-info-desc">{info.desc}</p>
            <div className="login-features-list">
              {info.features.map((f, i) => (
                <div className="login-feature-item" key={i}>
                  <div className={`login-feature-icon-wrapper ${f.theme}`}>
                    <i className={`bi ${f.icon}`} />
                  </div>
                  <div className="login-feature-text">
                    <h4>{f.title}</h4>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT FORM CARD ── */}
          <div className="login-form-side">
            <div className="login-card-form" style={{ maxWidth: step === 3 ? 640 : 460 }}>

              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 28 }}>
                {["Email", "Verify", "Profile"].map((label, i) => (
                  <React.Fragment key={i}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 30, height: 30, borderRadius: "50%", background: step > i + 1 ? "#ee5e42" : step === i + 1 ? "#1e293b" : "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.2s" }}>
                        {step > i + 1
                          ? <i className="bi bi-check" style={{ color: "#fff", fontSize: 13, fontWeight: 700 }} />
                          : <span style={{ fontSize: "0.72rem", fontWeight: 700, color: step === i + 1 ? "#fff" : "#94a3b8" }}>{i + 1}</span>
                        }
                      </div>
                      <span style={{ fontSize: "0.67rem", fontWeight: 600, color: step === i + 1 ? "#0f172a" : "#94a3b8", whiteSpace: "nowrap" }}>{label}</span>
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 2, background: step > i + 1 ? "#ee5e42" : "#e2e8f0", marginBottom: 18, minWidth: 36, transition: "background 0.3s" }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* ── STEP 1: Email ── */}
              {step === 1 && (
                <>
                  <div className="login-lock-badge">
                    <i className="bi bi-envelope-fill" style={{ color: "#ee5e42", fontSize: "1.3rem" }} />
                  </div>
                  <h3>Create Your Account</h3>
                  <p className="login-subtitle">Start by verifying your email address. We'll send a one-time code to confirm it's you.</p>
                  <form onSubmit={handleSendOTP}>
                    <div className="login-form-group">
                      <label className="login-label">Email Address</label>
                      <div className="login-input-wrapper">
                        <i className="bi bi-envelope login-input-icon" />
                        <input type="email" name="email" className="login-input" value={formData.email} onChange={handleChange} required autoFocus placeholder="name@company.com" />
                      </div>
                    </div>
                    <button type="submit" className="login-btn-submit" disabled={loading || !formData.email}>
                      {loading ? <><span className="spinner-border spinner-border-sm" /> Sending...</> : <><i className="bi bi-send-fill" /> Send Verification Code</>}
                    </button>
                  </form>
                  <p className="login-signup-prompt" style={{ marginTop: 20 }}>
                    Already a member? <Link to="/member/login">Sign in</Link>
                  </p>
                </>
              )}

              {/* ── STEP 2: OTP ── */}
              {step === 2 && (
                <>
                  <div className="login-lock-badge" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#2563eb" }}>
                    <i className="bi bi-shield-fill-check" style={{ color: "#2563eb", fontSize: "1.3rem" }} />
                  </div>
                  <h3>Verify Your Email</h3>
                  <p className="login-subtitle">We sent a 6-digit code to <strong style={{ color: "#0f172a" }}>{formData.email}</strong></p>
                  <form onSubmit={handleVerifyOTP}>
                    <div className="login-form-group">
                      <label className="login-label">6-Digit Code</label>
                      <input
                        type="text" name="otp" className="login-input"
                        value={formData.otp}
                        onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                        required autoFocus placeholder="000000"
                        style={{ textAlign: "center", letterSpacing: 10, fontSize: "1.6rem", fontWeight: 700, padding: "13px 16px" }}
                      />
                    </div>
                    <button type="submit" className="login-btn-submit" disabled={loading || formData.otp.length < 6}>
                      {loading ? <><span className="spinner-border spinner-border-sm" /> Verifying...</> : <><i className="bi bi-check2-circle" /> Verify Code</>}
                    </button>
                  </form>
                  <p className="login-signup-prompt" style={{ marginTop: 20 }}>
                    Wrong email?{" "}
                    <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "#ee5e42", fontWeight: 600, cursor: "pointer", fontSize: "inherit", padding: 0 }}>Change it</button>
                  </p>
                </>
              )}

              {/* ── STEP 3: Profile Form ── */}
              {step === 3 && (
                <>
                  <div className="login-lock-badge" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a" }}>
                    <i className="bi bi-person-check-fill" style={{ color: "#16a34a", fontSize: "1.3rem" }} />
                  </div>
                  <h3>Complete Your Profile</h3>
                  <p className="login-subtitle">Fill in your details to complete registration. Fields marked * are required.</p>
                  <form onSubmit={handleSubmit}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="login-form-group">
                        <label className="login-label">Full Name *</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-person login-input-icon" />
                          <input type="text" name="name" className="login-input" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
                        </div>
                      </div>
                      <div className="login-form-group">
                        <label className="login-label">Username</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-at login-input-icon" />
                          <input type="text" name="username" className="login-input" value={formData.username} onChange={handleChange} placeholder="johndoe" />
                        </div>
                      </div>
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">Verified Email</label>
                      <div className="login-input-wrapper">
                        <i className="bi bi-envelope-check login-input-icon" />
                        <input type="email" className="login-input" value={formData.email} disabled style={{ background: "#f8fafc", color: "#64748b" }} />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="login-form-group">
                        <label className="login-label">Company *</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-building login-input-icon" />
                          <input type="text" name="company_name" className="login-input" value={formData.company_name} onChange={handleChange} required placeholder="Acme Corp" />
                        </div>
                      </div>
                      <div className="login-form-group">
                        <label className="login-label">Job Role *</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-briefcase login-input-icon" />
                          <input type="text" name="job_role" className="login-input" value={formData.job_role} onChange={handleChange} required placeholder="SAP Security Lead" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="login-form-group">
                        <label className="login-label">Phone</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-telephone login-input-icon" />
                          <input type="tel" name="phone" className="login-input" value={formData.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                        </div>
                      </div>
                      <div className="login-form-group">
                        <label className="login-label">Country *</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-flag login-input-icon" />
                          <SearchableSelect
                            className="login-input"
                            value={formData.country}
                            onChange={(v) => setFormData((f) => ({ ...f, country: v, state: "", location: "" }))}
                            options={COUNTRIES}
                            placeholder="Type to search your country"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="login-form-group">
                        <label className="login-label">State / Province</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-map login-input-icon" />
                          <SearchableSelect
                            className="login-input"
                            value={formData.state}
                            onChange={(v) => setFormData((f) => ({ ...f, state: v, location: "" }))}
                            options={stateOptions}
                            placeholder={formData.country ? "Type to search" : "Select a country first"}
                            disabled={!formData.country || stateOptions.length === 0}
                          />
                        </div>
                      </div>
                      <div className="login-form-group">
                        <label className="login-label">City</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-geo-alt login-input-icon" />
                          <SearchableSelect
                            className="login-input"
                            value={formData.location}
                            onChange={(v) => setFormData((f) => ({ ...f, location: v }))}
                            options={cityOptions}
                            placeholder={formData.country ? "Type to search" : "Select a country first"}
                            disabled={!formData.country}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">What would you like to do in the SAP Security community?</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginTop: 8 }}>
                        {GOALS.map((goal) => (
                          <label key={goal} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: "#475569", lineHeight: 1.4 }}>
                            <input
                              type="checkbox"
                              checked={formData.goals.includes(goal)}
                              onChange={(e) => setFormData((f) => ({
                                ...f,
                                goals: e.target.checked ? [...f.goals, goal] : f.goals.filter((g) => g !== goal),
                              }))}
                              style={{ marginTop: 2, width: 16, height: 16, accentColor: "#ee5e42", flexShrink: 0, cursor: "pointer" }}
                            />
                            {goal}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">What best describes your current role?</label>
                      <SearchableSelect
                        className="login-input"
                        style={{ paddingLeft: 16 }}
                        value={formData.currentRole}
                        onChange={(v) => setFormData((f) => ({ ...f, currentRole: v }))}
                        options={ROLES}
                        placeholder="Type to search your role"
                      />
                    </div>

                    <div className="login-form-group">
                      <label className="login-label">Would you like to participate in SAP Security research and surveys?</label>
                      <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 10px", lineHeight: 1.5 }}>
                        From time to time, SAP Security Expert conducts research and surveys on SAP Security, GRC, cybersecurity, technology adoption and industry trends. Would you like us to contact you for participation?
                      </p>
                      <div style={{ display: "flex", gap: 20 }}>
                        {[{ v: "yes", label: "Yes, I am interested" }, { v: "no", label: "Not now" }].map((opt) => (
                          <label key={opt.v} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem", color: "#475569" }}>
                            <input
                              type="radio"
                              name="researchOptIn"
                              checked={formData.researchOptIn === opt.v}
                              onChange={() => setFormData((f) => ({ ...f, researchOptIn: opt.v }))}
                              style={{ width: 16, height: 16, accentColor: "#ee5e42", cursor: "pointer" }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div className="login-form-group">
                        <label className="login-label">Password *</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-lock login-input-icon" />
                          <input type={showPass ? "text" : "password"} name="password" className="login-input" value={formData.password} onChange={handleChange} required placeholder="Min 8 chars" style={{ paddingRight: 44 }} />
                          <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 14, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                            <i className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        </div>
                      </div>
                      <div className="login-form-group">
                        <label className="login-label">Confirm Password *</label>
                        <div className="login-input-wrapper">
                          <i className="bi bi-lock-fill login-input-icon" />
                          <input
                            type={showConfirm ? "text" : "password"} name="confirmPassword" className="login-input"
                            value={formData.confirmPassword} onChange={handleChange} required placeholder="Repeat password"
                            style={{ paddingRight: 44, borderColor: formData.confirmPassword && formData.password !== formData.confirmPassword ? "#ef4444" : "" }}
                          />
                          <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 14, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0 }}>
                            <i className={`bi ${showConfirm ? "bi-eye-slash" : "bi-eye"}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.83rem", color: "#475569", lineHeight: 1.5 }}>
                        <input type="checkbox" checked={formData.receive_blog_emails} onChange={(e) => setFormData({ ...formData, receive_blog_emails: e.target.checked })} style={{ marginTop: 2, width: 16, height: 16, accentColor: "#ee5e42", flexShrink: 0, cursor: "pointer" }} />
                        Subscribe to receive the latest articles and updates via email
                      </label>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.83rem", color: "#475569", lineHeight: 1.5 }}>
                        <input type="checkbox" checked={agreedTerms} onChange={(e) => setAgreedTerms(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "#ee5e42", flexShrink: 0, cursor: "pointer" }} />
                        <span>I agree to the <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#ee5e42" }}>Privacy Policy</a> and <a href="/terms-conditions" target="_blank" rel="noopener noreferrer" style={{ color: "#ee5e42" }}>Terms of Use</a>.</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", fontSize: "0.83rem", color: "#475569", lineHeight: 1.5 }}>
                        <input type="checkbox" checked={agreedConsent} onChange={(e) => setAgreedConsent(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: "#ee5e42", flexShrink: 0, cursor: "pointer" }} />
                        I consent to SAP Security Expert collecting and processing my personal information to create and manage my account.
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="login-btn-submit"
                      disabled={loading || !formData.name || !formData.password || formData.password !== formData.confirmPassword || !agreedTerms || !agreedConsent}
                    >
                      {loading ? <><span className="spinner-border spinner-border-sm" /> Registering...</> : <><i className="bi bi-person-plus-fill" /> Complete Registration</>}
                    </button>
                  </form>
                  <p className="login-signup-prompt" style={{ marginTop: 16 }}>
                    Already a member? <Link to="/member/login">Sign in</Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="login-trust-bar">
          {[
            { icon: "bi-patch-check-fill", title: "Expert Curated", sub: "Quality content by industry experts" },
            { icon: "bi-people-fill", title: "Trusted by Professionals", sub: "Join 10,000+ SAP security experts" },
            { icon: "bi-coin", title: "10 Welcome Credits", sub: "Credited instantly on approval" },
            { icon: "bi-graph-up-arrow", title: "Make an Impact", sub: "Contribute and grow your reputation" },
          ].map((item, i) => (
            <div className="login-trust-item" key={i}>
              <div className="login-trust-icon-box"><i className={`bi ${item.icon}`} /></div>
              <div className="login-trust-text"><h5>{item.title}</h5><p>{item.sub}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* Reactivate modal */}
      {showReactivateModal && createPortal(
        <div onClick={() => setShowReactivateModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 24, padding: 40, maxWidth: 480, width: "100%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", textAlign: "center", position: "relative" }}>
            <button onClick={() => setShowReactivateModal(false)} style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#64748b" }}>×</button>
            <div style={{ width: 64, height: 64, background: "#fff0ec", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", color: "#ee5e42" }}>
              <i className="bi bi-info-circle-fill" style={{ fontSize: 28 }} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginBottom: 16 }}>Account Deactivated</h3>
            <p style={{ color: "#475569", fontSize: "1rem", lineHeight: 1.6, marginBottom: 32 }}>This account was previously deactivated. You can reactivate it by writing to the admin.</p>
            <a href="mailto:hello@sapsecurityexpert.com?subject=Account Reactivation Request" className="login-btn-submit" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", textDecoration: "none" }}>
              <i className="bi bi-envelope-fill" /> Email: hello@sapsecurityexpert.com
            </a>
            <button onClick={() => setShowReactivateModal(false)} style={{ background: "none", border: "none", marginTop: 16, color: "#64748b", fontWeight: 500, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MemberSignup;
