import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import "../css/ContactForm.css"; // Reuse existing clean form styles

const MemberLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
        // 1. Log in as a member (frontend)
        memberLogin(res.data.member, res.data.token, res.data.is_contributor);

        // 2. If it's a contributor, also log in to the admin/dashboard side
        if (res.data.is_contributor) {
            adminSetAuth({
                user: res.data.admin_user,
                role: res.data.admin_user.role,
                permissions: res.data.permissions,
                csrf_token: res.data.csrf_token
            });
            addToast("Welcome back! Redirecting to Dashboard...", "success");
            navigate("/admin", { replace: true });
            return;
        }

        addToast("Welcome back!", "success");
        
        // Intelligent redirect: If coming from reset/forgot flow, go to home
        if (location.state?.fromAuth) {
          navigate("/", { replace: true });
        } else {
          // Fallback to home if no history
          navigate("/", { replace: true });
        }
      } else {
        addToast(res.data.message || "Invalid email or password", "error");
      }
    } catch (err) {
      addToast(
        err.response?.data?.message ||
          err.message ||
          "An error occurred during login.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="contact-form-container"
      style={{ paddingTop: "80px", minHeight: "80vh" }}
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
  );
};

export default MemberLogin;
