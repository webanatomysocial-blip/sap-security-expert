import { useNavigate } from "react-router-dom";
import { useMemberAuth } from "../context/MemberAuthContext";

function extractTOC(html) {
  if (!html) return [];
  const re = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const items = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    if (text) items.push({ level: parseInt(m[1]), text });
  }
  return items.slice(0, 8);
}
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
const MembersOnlyPaywall = ({ children, rawContent = "" }) => {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();

  if (isLoggedIn) {
    return <>{children}</>;
  }

  const toc = extractTOC(rawContent);

  return (
    <>
      {/* Preview — first ~20% of content */}
      <div className="members-content-preview">{children}</div>

      {/* TOC panel */}
      {toc.length > 0 && (
        <div className="content-toc-panel">
          <div className="content-toc-header">
            <i className="bi bi-list-ul" />
            <span>What&apos;s covered in this article</span>
          </div>
          <p className="content-toc-subtext">Sign in to access all sections below</p>
          <ul className="content-toc-list">
            {toc.map((item, i) => (
              <li key={i} className={`content-toc-item toc-h${item.level}`}>
                <i className="bi bi-check2" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Paywall card */}
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
