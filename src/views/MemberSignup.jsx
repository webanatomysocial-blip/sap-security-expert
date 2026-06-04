import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import "../css/ContactForm.css"; // Reuse existing clean form styles

const MemberSignup = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Form
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
      addToast(err.response?.data?.message || "Failed to send verification code.", "error");
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
      addToast(
        err.response?.data?.message ||
          err.message ||
          "Network error during registration.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="contact-form-container"
      style={{ paddingTop: "60px", minHeight: "80vh" }}
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
          maxWidth: "700px",
          margin: "0 auto",
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <h2 style={{ color: "#3b82f6", marginBottom: "16px" }}>
              You're on the Waitlist! 🚀
            </h2>
            <p
              style={{
                color: "#475569",
                fontSize: "1.1rem",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              Thank you for applying to join the SAP Security Expert community.
              Your application is currently being reviewed by our team.
            </p>
            
            <div style={{
              background: "#f8fafc",
              padding: "24px",
              borderRadius: "12px",
              marginBottom: "32px",
              border: "1px solid #e2e8f0"
            }}>
              <p style={{ fontWeight: "600", color: "#1e293b", marginBottom: "12px" }}>
                Want to speed up your approval?
              </p>
              <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: "20px" }}>
                Share that you've applied on LinkedIn! Members who share their application often get approved faster.
              </p>
              <a 
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center", 
                  gap: "10px", 
                  textDecoration: "none",
                  backgroundColor: "#0077b5",
                  borderColor: "#0077b5"
                }}
              >
                <i className="bi bi-linkedin"></i> Share on LinkedIn
              </a>
            </div>

            <Link
              to="/"
              style={{ color: "#64748b", textDecoration: "none", fontSize: "0.95rem" }}
            >
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

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    loading ||
                    !formData.name ||
                    !formData.password ||
                    formData.password !== formData.confirmPassword
                  }
                  style={{ width: "100%", marginTop: "20px" }}
                >
                  {loading ? "Submitting Application..." : "Submit Application"}
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
    </div>
  );
};

export default MemberSignup;
