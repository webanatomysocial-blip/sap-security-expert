import React, { useState, useEffect } from "react";
import {
  LuFileText,
  LuPlus,
  LuImage,
  LuMessageSquare,
  LuMegaphone,
  LuClockAlert,
  LuEye,
  LuLayoutGrid,
  LuShieldCheck,
  LuKey,
  LuHourglass,
} from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
// next-disabled: import "../../css/AdminDashboard.css";
import { getContributorStats } from "../../services/api";
import ResetPasswordModal from "./ResetPasswordModal";

/**
 * ContributorDashboard
 * Shows a dynamic card-based dashboard with analytics for the contributor.
 */
const ContributorDashboard = () => {
  const { permissions, user } = useAuth();
  const navigate = useNavigate();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    total_views: 0,
    total_comments: 0,
    pending_reviews: 0,
    total_ads: 0,
    pending_comments: 0,
    rejected_comments: 0,
    total_announcements: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatsData = async () => {
      setLoading(true);
      try {
        const res = await getContributorStats();
        if (res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    const canSeeStats =
      permissions.can_manage_blogs ||
      permissions.can_manage_ads ||
      permissions.can_manage_comments ||
      permissions.can_manage_announcements ||
      permissions.can_review_blogs;

    if (canSeeStats) {
      fetchStatsData();
    } else {
      setLoading(false);
    }
  }, [permissions]);

  const hasAnyPermission = Object.values(permissions).some(Boolean);

  return (
    <div className="admin-page-wrapper">
      <div className="page-header">
        <div>
          <h2 style={{ margin: 0 }}>
            Welcome, {user?.username || "Contributor"}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              color: "#64748b",
              fontSize: "0.875rem",
            }}
          >
            Your contributor dashboard
          </p>
        </div>
      </div>

      {!hasAnyPermission ? (
        <div
          className="admin-card"
          style={{ textAlign: "center", padding: "48px 24px" }}
        >
          <LuClockAlert
            style={{ fontSize: 40, color: "#94a3b8", marginBottom: 12 }}
          />
          <h3 style={{ color: "#334155", marginBottom: 8, fontSize: "1rem" }}>
            No Permissions Assigned
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.875rem", margin: 0 }}>
            Your account is active but you have not been assigned any
            permissions yet. Please contact the administrator.
          </p>
        </div>
      ) : (
        <>
          {/* Blog Analytics Card */}
          {permissions.can_manage_blogs && (
            <div
              className="admin-card"
              style={{ padding: "24px", marginBottom: 20 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <LuLayoutGrid style={{ fontSize: 18, color: "#1e293b" }} />
                <h3 style={{ margin: 0, fontSize: "1rem", color: "#1e293b" }}>
                  Blog Analytics
                </h3>
              </div>

              {loading ? (
                <p style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                  Loading stats...
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 16,
                  }}
                >
                  {/* Blog Metrics */}
                  {[
                    {
                      value: stats.total,
                      label: "Total Blogs",
                      color: "#1e293b",
                      show: permissions.can_manage_blogs,
                    },
                    {
                      value: stats.approved,
                      label: "Published",
                      color: "#1e293b",
                      show: permissions.can_manage_blogs,
                    },
                    {
                      value: stats.rejected,
                      label: "Rejected Content",
                      color: "#dc2626",
                      show: permissions.can_manage_blogs,
                    },
                    {
                      value: stats.total_views,
                      label: "Total Views",
                      color: "#1e293b",
                      show: permissions.can_manage_blogs,
                    },
                    {
                      value: stats.total_comments,
                      label: "Comments",
                      color: "#1e293b",
                      show: permissions.can_manage_blogs,
                    },
                    // Expanded Metrics based on Permissions
                    {
                      value: stats.pending_reviews,
                      label: "Pending Reviews",
                      color: "#1e293b",
                      show: permissions.can_review_blogs,
                    },
                    {
                      value: stats.pending_comments,
                      label: "Pending Comments",
                      color: "#1e293b",
                      show: permissions.can_manage_comments,
                    },
                    {
                      value: stats.rejected_comments,
                      label: "Rejected Comments",
                      color: "#dc2626",
                      show: permissions.can_manage_comments,
                    },
                    {
                      value: stats.total_announcements,
                      label: "Announcements",
                      color: "#1e293b",
                      show: permissions.can_manage_announcements,
                    },
                  ]
                    .filter((s) => s.show)
                    .map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          padding: "14px 16px",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "1.75rem",
                            fontWeight: 800,
                            color: "#1e293b",
                            lineHeight: 1,
                          }}
                        >
                          {s.value}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "#64748b",
                            fontWeight: 600,
                            marginTop: 4,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {s.label}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {permissions.can_manage_blogs && (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginTop: 20,
                      paddingTop: 16,
                      borderTop: "1px solid #f1f5f9",
                    }}
                  >
                    <Link
                      to="/admin/blogs"
                      className="btn-primary"
                      style={{
                        padding: "10px 18px",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        height: "42px",
                      }}
                    >
                      <LuFileText /> My Blogs
                    </Link>
                    <button
                      className="btn-secondary"
                      onClick={() => navigate("/admin/blogs?new=1")}
                      style={{
                        padding: "10px 18px",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        height: "42px",
                      }}
                    >
                      <LuPlus /> New Blog
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      margin: "10px 0 0",
                    }}
                  >
                    Your blogs require admin approval before publishing.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Security & Quick Actions */}
          <div
            className="dashboard-grid"
            style={{
              gridTemplateColumns: "1fr auto",
              gap: 20,
              alignItems: "stretch",
              marginBottom: 20,
            }}
          >
            <div className="admin-card" style={{ padding: "24px", height: "100%", boxSizing: "border-box" }}>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "1rem",
                  color: "#1e293b",
                }}
              >
                Quick Navigation
              </h3>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                Use the quick links below or the sidebar to navigate to your
                assigned modules.
              </p>
            </div>

            <div className="security-settings-card" style={{ minWidth: 260, height: "100%", boxSizing: "border-box" }}>
              <div className="security-title">
                <LuShieldCheck />
                Security Settings
              </div>
              <p>
                Keep your account secure by updating your password regularly.
              </p>
              <button
                className="btn-reset-pw"
                onClick={() => setShowPasswordModal(true)}
              >
                <LuKey /> Reset Password
              </button>
            </div>
          </div>

          {/* Other module cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "16px",
            }}
          >
            {permissions.can_manage_ads && (
              <div className="admin-card contributor-module-card">
                <div className="module-card-header">
                  <div
                    className="module-icon-wrap"
                    style={{ background: "#f8fafc" }}
                  >
                    <LuImage style={{ color: "#1e293b" }} />
                  </div>
                  <h4>Manage Ads</h4>
                </div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.875rem",
                    margin: "0 0 16px",
                  }}
                >
                  Upload and manage advertisement banners.
                </p>
                <div className="module-actions module-card-btn">
                  <Link
                    to="/admin/ads"
                    className="btn-primary"
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                    }}
                  >
                    <LuImage /> Go to Ads
                  </Link>
                </div>
              </div>
            )}

            {permissions.can_manage_comments && (
              <div className="admin-card contributor-module-card">
                <div className="module-card-header">
                  <div
                    className="module-icon-wrap"
                    style={{ background: "#f8fafc" }}
                  >
                    <LuMessageSquare style={{ color: "#1e293b" }} />
                  </div>
                  <h4>Comment Moderation</h4>
                </div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.875rem",
                    margin: "0 0 16px",
                  }}
                >
                  Approve, reject, or manage reader comments.
                </p>
                <div className="module-actions module-card-btn">
                  <Link
                    to="/admin/comments"
                    className="btn-primary"
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                    }}
                  >
                    <LuMessageSquare /> Go to Comments
                  </Link>
                </div>
              </div>
            )}

            {permissions.can_manage_announcements && (
              <div className="admin-card contributor-module-card">
                <div className="module-card-header">
                  <div
                    className="module-icon-wrap"
                    style={{ background: "#f8fafc" }}
                  >
                    <LuMegaphone style={{ color: "#1e293b" }} />
                  </div>
                  <h4>Announcements</h4>
                </div>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "0.875rem",
                    margin: "0 0 16px",
                  }}
                >
                  Create and publish announcements to the community.
                </p>
                <div className="module-actions module-card-btn">
                  <Link
                    to="/admin/announcements"
                    className="btn-primary"
                    style={{
                      padding: "8px 16px",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                    }}
                  >
                    <LuMegaphone /> Go to Announcements
                  </Link>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {showPasswordModal && (
        <ResetPasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
        />
      )}
    </div>
  );
};

export default ContributorDashboard;
