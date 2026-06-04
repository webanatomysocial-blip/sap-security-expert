import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import { Helmet } from "react-helmet-async";
import { resetWithToken } from "../services/api";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { addToast } = useToast();

    if (!token || !email) {
        return (
            <div style={{ padding: "100px 20px", textAlign: "center" }}>
                <h2>Invalid Reset Link</h2>
                <p>This password reset link is invalid or has expired.</p>
                <Link to="/forgot-password" style={{ color: "#3b82f6" }}>Request a new link</Link>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            addToast("Passwords do not match.", "error");
            return;
        }

        setLoading(true);
        try {
            const res = await resetWithToken(email, token, password);
            if (res.data.status === "success") {
                addToast("Password reset successfully!", "success");
                navigate("/member/login", { state: { fromAuth: true } });
            } else {
                addToast(res.data.message || "Failed to reset password.", "error");
            }
        } catch (err) {
            addToast(err.response?.data?.message || "Reset failed. Link may be expired.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "100px 20px", display: "flex", justifyContent: "center", background: "#f8fafc" }}>
            <Helmet><title>Reset Password | SAP Security Expert</title></Helmet>
            <div style={{ maxWidth: "400px", width: "100%", background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
                <h2 style={{ marginBottom: "16px" }}>Set New Password</h2>
                <p style={{ color: "#64748b", marginBottom: "32px" }}>Enter a new strong password for your account.</p>

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="8"
                            placeholder="Min 8 characters"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: "32px" }}>
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Repeat password"
                        />
                    </div>
                    <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
                        {loading ? "Updating..." : "Reset Password"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
