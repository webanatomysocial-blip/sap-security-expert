import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * AdminSidebar — Dynamic nav based on role and permissions.
 * Props:
 *   onLogout: () => void
 *   role: "admin" | "contributor"
 *   permissions: { can_manage_blogs, can_manage_ads, can_manage_comments, can_manage_announcements }
 */
const AdminSidebar = ({
  onLogout,
  role = "admin",
  permissions = {},
  badges = {},
  isCollapsed = false,
  onToggle = () => {},
  isMobileOpen = false,
  onMobileClose = () => {},
}) => {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;
  const isAdmin = role === "admin";

  // Full admin nav
  const adminNavItems = [
    { label: "Dashboard", path: "/admin", icon: "bi-grid-fill" },
    {
      label: "Manage Users",
      path: "/admin/users",
      icon: "bi-person-check-fill",
      badge: badges.pendingMembers,
    },
    {
      label: "Manage Contributors",
      path: "/admin/contributors",
      icon: "bi-people-fill",
      badge: badges.pendingContributors,
    },
    {
      label: "Manage Blogs",
      path: "/admin/blogs",
      icon: "bi-layout-text-window-reverse",
    },
    {
      label: "Featured Insights",
      path: "/admin/featured-insights",
      icon: "bi-star-fill",
    },
    {
      label: "Blog Review",
      path: "/admin/blog-review",
      icon: "bi-hourglass-split",
      badge: badges.pendingReviews,
    },
    { label: "News & Updates", path: "/admin/news", icon: "bi-newspaper" },
    { label: "Learning Hub", path: "/admin/learnings", icon: "bi-journal-bookmark-fill" },
    { label: "Manage Ads & Promos", path: "/admin/ads", icon: "bi-images" },
    {
      label: "Manage Comments",
      path: "/admin/comments",
      icon: "bi-chat-left-text-fill",
      badge: badges.pendingComments,
    },
    {
      label: "Manage Announcements",
      path: "/admin/announcements",
      icon: "bi-megaphone-fill",
    },
    {
      label: "Bundles & Coupons",
      path: "/admin/bundles",
      icon: "bi-stack",
    },
  ];

  // Contributor sees only their permitted modules
  const contributorNavItems = [
    { label: "Dashboard", path: "/admin", icon: "bi-grid-fill", always: true },
    ...(permissions.can_manage_blogs
      ? [
          {
            label: "My Blogs",
            path: "/admin/blogs",
            icon: "bi-layout-text-window-reverse",
          },
        ]
      : []),
    ...(permissions.can_manage_ads
      ? [{ label: "Manage Ads", path: "/admin/ads", icon: "bi-images" }]
      : []),
    ...(permissions.can_manage_comments
      ? [
          {
            label: "Comments",
            path: "/admin/comments",
            icon: "bi-chat-left-text-fill",
            badge: badges.pendingComments,
          },
        ]
      : []),
    ...(permissions.can_manage_announcements
      ? [
          {
            label: "Announcements",
            path: "/admin/announcements",
            icon: "bi-megaphone-fill",
          },
        ]
      : []),
    ...(permissions.can_review_blogs
      ? [
          {
            label: "Blog Review",
            path: "/admin/blog-review",
            icon: "bi-hourglass-split",
            badge: badges.pendingReviews,
          },
        ]
      : []),
  ];

  const navItems = isAdmin ? adminNavItems : contributorNavItems;

  return (
    <aside className={`admin-sidebar${isMobileOpen ? " mobile-open" : ""}`}>
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand">
          <img
            src={
              isCollapsed ? "/fav.png" : "/assets/sapsecurityexpert-white.png"
            }
            alt="SAP Security Expert"
            className={`sidebar-logo ${isCollapsed ? "collapsed-logo" : ""}`}
            style={isCollapsed ? { filter: "none" } : {}}
          />
        </Link>
      </div>

      {!isAdmin && (
        <div
          style={{
            padding: "6px 16px 12px",
            fontSize: "0.7rem",
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontWeight: 600,
          }}
        >
          Contributor Portal
        </div>
      )}

      <nav className="sidebar-nav" data-lenis-prevent>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={onMobileClose}
            className={`nav-item1 ${isActive(item.path) ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              // justifyContent: "space-between",
              // paddingRight: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <i
                className={`bi ${item.icon}`}
                style={{ marginRight: isCollapsed ? "0" : "10px" }}
              ></i>
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {item.badge > 0 && (
              <span
                className="badge-count"
                style={
                  isCollapsed
                    ? {
                        background: "#ef4444",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        position: "absolute",
                        top: "14px",
                        right: "10px",
                        border: "1.5px solid var(--slate-900)",
                        display: "block",
                      }
                    : {
                        background: "#ef4444",
                        color: "#fff",
                        borderRadius: "12px",
                        padding: "2px 8px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        minWidth: "12px",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }
                }
              >
                {!isCollapsed && item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-toggle-btn"
          style={{ width: "100%" }}
          onClick={onToggle}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <i className={`bi bi-chevron-${isCollapsed ? "right" : "left"}`}></i>
          {!isCollapsed && (
            <span style={{ marginLeft: "10px" }}>Collapse Sidebar</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
