import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import "../css/ContactForm.css";

// Modal shown to contributors asking which area to enter
const ContributorChoiceModal = ({ username, onDashboard, onMember }) => createPortal(
  <div style={{
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
    backdropFilter: "blur(4px)", display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 9999, padding: 20,
  }}>
    <div style={{
      background: "#fff", borderRadius: 20, padding: "40px 36px",
      maxWidth: 440, width: "100%", textAlign: "center",
      boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)",
    }}>
      <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>👋</div>
      <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "#1e293b" }}>
        Welcome back, {username}!
      </h3>
      <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "0.9rem", lineHeight: 1.6 }}>
        You have a contributor account. Where would you like to go?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={onDashboard}
          style={{
            padding: "14px 20px", background: "#1e293b", color: "#fff",
            border: "none", borderRadius: 10, fontSize: "0.95rem",
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          ✍️ Go to Contributor Dashboard
        </button>
        <button
          onClick={onMember}
          style={{
            padding: "14px 20px", background: "#f8fafc", color: "#334155",
            border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: "0.95rem",
            fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          🌐 Continue as Member
        </button>
      </div>
    </div>
  </div>,
  document.body
);

const MemberLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [contributorChoice, setContributorChoice] = useState(null); // holds login response when contributor
  const { login: memberLogin } = useMemberAuth();
  const { setAuth: adminSetAuth } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { memberLogin: apiMemberLogin } = await import("../services/api");
      const res = await apiMemberLogin({ email, password });

      if (res.data.status === "success" && res.data.member) {
        memberLogin(res.data.member, res.data.token, res.data.is_contributor, res.data.subscription || null);

        if (res.data.is_contributor) {
          // Store response and show choice modal instead of auto-redirecting
          setContributorChoice(res.data);
          return;
        }

        addToast("Welcome back!", "success");
        const returnTo = location.state?.fromAuth ? "/" : (location.state?.from || "/");
        navigate(returnTo, { replace: true });
      } else {
        addToast(res.data.message || "Invalid email or password", "error");
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || err.message || "An error occurred during login.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = () => {
    adminSetAuth({
      user: contributorChoice.admin_user,
      role: contributorChoice.admin_user.role,
      permissions: contributorChoice.permissions,
      csrf_token: contributorChoice.csrf_token,
    });
    addToast("Welcome back! Redirecting to Dashboard...", "success");
    navigate("/admin", { replace: true });
  };

  const goToMember = () => {
    addToast("Welcome back!", "success");
    const returnTo = location.state?.fromAuth ? "/" : (location.state?.from || "/");
    navigate(returnTo, { replace: true });
  };

  return (
    <>
    {contributorChoice && (
      <ContributorChoiceModal
        username={contributorChoice.member?.full_name || contributorChoice.member?.username}
        onDashboard={goToDashboard}
        onMember={goToMember}
      />
    )}
    <div
      className="contact-form-container"
      style={{ minHeight: "80vh" }}
    >
      <Helmet>
        <title>Member Login | SAP Security Expert</title>
      </Helmet>

      <div className="contact-form-header">
        <h2>Member Login</h2>
        <p>Access exclusive SAP security content and insights.</p>
      </div>

      <form
        className="contact-form"
        onSubmit={handleSubmit}
        style={{
          maxWidth: "450px",
          margin: "0 auto",
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
        }}
      >
        <div className="form-group" style={{ marginBottom: "20px" }}>
          <label className="form-label">Email or Username *</label>
          <input
            type="text"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            placeholder="Username or you@example.com"
          />
        </div>

        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Password *</label>
            <Link to="/forgot-password" style={{ fontSize: "0.85rem", color: "#3b82f6", textDecoration: "none", fontWeight: "500" }}>
              Forgot Password?
            </Link>
          </div>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !email || !password}
          style={{ width: "100%", marginTop: "10px" }}
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid #eee",
          }}
        >
          <p style={{ color: "#64748b", fontSize: "0.95rem" }}>
            Don't have an account?{" "}
            <Link
              to="/member/signup"
              style={{
                color: "#3b82f6",
                textDecoration: "none",
                fontWeight: "600",
              }}
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </form>
    </div>
    </>
  );
};

export default MemberLogin;
