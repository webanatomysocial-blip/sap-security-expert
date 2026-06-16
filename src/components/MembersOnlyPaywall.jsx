import React from "react";
import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";
// next-disabled: import "../css/members-paywall.css";
/**
 * MembersOnlyPaywall
 *
 * For logged-out users:
 *   - Shows only the first ~1 paragraph of content (via CSS max-height + fade)
 *   - Displays a lock card with Login / Sign Up buttons beneath the preview
 *
 * For logged-in members:
 *   - Renders children normally with no restriction.
 *
 * Usage:
 *   <MembersOnlyPaywall>
 *     <YourContent />
 *   </MembersOnlyPaywall>
 */
const MembersOnlyPaywall = ({ children }) => {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();

  // If logged in, render children normally with no restriction
  if (isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Show a short preview of the content — clipped to ~1 paragraph height */}
      <div className="members-content-preview">{children}</div>

      {/* Paywall overlay */}
      <div className="members-paywall-overlay">
        <div className="members-paywall-gradient" />
        <div className="members-paywall-card">
          <div className="members-paywall-lock-icon">
            <i className="bi bi-lock-fill"></i>
          </div>
          <h2 className="members-paywall-heading">
            Exclusive Members-Only Content
          </h2>
          <p className="members-paywall-subtext">
            Become part of our expert community to unlock exclusive SAP Security
            & GRC insights, in-depth technical guides, and members-only
            intelligence.
          </p>
          <div className="members-paywall-actions">
            <button
              className="members-paywall-btn-login"
              onClick={() => navigate("/member/login", { state: { from: window.location.pathname + window.location.search } })}
            >
              Log In
            </button>
            <button
              className="members-paywall-btn-signup"
              onClick={() => navigate("/member/signup")}
            >
              Sign Up — It&apos;s Free
            </button>
          </div>
          <p className="members-paywall-note">
            Already signed up? Your account will be reviewed and approved within
            24 hours.
          </p>
        </div>
      </div>
    </>
  );
};

export default MembersOnlyPaywall;
