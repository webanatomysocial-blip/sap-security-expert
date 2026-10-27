import { useState, useEffect } from "react";
import NotFound from "./NotFound";
import { useParams, Link } from "react-router-dom";
import SEO from "../components/SEO";
import { VITE_SITE_URL } from "../utils/env";
import { getContributorProfile } from "../services/api";
import Image from "next/image";
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
  LuChevronLeft,
  LuShieldCheck,
  LuArrowLeft
} from "react-icons/lu";

const expertiseLabels = {
  sapSecurity: "SAP Security",
  sapGrc: "SAP GRC",
  sapIag: "SAP IAG / Audit",
  sapBtp: "SAP BTP Security",
  sapCyber: "Cybersecurity",
};

export default function ContributorProfile() {
  const { id } = useParams();
  const [contributor, setContributor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    setCurrentPage(1);
    getContributorProfile(id)
      .then((res) => {
        if (res.data.status === "success") {
          const c = res.data.contributor;
          if (c.expertise && typeof c.expertise === "string") {
            try { c.expertise = JSON.parse(c.expertise); } catch { c.expertise = {}; }
          }
          ["sap_certifications", "sap_press_books"].forEach((f) => {
            if (c[f] && typeof c[f] === "string") {
              try { c[f] = JSON.parse(c[f]); } catch { c[f] = []; }
            }
          });
          setContributor(c);
        } else {
          setError(res.data.message || "Contributor not found");
        }
      })
      .catch(() => setError("Something went wrong. Please try again later."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "4px solid #f1f5f9", borderTop: "4px solid #eb5437", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading profile…</p>
      </div>
    );
  }

  if (error || !contributor) {
    return <NotFound message="This contributor profile is no longer available. The contributor may have left the platform or their account may have been deactivated." />;
  }

  const expertiseEntries = contributor.expertise
    ? Object.entries(contributor.expertise).filter(([, v]) => v === true)
    : [];

  const avatarUrl = imgError || !contributor.profile_image ? null : contributor.profile_image;
  const isRaghu = id === "raghu-boddu" || contributor.slug === "raghu-boddu" || (contributor.full_name && contributor.full_name.toLowerCase().includes("raghu"));

  const designation = contributor.designation || contributor.role || "SAP Security Contributor";

  // Pagination for articles
  const allBlogs = contributor.blogs || [];
  const totalArticles = allBlogs.length;
  const totalPages = Math.ceil(totalArticles / PAGE_SIZE) || 1;
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentArticles = allBlogs.slice(startIndex, startIndex + PAGE_SIZE);

  const certifications = (contributor.sap_certifications && contributor.sap_certifications.length > 0)
    ? contributor.sap_certifications
    : [];

  const experienceYears = contributor.experience_years ? Number(contributor.experience_years) : null;
  const implementationsCount = contributor.implementations_count ? Number(contributor.implementations_count) : null;
  const peerRating = contributor.peer_rating ? parseFloat(contributor.peer_rating).toFixed(1) : null;
  const peerRatingCount = contributor.peer_rating_count || 0;
  const articlesCount = contributor.blog_count !== undefined && contributor.blog_count !== null 
    ? contributor.blog_count 
    : totalArticles;

  const hasStats = (experienceYears !== null && experienceYears > 0) || 
                   (implementationsCount !== null && implementationsCount > 0) || 
                   (peerRating !== null) || 
                   (articlesCount > 0);

  return (
    <div className="auth-profile-wrap">
      <SEO
        title={`${contributor.full_name} — ${designation} | SAP Security Expert`}
        description={contributor.short_bio || contributor.bio ? (contributor.short_bio || contributor.bio).substring(0, 160) : `${contributor.full_name} is an SAP Security contributor at SAP Security Expert.`}
        url={`${VITE_SITE_URL}/contributor/${id}`}
      />

      <div className="auth-profile-container">
        {/* Navigation Breadcrumb / Back Bar */}
        <div className="auth-nav-bar">
          <Link to="/leaderboard" className="auth-nav-back">
            <LuArrowLeft /> All Contributors
          </Link>
          {isRaghu && (
            <Link to="/experts/raghu-boddu" className="auth-nav-back" style={{ color: "#eb5437", borderColor: "#fed7aa" }}>
              View Dedicated Expert Page →
            </Link>
          )}
        </div>

        {/* Outer Two-Column Card matching design */}
        <div className="auth-profile-card">
          
          {/* Left Column: Author Card with Pattern Header */}
          <aside className="auth-sidebar">
            <div className="auth-banner">
              <div className="auth-avatar-holder">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={contributor.full_name}
                    width={100}
                    height={100}
                    className="auth-avatar-img"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="auth-avatar-fallback">
                    {contributor.full_name?.charAt(0)}
                  </div>
                )}
                <div className="auth-verified-badge" title="Verified Contributor">
                  <LuShieldCheck style={{ color: "#eb5437", fontSize: 14 }} />
                </div>
              </div>
            </div>

            <div className="auth-sidebar-body">
              <div className="auth-name-group">
                <h1 className="auth-name">{contributor.full_name}</h1>
                <p className="auth-role">{contributor.role || designation}</p>
              </div>

              {(contributor.organization || contributor.country || contributor.created_at) && (
                <div className="auth-details-list">
                  {contributor.organization && (
                    <div className="auth-detail-item">
                      <LuBriefcase />
                      <span>{contributor.organization}</span>
                    </div>
                  )}
                  {contributor.country && (
                    <div className="auth-detail-item">
                      <LuMapPin />
                      <span>{contributor.country}</span>
                    </div>
                  )}
                  {contributor.created_at && (
                    <div className="auth-detail-item">
                      <LuCalendar />
                      <span>
                        Member since {new Date(contributor.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* About section */}
              {(contributor.short_bio || contributor.bio) && (
                <div>
                  <h3 className="auth-section-heading">About</h3>
                  <p className="auth-about-text">
                    {contributor.short_bio || contributor.bio}
                  </p>
                </div>
              )}

              {/* View Public Profile Button - Only show if there is an alternate dedicated page (e.g. Raghu Boddu's dedicated expert page) */}
              {isRaghu && (
                <Link to="/experts/raghu-boddu" className="auth-btn-profile">
                  View Public Profile
                </Link>
              )}

              {/* Connect */}
              {contributor.linkedin && (
                <div>
                  <h3 className="auth-section-heading">Connect</h3>
                  <a href={contributor.linkedin} target="_blank" rel="noopener noreferrer" className="auth-connect-btn">
                    <LuLinkedin /> LinkedIn Profile
                  </a>
                </div>
              )}

              {/* Expertise */}
              {expertiseEntries.length > 0 && (
                <div>
                  <h3 className="auth-section-heading">Expertise</h3>
                  <div className="auth-expertise-tags">
                    {expertiseEntries.map(([key]) => (
                      <span key={key} className="auth-tag">
                        {expertiseLabels[key] || key}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements Badges */}
              {contributor.badges && contributor.badges.length > 0 && (
                <div>
                  <h3 className="auth-section-heading">Achievements</h3>
                  <AchievementBadgeStrip badges={contributor.badges} size={36} />
                </div>
              )}
            </div>
          </aside>

          {/* Right Column: Top Stats, Articles with Pagination, SAP Certifications */}
          <main className="auth-main">
            
            {/* Top 4 Stats Strip - Only render stats if present in data */}
            {hasStats && (
              <div className="auth-stats-grid">
                {experienceYears !== null && experienceYears > 0 && (
                  <div className="auth-stat-box">
                    <div className="auth-stat-icon">
                      <LuUser />
                    </div>
                    <div className="auth-stat-info">
                      <div className="auth-stat-num">{experienceYears}+</div>
                      <div className="auth-stat-label">Years Experience</div>
                      <div className="auth-stat-sub">In SAP Security & GRC</div>
                    </div>
                  </div>
                )}

                {implementationsCount !== null && implementationsCount > 0 && (
                  <div className="auth-stat-box">
                    <div className="auth-stat-icon">
                      <LuLayers />
                    </div>
                    <div className="auth-stat-info">
                      <div className="auth-stat-num">{implementationsCount}+</div>
                      <div className="auth-stat-label">Implementations</div>
                      <div className="auth-stat-sub">Across enterprises</div>
                    </div>
                  </div>
                )}

                {peerRating !== null && (
                  <div className="auth-stat-box">
                    <div className="auth-stat-icon">
                      <LuStar style={{ color: "#d97706" }} />
                    </div>
                    <div className="auth-stat-info">
                      <div className="auth-stat-num">
                        {peerRating} {peerRatingCount > 0 && <span>({peerRatingCount})</span>}
                      </div>
                      <div className="auth-stat-label">Peer Rating</div>
                      <div className="auth-stat-sub">From community members</div>
                    </div>
                  </div>
                )}

                {articlesCount > 0 && (
                  <div className="auth-stat-box">
                    <div className="auth-stat-icon">
                      <LuFileText />
                    </div>
                    <div className="auth-stat-info">
                      <div className="auth-stat-num">{articlesCount}</div>
                      <div className="auth-stat-label">Articles</div>
                      <div className="auth-stat-sub">Knowledge resources</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Articles Section */}
            <section className="auth-articles-section">
              <div className="auth-articles-header">
                <h2 className="auth-block-title">Articles</h2>
                {totalArticles > 0 && (
                  <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                    Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalArticles)} of {totalArticles}
                  </span>
                )}
              </div>

              {currentArticles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 0", color: "#94a3b8" }}>
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>No published articles yet.</p>
                </div>
              ) : (
                <div className="auth-articles-list">
                  {currentArticles.map((article) => {
                    const articleLink = article.category
                      ? `/${article.category}/${article.slug}`
                      : `/blogs/${article.slug || article.id}`;
                    const categoryDisplay = article.category
                      ? article.category.replace(/-/g, " ")
                      : "SECURITY FUNDAMENTALS";

                    return (
                      <Link key={article.id} to={articleLink} className="auth-article-row">
                        {article.image ? (
                          <img
                            src={article.image}
                            alt={article.title}
                            className="auth-article-thumb"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="auth-article-thumb-placeholder">
                            <LuFileText />
                          </div>
                        )}

                        <div className="auth-article-content">
                          <span className="auth-article-badge">{categoryDisplay}</span>
                          <h3 className="auth-article-title">{article.title}</h3>
                          <div className="auth-article-meta">
                            {article.date && (
                              <span>
                                <LuCalendar style={{ fontSize: 12 }} />
                                {new Date(article.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            )}
                            {article.view_count !== undefined && (
                              <span>
                                <i className="bi bi-eye" style={{ fontSize: 11 }} />
                                {article.view_count}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="auth-article-arrow">
                          <LuChevronRight />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="auth-pagination">
                  <button
                    className="auth-page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <LuChevronLeft />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      className={`auth-page-btn ${pageNum === currentPage ? "active" : ""}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    className="auth-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <LuChevronRight />
                  </button>
                </div>
              )}
            </section>

            {/* SAP Certifications - Only render if contributor has certifications */}
            {certifications.length > 0 && (
              <section className="auth-cert-section">
                <div className="auth-cert-header">
                  <h2 className="auth-block-title">SAP Certifications</h2>
                  <LuChevronRight style={{ color: "#94a3b8" }} />
                </div>

                <div className="auth-cert-cards-grid">
                  {certifications.map((cert, idx) => (
                    <div key={idx} className="auth-cert-box">
                      <div className="auth-cert-icon">
                        <LuShieldCheck />
                      </div>
                      <p className="auth-cert-title">
                        {typeof cert === "object" ? cert.name || cert.title : cert}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
