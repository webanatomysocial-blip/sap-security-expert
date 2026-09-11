import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import AmbassadorBadge, { downloadBadgeImage } from "../components/AmbassadorBadge";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getAmbassadorMemberProfile } from "../services/api";
import "../css/AmbassadorMemberPage.css";

export default function AmbassadorMemberPage() {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/member/login?return=/member/ambassador");
      return;
    }
    getAmbassadorMemberProfile()
      .then((res) => setProfile(res.data.ambassador))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load your Ambassador profile."))
      .finally(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "65vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#64748b" }}>
        <div className="spinner-border text-primary" role="status" style={{ width: 40, height: 40, color: "#ee5e42" }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <p style={{ fontWeight: 600, fontSize: "0.95rem" }}>Loading your Country Ambassador Dashboard…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center", padding: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>
          <i className="bi bi-exclamation-triangle-fill" />
        </div>
        <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.3rem" }}>Ambassador Profile Not Found</h2>
        <p style={{ color: "#64748b", maxWidth: 460, margin: 0, lineHeight: 1.6 }}>{error || "This member account is not currently registered as an approved Country Ambassador."}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <Link to="/" className="amb-btn-primary" style={{ textDecoration: "none" }}>Go Home</Link>
          <Link to="/become-a-country-ambassador" className="amb-btn-secondary" style={{ textDecoration: "none", color: "#0f172a", border: "1px solid #cbd5e1" }}>Apply as Ambassador</Link>
        </div>
      </div>
    );
  }

  const parseTags = (val) => {
    let obj = val || {};
    if (typeof obj === "string") {
      try { obj = JSON.parse(obj); } catch { obj = {}; }
    }
    return Array.isArray(obj) ? obj : Object.keys(obj).filter((k) => obj[k]);
  };
  const expertiseTags = parseTags(profile.expertise);
  const communityContributionTags = parseTags(profile.community_contribution);
  const ambassadorMotivationTags = parseTags(profile.ambassador_motivations);

  const handleShareLinkedIn = () => {
    const shareUrl = encodeURIComponent("https://sapsecurityexpert.com/become-a-country-ambassador");
    const shareText = encodeURIComponent(`Honored to be recognized as an official SAP Security Expert Country Ambassador for ${profile.country || "my region"}! 🏅 Check out our global community leadership program:`);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}&summary=${shareText}`, "_blank", "width=600,height=600");
  };

  return (
    <div className="amb-member-page">
      <SEO title={`${profile.full_name || "Ambassador"} | Country Ambassador Dashboard`} />

      {/* Hero Banner */}
      <section className="amb-hero-banner">
        <div className="amb-hero-container">
          <div className="amb-hero-top">
            <div className="amb-hero-identity">
              <div className="amb-avatar-wrapper">
                {profile.image ? (
                  <img src={profile.image} alt={profile.full_name} className="amb-avatar-img" />
                ) : (
                  <div className="amb-avatar-fallback">
                    {(profile.full_name || "A")[0].toUpperCase()}
                  </div>
                )}
                <div className="amb-verified-badge-icon" title="Verified Ambassador">
                  <i className="bi bi-patch-check-fill" />
                </div>
              </div>
              <div className="amb-hero-info">
                <span className="amb-badge-tag">
                  <i className="bi bi-award-fill" /> Official Country Ambassador
                </span>
                <h1 className="amb-name">{profile.full_name}</h1>
                <div className="amb-meta-text">
                  <span className="amb-meta-item">
                    <i className="bi bi-geo-alt-fill" style={{ color: "#ee5e42" }} />
                    {profile.country ? `${profile.country}` : "Global Member"}
                  </span>
                  {profile.organization && (
                    <>
                      <span>•</span>
                      <span className="amb-meta-item">
                        <i className="bi bi-building" style={{ color: "#cbd5e1" }} />
                        {profile.organization}
                      </span>
                    </>
                  )}
                  {profile.current_role && (
                    <>
                      <span>•</span>
                      <span className="amb-meta-item">
                        <i className="bi bi-person-badge" style={{ color: "#cbd5e1" }} />
                        {profile.current_role}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="amb-hero-actions">
              <Link to="/member/settings" className="amb-btn-primary">
                <i className="bi bi-gear-fill" /> Profile Settings
              </Link>
              <button type="button" onClick={handleShareLinkedIn} className="amb-btn-secondary">
                <i className="bi bi-linkedin" style={{ color: "#0a66c2" }} /> Share Recognition
              </button>
            </div>
          </div>

          {/* Stats Strip */}
          <div className="amb-stats-strip">
            <div className="amb-stat-box">
              <div className="amb-stat-icon">
                <i className="bi bi-award" />
              </div>
              <div>
                <p className="amb-stat-val">{profile.badge_year || "2026"}</p>
                <p className="amb-stat-lbl">Active Badge Year</p>
              </div>
            </div>

            <div className="amb-stat-box">
              <div className="amb-stat-icon" style={{ background: "rgba(238, 94, 66, 0.15)", color: "#ee5e42" }}>
                <i className="bi bi-globe-americas" />
              </div>
              <div>
                <p className="amb-stat-val">{profile.country || "USA"}</p>
                <p className="amb-stat-lbl">Represented Region</p>
              </div>
            </div>

            <div className="amb-stat-box">
              <div className="amb-stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                <i className="bi bi-shield-check" />
              </div>
              <div>
                <p className="amb-stat-val">Active</p>
                <p className="amb-stat-lbl">Ambassador Status</p>
              </div>
            </div>

            <div className="amb-stat-box">
              <div className="amb-stat-icon" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#6366f1" }}>
                <i className="bi bi-clock-history" />
              </div>
              <div>
                <p className="amb-stat-val">{profile.badge_history?.length || 1} Year{(profile.badge_history?.length || 1) > 1 ? "s" : ""}</p>
                <p className="amb-stat-lbl">Honors Awarded</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="amb-main-layout">
        {/* Left Sidebar: Official Badge */}
        <aside className="amb-sidebar-card">
          <h2 className="amb-sidebar-title">
            <i className="bi bi-patch-check-fill" style={{ color: "#f59e0b" }} />
            Official Recognition Badge
          </h2>

          <div className="amb-badge-container">
            {profile.has_badge ? (
              <>
                <AmbassadorBadge country={profile.country} year={profile.badge_year} size={250} />
                <button
                  type="button"
                  className="amb-download-btn"
                  onClick={() => downloadBadgeImage(profile.country, profile.badge_year)}
                >
                  <i className="bi bi-download" /> Download High-Res Badge
                </button>
              </>
            ) : (
              <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 12, padding: 24, textAlign: "center", color: "#64748b", fontSize: "0.88rem", lineHeight: 1.6 }}>
                <i className="bi bi-hourglass-split" style={{ fontSize: "1.6rem", color: "#f59e0b", display: "block", marginBottom: 8 }} />
                Your Country Ambassador profile is approved. Yearly badges are issued separately by the SAP Security Expert administration.
              </div>
            )}

            {profile.badge_history?.length > 0 && (
              <div className="amb-history-box">
                <h3 className="amb-history-title">Badge History</h3>
                <div className="amb-history-pills">
                  {profile.badge_history.map((h) => (
                    <span key={h.badge_year} className="amb-history-pill">
                      <i className="bi bi-award-fill" style={{ color: "#f59e0b" }} />
                      {h.badge_year}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Column: Application Details & Responses */}
        <main className="amb-content-col">
          {/* Details Card */}
          <section className="amb-card">
            <div className="amb-card-header">
              <h2 className="amb-card-title">
                <i className="bi bi-person-vcard" /> Ambassador Profile & Background
              </h2>
            </div>

            <div className="amb-details-grid">
              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-envelope" /> Email Address</span>
                <p className="amb-detail-value">{profile.email || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-linkedin" /> LinkedIn Profile</span>
                <p className="amb-detail-value">
                  {profile.linkedin ? (
                    <a href={profile.linkedin} target="_blank" rel="noreferrer" className="amb-detail-link">
                      View Profile <i className="bi bi-box-arrow-up-right" style={{ fontSize: "0.75rem" }} />
                    </a>
                  ) : "—"}
                </p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-building" /> Organization</span>
                <p className="amb-detail-value">{profile.organization || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-briefcase" /> Current Role</span>
                <p className="amb-detail-value">{profile.current_role || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-geo-alt" /> Location</span>
                <p className="amb-detail-value">{[profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-clock-history" /> Experience</span>
                <p className="amb-detail-value">{profile.years_experience || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-people" /> Mentorship Experience</span>
                <p className="amb-detail-value">{profile.mentorship_experience || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-heart-pulse" /> Help Frequency</span>
                <p className="amb-detail-value">{profile.community_helping_frequency || "—"}</p>
              </div>

              <div className="amb-detail-item">
                <span className="amb-detail-label"><i className="bi bi-hand-thumbs-up" /> Contribution Willingness</span>
                <p className="amb-detail-value">{profile.contribution_willingness || "—"}</p>
              </div>
            </div>

            {/* Expertise & Tags */}
            {expertiseTags.length > 0 && (
              <div className="amb-tags-group">
                <h3 className="amb-tags-label">Areas of Expertise</h3>
                <div className="amb-tags-wrapper">
                  {expertiseTags.map((tag) => (
                    <span key={tag} className="amb-tag-chip">
                      {tag.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {communityContributionTags.length > 0 && (
              <div className="amb-tags-group">
                <h3 className="amb-tags-label">Community Contribution Channels</h3>
                <div className="amb-tags-wrapper">
                  {communityContributionTags.map((tag) => (
                    <span key={tag} className="amb-tag-chip" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#b45309" }}>
                      {tag.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ambassadorMotivationTags.length > 0 && (
              <div className="amb-tags-group">
                <h3 className="amb-tags-label">Ambassador Motivations</h3>
                <div className="amb-tags-wrapper">
                  {ambassadorMotivationTags.map((tag) => (
                    <span key={tag} className="amb-tag-chip" style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", color: "#047857" }}>
                      {tag.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Detailed Responses Card */}
          {(profile.motivation || profile.contribution_examples || profile.country_challenge || profile.ambassador_definition || profile.other_motivation_text || profile.contribution_links) && (
            <section className="amb-card">
              <div className="amb-card-header">
                <h2 className="amb-card-title">
                  <i className="bi bi-journal-text" /> Application Statements & Vision
                </h2>
              </div>

              <div className="amb-answers-container">
                {profile.motivation && (
                  <div className="amb-answer-card">
                    <h3 className="amb-answer-label">Contribution Plan & Goals</h3>
                    <p className="amb-answer-body">{profile.motivation}</p>
                  </div>
                )}

                {profile.contribution_examples && (
                  <div className="amb-answer-card">
                    <h3 className="amb-answer-label">Community Initiative Example</h3>
                    <p className="amb-answer-body">{profile.contribution_examples}</p>
                  </div>
                )}

                {profile.country_challenge && (
                  <div className="amb-answer-card">
                    <h3 className="amb-answer-label">Regional SAP Security Challenge</h3>
                    <p className="amb-answer-body">{profile.country_challenge}</p>
                  </div>
                )}

                {profile.ambassador_definition && (
                  <div className="amb-answer-card">
                    <h3 className="amb-answer-label">Definition of a Great Country Ambassador</h3>
                    <p className="amb-answer-body">{profile.ambassador_definition}</p>
                  </div>
                )}

                {profile.other_motivation_text && (
                  <div className="amb-answer-card">
                    <h3 className="amb-answer-label">Additional Motivations</h3>
                    <p className="amb-answer-body">{profile.other_motivation_text}</p>
                  </div>
                )}

                {profile.contribution_links && (
                  <div className="amb-answer-card">
                    <h3 className="amb-answer-label">Published Work & Links</h3>
                    <p className="amb-answer-body">{profile.contribution_links}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
