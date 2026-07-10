import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import "../css/ContactForm.css";
import "../css/MemberLogin.css";

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
  const { login: memberLogin, isLoggedIn } = useMemberAuth();
  const { setAuth: adminSetAuth } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Already signed in — don't show the login form again, just send them
  // straight to where they were headed (or the homepage). Skipped while the
  // contributor choice modal is up: memberLogin() sets isLoggedIn=true
  // immediately on submit (before we know if they're a contributor), so
  // without this guard the redirect fires instantly and the modal never
  // gets a chance to be seen.
  useEffect(() => {
    if (isLoggedIn && !contributorChoice) {
      const returnTo = location.state?.fromAuth ? "/" : (location.state?.from || "/");
      navigate(returnTo, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, contributorChoice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { memberLogin: apiMemberLogin } = await import("../services/api");
      const res = await apiMemberLogin({ email, password });

      if (res.data.status === "success" && res.data.member) {
        memberLogin(res.data.member, res.data.is_contributor, res.data.csrf_token);

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
    <div className="login-page-wrapper">
      <Helmet>
        <title>Member Login | SAP Security Expert</title>
      </Helmet>

      <div className="login-page-container">
        <div className="login-split-grid">
          {/* LEFT SIDE: Welcome Content */}
          <div className="login-info-side">
            <h2>Welcome Back!</h2>
            <div className="login-accent-line"></div>
            <p className="login-info-desc">
              Log in to access exclusive SAP security content, tools, and community insights.
            </p>

            <div className="login-features-list">
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper blue">
                  <i className="bi bi-journal-check"></i>
                </div>
                <div className="login-feature-text">
                  <h4>Exclusive Content</h4>
                  <p>In-depth articles, research, and member-only resources.</p>
                </div>
              </div>

              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper orange">
                  <i className="bi bi-people-fill"></i>
                </div>
                <div className="login-feature-text">
                  <h4>Expert Community</h4>
                  <p>Connect with SAP security professionals worldwide.</p>
                </div>
              </div>
              <div className="login-feature-item">
                <div className="login-feature-icon-wrapper green">
                  <i className="bi bi-shield-lock-fill"></i>
                </div>
                <div className="login-feature-text">
                  <h4>Secure & Trusted</h4>
                  <p>Your privacy and data security are our top priority.</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Login Card */}
          <div className="login-form-side">
            <form className="login-card-form" onSubmit={handleSubmit}>
              <div className="login-lock-badge">
                <i className="bi bi-lock-fill"></i>
              </div>
              <h3>Member Login</h3>
              <p className="login-subtitle">Access exclusive SAP security content and insights.</p>

              <div className="login-form-group">
                <label className="login-label">Email or Username</label>
                <div className="login-input-wrapper">
                  <i className="bi bi-person login-input-icon"></i>
                  <input
                    type="text"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="username or you@example.com"
                  />
                </div>
              </div>

              <div className="login-form-group">
                <div className="login-form-header-row">
                  <label className="login-label">Password</label>
                  <Link to="/forgot-password" className="login-forgot-link">
                    Forgot Password?
                  </Link>
                </div>
                <div className="login-input-wrapper">
                  <i className="bi bi-lock login-input-icon"></i>
                  <input
                    type="password"
                    className="login-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="login-remember-row">
                <label className="login-checkbox-label">
                  <input type="checkbox" className="login-checkbox-input" defaultChecked />
                  Remember me
                </label>
              </div>

              <button
                type="submit"
                className="login-btn-submit"
                disabled={loading || !email || !password}
              >
                {loading ? "Signing In..." : "Sign In"}{" "}
                <i className="bi bi-arrow-right"></i>
              </button>



              <div className="login-signup-prompt">
                Don't have an account? <Link to="/member/signup">Sign up for free</Link>
              </div>
            </form>
          </div>
        </div>

        {/* BOTTOM: Trust Callouts */}
        <div className="login-trust-bar">
          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-shield-check"></i>
            </div>
            <div className="login-trust-text">
              <h5>Expert Curated</h5>
              <p>Quality content by industry experts</p>
            </div>
          </div>

          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-person-check-fill"></i>
            </div>
            <div className="login-trust-text">
              <h5>Trusted by Professionals</h5>
              <p>Join 10,000+ SAP security experts</p>
            </div>
          </div>

          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-arrow-repeat"></i>
            </div>
            <div className="login-trust-text">
              <h5>Always Updated</h5>
              <p>Stay ahead with the latest insights</p>
            </div>
          </div>

          <div className="login-trust-item">
            <div className="login-trust-icon-box">
              <i className="bi bi-award"></i>
            </div>
            <div className="login-trust-text">
              <h5>Make an Impact</h5>
              <p>Contribute and grow your reputation</p>
            </div>
          </div>
        </div>


      </div>
    </div>
    </>
  );
};

export default MemberLogin;
