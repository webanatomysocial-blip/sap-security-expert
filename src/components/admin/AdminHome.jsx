import React, { useState, useEffect } from "react";
// next-disabled: import "../../css/AdminDashboard.css";
// next-disabled: import "../../css/admin-profile.css";
import { LuShieldCheck, LuKey } from "react-icons/lu";
import ResetPasswordModal from "./ResetPasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getAdminStats } from "../../services/api";

import ContributorDashboard from "./ContributorDashboard";

const AdminHome = () => {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  if (!isAdmin) {
    return <ContributorDashboard />;
  }

  const [stats, setStats] = useState({
    contributors: 0,
    pending_contributors: 0,
    pending_reviews: 0,
    pending_comments: 0,
    blogs: 0,
    total_views: 0,
    approved_members: 0,
    pending_members: 0,
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchStats = async () => {
      try {
        const res = await getAdminStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
  }, [isAdmin]);

  const formatNum = (n) => (n > 9999 ? (n / 1000).toFixed(1) + "k" : n);

  const statCards = [
    {
      icon: "bi-people",
      value: stats.contributors,
      label: "Contributors",
      color: "#1e293b",
    },
    {
      icon: "bi-hourglass-split",
      value: stats.pending_reviews,
      label: "Blog Reviews",
      color: "#1e293b",
    },
    {
      icon: "bi-chat-left-text",
      value: stats.pending_comments,
      label: "Pending Comments",
      color: "#1e293b",
    },
    {
      icon: "bi-file-earmark-text",
      value: stats.blogs,
      label: "Total Blogs",
      color: "#1e293b",
    },
    {
      icon: "bi-person-badge",
      value: stats.approved_members,
      label: "Members",
      color: "#1e293b",
    },
    {
      icon: "bi-eye",
      value: stats.total_views,
      label: "Total Views",
      color: "#1e293b",
    },
  ];

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <h3>Dashboard Overview</h3>
      </div>

      <div className="admin-card">
        <div className="dashboard-grid">
          {statCards.map((card) => (
            <div className="stat-card" key={card.label}>
              <div className="stat-icon" style={{ color: card.color }}>
                <i className={`bi ${card.icon}`}></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{formatNum(card.value)}</span>
                <span className="stat-label">{card.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="dashboard-grid"
        style={{
          gridTemplateColumns: "1fr auto",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div className="admin-card" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 8px", fontSize: "1rem", color: "#1e293b" }}>
            Welcome to the SAP Security Expert Admin Panel
          </h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
            Select a module from the sidebar to confirm approvals or manage
            content.
          </p>
        </div>

        <div className="security-settings-card" style={{ minWidth: 240 }}>
          <div className="security-title">
            <LuShieldCheck />
            Security Settings
          </div>
          <p>Keep your account secure by updating your password regularly.</p>
          <button
            className="btn-reset-pw"
            onClick={() => setShowPasswordModal(true)}
          >
            <LuKey /> Reset Password
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <ResetPasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
};

export default AdminHome;
