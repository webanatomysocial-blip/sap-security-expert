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
const MembersOnlyPaywall = ({ children, rawContent = "" }) => {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();

  if (isLoggedIn) {
    return <>{children}</>;
  }

  const toc = extractTOC(rawContent);
  // rawContent is already server-truncated to the correct preview block count.
  const previewHtml = rawContent;

  return (
    <>
      {/* Preview — N block elements then hard cut */}
      <div
        className="members-content-preview"
        style={{ maxHeight: "none", WebkitMaskImage: "none", maskImage: "none" }}
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />

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
      <div className="members-paywall-overlay" style={{ position: "relative", marginTop: 0 }}>
        <div className="members-paywall-gradient" />
        <div className="members-paywall-card paywall-card-redesigned">
          <div className="paywall-icon-container">
            <div className="paywall-ring paywall-ring-1" />
            <div className="paywall-ring paywall-ring-2" />
            <div className="paywall-ring paywall-ring-3">
              <i className="bi bi-star"></i>
            </div>
          </div>
          <div className="paywall-badge">Exclusive Article</div>
          <h2 className="paywall-heading-redesigned">Members-only article</h2>
          <p className="paywall-subtext-redesigned">
            This article is reserved for registered members. Create a free account to read it in full · no credits, no charge, just a quick sign-up.
          </p>

          <button
            className="paywall-primary-btn"
            onClick={() => navigate("/member/signup")}
          >
            Register free to read <span>→</span>
          </button>

          <p className="paywall-login-text">
            Already a member?
            <button
              className="paywall-login-btn-pill"
              onClick={() => navigate("/member/login", { state: { from: window.location.pathname + window.location.search } })}
            >
              Log in
            </button>
          </p>

          <hr className="paywall-divider-redesigned" />

          <div className="paywall-features-container">
            <div className="paywall-features-row">
              <div className="paywall-feature-item">
                <span className="paywall-feature-tick">✓</span> Always free
              </div>
              <div className="paywall-feature-item">
                <span className="paywall-feature-tick">✓</span> No credit card
              </div>
              <div className="paywall-feature-item">
                <span className="paywall-feature-tick">✓</span> Instant access
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MembersOnlyPaywall;
