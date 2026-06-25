import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
// Removed static metadata import
// Removed static metadata import
// next-disabled: import "../css/CommunitySection.css";
const ads1 = "/assets/ads/promo-1.png";
const ads2 = "/assets/ads/promo-2.png";
import {
  getHomepageData,
  getPublicAnnouncements,
  getPublicAds,
  getCommunityStats,
} from "../services/api";

export default function CommunitySection() {
  const getImageUrl = (path) => {
    if (!path) return "https://placehold.co/100x100?text=Author";
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    if (path.includes("uploads/")) {
      return "/" + path.substring(path.indexOf("uploads/"));
    }
    if (path.includes("assets/")) {
      return "/" + path.substring(path.indexOf("assets/"));
    }
    return path.startsWith("/") ? path : `/${path}`;
  };

  const handleAdClick = (zone) => {
    import("../services/api").then(({ trackAdClick }) => {
      trackAdClick(zone).catch(() => {});
    });
  };

  const [contributorCount, setContributorCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [contributors, setContributors] = useState([]);

  // State for announcements
  const [announcements, setAnnouncements] = useState([]);

  // State for Ads
  const [adsConfig, setAdsConfig] = useState({
    community_left: { active: false, image: "", link: "" },
    community_right: { active: false, image: "", link: "" },
  });

  // Dynamic Data State
  const [heroArticles, setHeroArticles] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [trending, setTrending] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
 
  useEffect(() => {
    if (heroArticles.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroArticles.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroArticles]);

  useEffect(() => {
    // Fetch consolidated homepage data
    getHomepageData()
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          setHeroArticles(data.heroArticles || []);
          setRecentActivity(
            (data.recent || []).filter(
              (post) =>
                new Date(
                  (post.date || post.created_at || "").replace(" ", "T"),
                ) <= new Date(),
            ),
          );
          setTrending(data.trending || []);
          setContributors(data.contributors || []);
          setContributorCount(data.contributors ? data.contributors.length : 0);
        }
      })
      .catch((err) => {
        console.error("Homepage API failed", err);
      });

    // Keep Announcements & Ads separate as they might have different caching/logic
    // Fetch Announcements
    getPublicAnnouncements()
      .then((res) => {
        setAnnouncements(res.data);
      })
      .catch((err) => {
        console.warn("Announcement Fetch Failed", err);
      });

    // Fetch Ads
    getPublicAds()
      .then((res) => {
        const data = res.data;
        // API returns object keyed by zone
        const leftAd = data.community_left || data["community_left"];
        const rightAd = data.community_right || data["community_right"];

        setAdsConfig({
          community_left: leftAd?.active
            ? { active: true, image: leftAd.image, link: leftAd.link }
            : { active: false },
          community_right: rightAd?.active
            ? { active: true, image: rightAd.image, link: rightAd.link }
            : { active: false },
        });
      })
      .catch((err) => console.error("Ads Fetch Failed", err));

    // Fetch total contributor count separately if needed for the big number,
    // or rely on the length of the list if that's what was intended.
    // The user asked for "Latest 3 approved contributors" in list, but maybe total count in stats.
    // Let's keep the specific stats call for the big number if it exists, otherwise fallback.
    getCommunityStats()
      .then((res) => {
        const data = res.data;
        if (data && data.active_contributors) {
          setContributorCount(parseInt(data.active_contributors));
        }
        if (data && data.total_members) {
          setMemberCount(parseInt(data.total_members));
        }
      })
      .catch((err) => console.warn("Stats failed", err));
  }, []);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element && window.lenis) {
      window.lenis.scrollTo(element);
    } else if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Estimated read time (~200 wpm) from content/excerpt
  const readTime = (a) => {
    const text = (a?.content || a?.excerpt || "").replace(/<[^>]+>/g, " ");
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  };

  const catLabel = (c) => (c ? c.replace(/-/g, " ").toUpperCase() : "");

  const blogPath = (a) =>
    a?.category
      ? `/${a.category.toLowerCase().replace(/\s+/g, "-")}/${a.slug || a.id}`
      : `/blogs/${a?.slug || a?.id}`;

  const activeArticle = heroArticles[currentHeroIndex] || heroArticles[0] || {};
  const activeBg =
    activeArticle.hero_image ||
    activeArticle.homepage_featured_image ||
    activeArticle.image;

  return (
    <section className="community-section">
      <div className="container">
        {/* <div className="community-header">
          <h1>An exclusive community for SAP Security & GRC professionals</h1>
        </div> */}


        <div className="community-grid">
          {/* LEFT COLUMN */}
          <div className="community-left">

            {/* Recent Topics */}
            <div className="widget">
              <div className="widget-header">
                <h3>Recent Topics</h3>
              </div>
              <div className="topics-list">
                {recentActivity.slice(0, 5).map((post) => (
                  <Link
                    key={post.slug || post.id}
                    to={
                      post.category
                        ? `/${post.category.toLowerCase().replace(/\s+/g, "-")}/${post.slug || post.id}`
                        : `/blogs/${post.slug || post.id}`
                    }
                    className="topic-item"
                  >
                    {/* Author Avatar */}
                    {post.author_image ? (
                      <img
                        src={getImageUrl(post.author_image)}
                        alt={post.author_name || post.author}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "2px solid #e2e8f0",
                        }}
                        onError={(e) => {
                          e.target.src =
                            "https://placehold.co/100x100?text=Author";
                        }}
                      />
                    ) : (
                      <span className="topic-label">
                        {(post.author_name || post.author || "G")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <div className="topic-info">
                      <span className="topic-title">
                        {post.title}
                      </span>
                      {post.is_members_only == 1 && (
                        <div className="exclusive-mini-badge-v2">
                          <i className="bi bi-lock-fill"></i> Exclusive
                        </div>
                      )}
                      <span className="topic-meta">
                        By {post.author_name || "Guest Author"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <a
                href="#featured-insights"
                className="view-all-link"
                onClick={(e) => scrollToSection(e, "featured-insights")}
              >
                Browse All Topics →
              </a>
            </div>

            {/* Promotion */}
            <div className="widget promo-widget">
              {adsConfig.community_left.active ? (
                <div className="promo-box">
                  <a
                    href={adsConfig.community_left.link || "#"}
                    target={adsConfig.community_left.link ? "_blank" : "_self"}
                    rel="noreferrer"
                    onClick={() => handleAdClick("community_left")}
                  >
                    <img src={getImageUrl(adsConfig.community_left.image)} alt="Ad 1" />
                  </a>
                </div>
              ) : (
                <img src={ads1} alt="Promotion 1" />
              )}
            </div>

            {/* Our Contributors (Left Side) */}
            {contributors.length > 0 && (
              <div className="widget">
                <div className="widget-header">
                  <h3>Our Contributors</h3>
                </div>
                <div className="contributors-list-left" data-lenis-prevent>
                  {contributors.map((contributor, index) => (
                    <Link
                      key={index}
                      to={`/contributor/${contributor.id}`}
                      className="contributor-card-new"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <div className="contributor-avatar">
                        {contributor.profile_image ? (
                          <img
                            src={getImageUrl(contributor.profile_image)}
                            alt={contributor.full_name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="avatar-fallback"
                          style={{
                            display: contributor.profile_image
                              ? "none"
                              : "flex",
                          }}
                        >
                          {contributor.full_name
                            ? contributor.full_name.charAt(0)
                            : "C"}
                        </div>
                      </div>
                      <div className="contributor-info" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{contributor.full_name}</h4>
                        {contributor.role && (
                          <span className="contributor-role" style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 500 }}>
                            {contributor.role}
                          </span>
                        )}
                        <span className="joined-date" style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          Joined: {formatDate(contributor.created_at || new Date())}
                        </span>
                        <span className="contributions-count" style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>
                          Contributions: {contributor.contributions_count || 0} {Number(contributor.contributions_count) === 1 ? "Article" : "Articles"}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CENTER COLUMN */}
          <div className="community-center">
            {/* Featured Insight */}
            {/* Featured Insight Carousel */}
            {heroArticles && heroArticles.length > 0 && (
              <div
                className="featured-insight-card"
                style={
                  activeBg
                    ? {
                        backgroundImage: `url(${getImageUrl(activeBg)})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              >
                <span className="featured-badge">Featured Insight</span>

                <div className="hero-carousel-content">
                  {heroArticles.map((article, index) => {
                    const isVisible = index === currentHeroIndex;
                    return (
                      <Link
                        key={article.id}
                        to={blogPath(article)}
                        className={`hero-carousel-slide fi-title-box ${isVisible ? "active" : ""}`}
                        style={{
                          display: isVisible ? "block" : "none",
                          animation: isVisible ? "fadeIn 0.5s ease-in-out" : "none",
                        }}
                      >
                        <h2>{article.title}</h2>
                        {article.excerpt && <p className="fi-desc">{article.excerpt}</p>}
                      </Link>
                    );
                  })}
                </div>

                <div className="fi-footer">
                  <div className="featured-meta">
                    <span>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      {readTime(activeArticle)} MIN READ
                    </span>
                    {activeArticle.category && (
                      <span>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        {catLabel(activeArticle.category)}
                      </span>
                    )}
                  </div>

                  {heroArticles.length > 1 && (
                    <div className="hero-carousel-dots">
                      {heroArticles.map((_, index) => (
                        <button
                          key={index}
                          aria-label={`Go to slide ${index + 1}`}
                          className={`hero-dot ${index === currentHeroIndex ? "active" : ""}`}
                          onClick={() => setCurrentHeroIndex(index)}
                        />
                      ))}
                    </div>
                  )}

                  <Link to={blogPath(activeArticle)} className="btn-read-insight">
                    Read Insight
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              </div>
            )}



            {/* Recent Activity */}
            {recentActivity && recentActivity.length > 0 && (
              <div className="widget">
                <div className="widget-header">
                  <h3>Recent Activity</h3>
                </div>
                <div className="activity-list">
                  {recentActivity.slice(0, 3).map((activity) => (
                    <Link
                      key={activity.slug || activity.id}
                      to={
                        activity.category
                          ? `/${activity.category.toLowerCase().replace(/\s+/g, "-")}/${activity.slug || activity.id}`
                          : `/blogs/${activity.slug || activity.id}`
                      }
                      className="activity-item"
                    >
                      <div className="activity-img-wrapper" style={{ flexShrink: 0 }}>
                        <img
                          src={activity.image ? getImageUrl(activity.image) : "https://placehold.co/600x400?text=No+Image"}
                          alt={activity.title}
                          onError={(e) => {
                            e.target.src = "https://placehold.co/600x400?text=No+Image";
                          }}
                        />
                      </div>
                      <div className="activity-content">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span className="activity-badge">
                            {activity.category
                              ? activity.category
                                  .replace("sap-", "")
                                  .toUpperCase()
                              : "BLOG"}
                          </span>
                          {activity.is_members_only == 1 && (
                            <span className="exclusive-mini-badge-inline">
                              <i className="bi bi-lock-fill"></i> Exclusive
                            </span>
                          )}
                        </div>
                        <h4>
                          {activity.title}
                        </h4>
                        <p>
                          {activity.excerpt
                            ? activity.excerpt.substring(0, 100)
                            : ""}
                          ...
                        </p>
                        <div className="activity-meta">
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {activity.author_image ? (
                              <img
                                src={getImageUrl(activity.author_image)}
                                alt={activity.author_name || activity.author}
                                style={{
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  border: "1px solid #e2e8f0",
                                }}
                                onError={(e) => {
                                  e.target.src =
                                    "https://placehold.co/100x100?text=Author";
                                }}
                              />
                            ) : (
                              <i className="bi bi-person-circle"></i>
                            )}
                            {activity.author_name || "Guest Author"}
                          </span>
                          <span>{formatDate(activity.date)}</span>
                        </div>
                        <span className="activity-link">
                          Read & Join Discussion →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
                {/* FIXED: Using Link for navigation */}
                <Link
                  to="/become-a-contributor"
                  className="view-all-link-center"
                >
                  Join the Community →
                </Link>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="community-right">

            {/* New to SAP Security? Box */}
            <div className="widget new-to-sap-box">
              <div className="widget-header">
                <h3>New to SAP Security?</h3>
              </div>
              <div className="new-to-sap-content">
                <p>Start with the basics and build your knowledge.</p>
                <Link to="/learning-hub" className="start-here-btn">
                  Start Here
                </Link>
              </div>
            </div>

            {/* Announcements */}
            <div className="widget">
              <div className="widget-header">
                <h3>Announcements</h3>
              </div>
              <div className="announcements-list" data-lenis-prevent>
                {!Array.isArray(announcements) || announcements.length === 0 ? (
                  <p style={{ fontSize: "0.9rem", color: "#666" }}>
                    No announcements yet.
                  </p>
                ) : (
                  announcements.map((announcement, i) => {
                    const raw = announcement.date || "";
                    const isoStr = raw.includes(" ") ? raw.replace(" ", "T") + "Z" : raw;
                    const d = new Date(isoStr);
                    const dateLabel = isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
                    const hasDetail = !!(announcement.slug && (announcement.content || announcement.image));
                    return (
                    <div key={i} className="announcement-item">
                      {hasDetail ? (
                        <Link to={`/announcements/${announcement.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                          <h4 style={{ cursor: "pointer" }}>{announcement.title}</h4>
                        </Link>
                      ) : (
                        <h4>{announcement.title}</h4>
                      )}
                      <div className="announcement-meta">
                        <span>{dateLabel}</span>
                        {announcement.link && (
                          <a href={announcement.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "10px" }}>
                            <i className="bi bi-box-arrow-up-right"></i>
                          </a>
                        )}
                        {hasDetail && (
                          <Link to={`/announcements/${announcement.slug}`} style={{ marginLeft: "10px", color: "#e84a3d", fontSize: "0.78rem", fontWeight: 600 }}>
                            Read more →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                  })
                )}
              </div>
              {/* <Link to="/announcements" className="view-all-link">
                View All Announcements →
              </Link> */}
            </div>

            {/* Promotion */}
            <div className="widget promo-widget">
              {adsConfig.community_right.active ? (
                <div className="promo-box">
                  <a
                    href={adsConfig.community_right.link || "#"}
                    target={adsConfig.community_right.link ? "_blank" : "_self"}
                    rel="noreferrer"
                    onClick={() => handleAdClick("community_right")}
                  >
                    <img src={getImageUrl(adsConfig.community_right.image)} alt="Ad 2" />
                  </a>
                </div>
              ) : (
                <img src={ads2} alt="Promotion 2" />
              )}
            </div>

            {/* Community Stats / Participants - Unhidden & Dynamic */}
            <div className="widget">
              <div className="widget-header">
                <h3>Community</h3>
              </div>
              <div className="community-stats" style={{ padding: "0 10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "2rem",
                      fontWeight: "bold",
                      color: "#2563eb",
                    }}
                  >
                    {contributorCount + memberCount}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#64748b" }}>
                    Total Community Members & Experts
                  </div>
                </div>
                <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.5" }}>
                  Join <strong>{memberCount} members</strong> and{" "}
                  <strong>{contributorCount} contributors</strong> who are
                  actively securing the SAP ecosystem.
                </p>
              </div>
            </div>

            {/* Approved Contributors List - Removed from Right (Moved to Left) */}

            {/* Newsletter */}
            <div className="widget newsletter-widget">
              <div className="newsletter-icon">
                <i className="bi bi-shield-lock-fill"></i>
              </div>
              <h3>Join Our Community</h3>
              <p>Get exclusive SAP security insights delivered to your inbox.</p>
              <Link to="/member/signup" className="btn-newsletter-widget">
                <i className="bi bi-person-plus-fill"></i> Create Free Account
              </Link>
              <Link to="/member/login" style={{ display: "block", textAlign: "center", marginTop: "8px", fontSize: "0.8rem", color: "#64748b" }}>
                Already a member? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
