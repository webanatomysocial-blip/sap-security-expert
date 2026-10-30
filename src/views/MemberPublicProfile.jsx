import { useState, useEffect } from "react";
import { PaginatedList, CarouselSection } from "../components/ProfilePaging";
import NotFound from "./NotFound";
import { useParams, Link } from "react-router-dom";
import SEO from "../components/SEO";
import { VITE_SITE_URL } from "../utils/env";
import { getMemberPublicProfile } from "../services/api";
import AmbassadorBadge from "../components/AmbassadorBadge";
import AchievementBadgeStrip from "../components/AchievementBadgeStrip";
import {
  LuUser,
  LuLayers,
  LuStar,
  LuFileText,
  LuMapPin,
  LuBriefcase,
  LuCalendar,
  LuLinkedin,
  LuChevronRight,
  LuShieldCheck,
  LuArrowLeft,
  LuCircleCheck,
  LuMessageSquare,
  LuAward,
} from "react-icons/lu";

const REPUTATION_CONFIG = {
  Contributor: {
    label: "Contributor",
    icon: "bi-patch-check-fill",
    color: "#ee5e42",
    bg: "#fff5f3",
    border: "#ffd5cc",
    desc: "Verified expert contributor to the SAP Security community",
  },
  Explorer: {
    label: "Explorer",
    icon: "bi-compass-fill",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    desc: "Active member of the SAP Security Expert community",
  },
  CountryAmbassador: {
    label: "Country Ambassador",
    icon: "bi-award-fill",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    desc: "Official SAP Security Expert representative for their country",
  },
};

const MemberPublicProfile = () => {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    getMemberPublicProfile(id)
      .then((res) => {
        if (res.data?.status === "error") setError(res.data.message || "Member not found");
        else setMember(res.data);
      })
      .catch(() => setError("Member not found or profile is private."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "4px solid #f1f5f9", borderTop: "4px solid #ee5e42", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading profile…</p>
      </div>
    );
  }

  if (error || !member) {
    return <NotFound message="This member profile does not exist or is private." />;
  }

  const joinedDate = member.joined
    ? new Date(member.joined).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const displayName = member.name || member.full_name || member.username || "SAP Security Expert Member";

  const repLevel = member.ambassador_has_badge
    ? "CountryAmbassador"
    : member.reputation_level || "Explorer";
  const repCfg = REPUTATION_CONFIG[repLevel] || REPUTATION_CONFIG.Explorer;

  const locationStr = [member.location, member.state, member.country].filter(Boolean).join(", ");

  const certs = Array.isArray(member.sap_certifications)
    ? member.sap_certifications
    : typeof member.sap_certifications === "string"
    ? (() => { try { return JSON.parse(member.sap_certifications); } catch { return []; } })()
    : [];

  const expertiseTags = Array.isArray(member.expertise_tags)
    ? member.expertise_tags
    : typeof member.expertise_tags === "string"
    ? (() => { try { return JSON.parse(member.expertise_tags); } catch { return []; } })()
    : [];

  return (
    <div className="auth-profile-wrap">
      <SEO
        title={`${displayName} — SAP Security Expert Member Profile`}
        description={`View the SAP Security Expert profile for ${displayName}. Explore their contributions, expertise, and community activity.`}
        url={`${VITE_SITE_URL}/member/${id}`}
      />

      <div className="auth-profile-container">
        {/* Navigation Breadcrumb */}
        <div className="auth-nav-bar">
          <Link to="/" className="auth-nav-back">
            <LuArrowLeft /> Back to Home
          </Link>
          <Link to="/member/directory" className="auth-nav-back">
            Community Directory
          </Link>
        </div>

        {/* 2-Column Profile Card */}
        <div className="auth-profile-card">
          {/* Left Column: Author Card with Pattern Header */}
          <aside className="auth-sidebar">
            <div className="auth-banner">
              <div className="auth-avatar-holder">
                {member.profile_image ? (
                  <img
                    src={member.profile_image}
                    alt={displayName}
                    className="auth-avatar-img"
                  />
                ) : (
                  <div className="auth-avatar-fallback">
                    {displayName.charAt(0)}
                  </div>
                )}
                <div className="auth-verified-badge" title="Verified Member">
                  <LuShieldCheck size={12} color="#ffffff" />
                </div>
              </div>
            </div>

            <div className="auth-sidebar-body">
              <div className="auth-name-group">
                <h1 className="auth-name">{displayName}</h1>
                <p className="auth-role">{member.headline || member.job_role || "SAP Security Professional"}</p>
              </div>

              {(member.company_name || locationStr || joinedDate) && (
                <div className="auth-details-list">
                  {member.company_name && (
                    <div className="auth-detail-item">
                      <LuBriefcase />
                      <span>{member.company_name}</span>
                    </div>
                  )}
                  {locationStr && (
                    <div className="auth-detail-item">
                      <LuMapPin />
                      <span>{locationStr}</span>
                    </div>
                  )}
                  {joinedDate && (
                    <div className="auth-detail-item">
                      <LuCalendar />
                      <span>Member since {joinedDate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* About section */}
              {member.bio && (
                <div>
                  <h3 className="auth-section-heading">About</h3>
                  <p className="auth-about-text">{member.bio}</p>
                </div>
              )}

              {/* Connect */}
              {member.linkedin && (
                <div>
                  <h3 className="auth-section-heading">Connect</h3>
                  <a
                    href={member.linkedin.startsWith("http") ? member.linkedin : `https://${member.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="auth-connect-btn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a66c2" style={{ flexShrink: 0 }}>
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    <span>LinkedIn Profile</span>
                  </a>
                </div>
              )}

              {/* Expertise Tags */}
              {expertiseTags.length > 0 && (
                <div>
                  <h3 className="auth-section-heading">Expertise</h3>
                  <div className="auth-expertise-tags">
                    {expertiseTags.map((tag, idx) => (
                      <span key={idx} className="auth-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements Badges */}
              {member.badges && member.badges.length > 0 && (
                <div>
                  <h3 className="auth-section-heading">Achievements</h3>
                  <AchievementBadgeStrip badges={member.badges} size={36} />
                </div>
              )}

              {/* Ambassador badge */}
              {Boolean(member.ambassador_has_badge) && (
                <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
                  <AmbassadorBadge country={member.ambassador_badge_country} year={member.ambassador_badge_year} size={130} />
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Main Content */}
          <main className="auth-main">
            {/* Top Stats Strip */}
            <div className="auth-stats-grid">
              <div className="auth-stat-box">
                <div className="auth-stat-icon">
                  <LuUser />
                </div>
                <div className="auth-stat-info">
                  <div className="auth-stat-num">{repCfg.label}</div>
                  <div className="auth-stat-label">Member Level</div>
                  <div className="auth-stat-sub">Community Standing</div>
                </div>
              </div>

              <div className="auth-stat-box">
                <div className="auth-stat-icon">
                  <LuStar />
                </div>
                <div className="auth-stat-info">
                  <div className="auth-stat-num">
                    {member.comment_count != null ? member.comment_count : (member.recent_comments?.length || 0)}
                  </div>
                  <div className="auth-stat-label">Comments</div>
                  <div className="auth-stat-sub">Contributions to discussions</div>
                </div>
              </div>

              <div className="auth-stat-box">
                <div className="auth-stat-icon">
                  <LuFileText />
                </div>
                <div className="auth-stat-info">
                  <div className="auth-stat-num">{member.badges?.length || 0}</div>
                  <div className="auth-stat-label">Badges Earned</div>
                  <div className="auth-stat-sub">Community Milestones</div>
                </div>
              </div>

              <div className="auth-stat-box">
                <div className="auth-stat-icon">
                  <LuLayers />
                </div>
                <div className="auth-stat-info">
                  <div className="auth-stat-num">{joinedDate || "Active"}</div>
                  <div className="auth-stat-label">Joined</div>
                  <div className="auth-stat-sub">Verified Member</div>
                </div>
              </div>
            </div>

            {/* Certifications Section */}
            {certs.length > 0 && (
              <CarouselSection
                items={certs}
                pageSize={3}
                title={`SAP Certifications (${certs.length})`}
                sectionClassName="auth-cert-section"
                headerClassName="auth-cert-header"
                titleClassName="auth-block-title"
                listClassName="auth-cert-cards-grid"
                renderItem={(cert, idx) => (
                    <div key={idx} className="auth-cert-box">
                      <div className="auth-cert-icon">
                        <LuCircleCheck />
                      </div>
                      <div>
                        <p className="auth-cert-title">{cert.name || cert}</p>
                        {cert.issuer && (
                          <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            {cert.issuer} {cert.issue_date && `• ${cert.issue_date}`}
                          </span>
                        )}
                      </div>
                    </div>
                )}
              />
            )}

            {/* Dynamic Articles (for Contributors) vs Comments (for Members) */}
            {member.is_real_contributor || (member.recent_articles && member.recent_articles.length > 0) ? (
              <section className="auth-articles-section">
                <div className="auth-articles-header">
                  <h2 className="auth-block-title">
                    Published Articles ({member.articles_count ?? member.recent_articles?.length ?? 0})
                  </h2>
                </div>

                {member.recent_articles && member.recent_articles.length > 0 ? (
                  <PaginatedList
                    items={member.recent_articles}
                    pageSize={4}
                    className="auth-articles-list"
                    renderItem={(art) => (
                      <Link
                        key={art.id || art.slug}
                        to={`/${(art.category || "blog").toLowerCase()}/${art.slug}`}
                        className="auth-article-row"
                      >
                        {art.featured_image || art.image ? (
                          <img
                            src={art.featured_image || art.image}
                            alt={art.title}
                            className="auth-article-thumb"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="auth-article-thumb-placeholder">
                            <LuFileText size={20} color="#94a3b8" />
                          </div>
                        )}
                        <div className="auth-article-content">
                          <span className="auth-article-badge">
                            {(art.category || "SECURITY INSIGHT").replace(/-/g, " ").toUpperCase()}
                          </span>
                          <h3 className="auth-article-title">{art.title}</h3>
                          <div className="auth-article-meta">
                            <span>
                              <i className="bi bi-calendar3" />{" "}
                              {art.published_at || art.date
                                ? new Date(art.published_at || art.date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                            <span>
                              <i className="bi bi-eye" /> {art.view_count || art.views || 0}
                            </span>
                          </div>
                        </div>
                        <div className="auth-article-arrow">
                          <LuChevronRight />
                        </div>
                      </Link>
                    )}
                  />
                ) : (
                  <div style={{ padding: "32px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
                    <LuFileText size={28} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                      No published articles yet.
                    </p>
                  </div>
                )}
              </section>
            ) : (
              <section className="auth-articles-section">
                <div className="auth-articles-header">
                  <h2 className="auth-block-title">
                    Recent Comments & Discussions ({member.comment_count != null ? member.comment_count : (member.recent_comments?.length || 0)})
                  </h2>
                </div>

                {member.recent_comments && member.recent_comments.length > 0 ? (
                  <div className="auth-articles-list">
                    {member.recent_comments.map((comm) => (
                      <Link
                        key={comm.id}
                        to={`/${(comm.post_category || "blog").toLowerCase()}/${comm.post_slug || comm.post_id}`}
                        className="auth-article-row"
                      >
                        {comm.post_image ? (
                          <img
                            src={comm.post_image}
                            alt={comm.post_title || "Article"}
                            className="auth-article-thumb"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div
                            className="auth-article-thumb-placeholder"
                            style={{
                              background: "#fff7ed",
                              borderColor: "#fed7aa",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <LuMessageSquare size={22} color="#ea580c" />
                          </div>
                        )}
                        <div className="auth-article-content">
                          <span className="auth-article-badge" style={{ background: "#eff6ff", color: "#2563eb" }}>
                            {(comm.post_category || "COMMUNITY DISCUSSION").replace(/-/g, " ").toUpperCase()}
                          </span>
                          <h3 className="auth-article-title" style={{ fontSize: "0.88rem", color: "#0f172a" }}>
                            {comm.post_title || comm.post_id || "Article Discussion"}
                          </h3>
                          <p style={{ margin: "2px 0 6px", fontSize: "0.78rem", color: "#475569", lineHeight: 1.4, fontStyle: "italic" }}>
                            "{comm.content?.length > 120 ? comm.content.substring(0, 120) + "..." : comm.content}"
                          </p>
                          <div className="auth-article-meta">
                            <span>
                              <i className="bi bi-calendar3" />{" "}
                              {comm.timestamp
                                ? new Date(comm.timestamp).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : ""}
                            </span>
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>
                              <i className="bi bi-check2-circle" /> Approved Contribution
                            </span>
                          </div>
                        </div>
                        <div className="auth-article-arrow">
                          <LuChevronRight />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "32px 20px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1", textAlign: "center" }}>
                    <LuMessageSquare size={28} style={{ color: "#94a3b8", marginBottom: "8px" }} />
                    <p style={{ margin: "0 0 10px", color: "#64748b", fontSize: "0.85rem" }}>
                      {displayName} hasn't posted in any public discussions yet.
                    </p>
                    <Link to="/learning" className="auth-tag" style={{ textDecoration: "none" }}>
                      Browse All Articles
                    </Link>
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MemberPublicProfile;
