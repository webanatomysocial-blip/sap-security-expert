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
  getPopularTags,
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

  const [popularTags, setPopularTags] = useState([]);
  const [contributorCount, setContributorCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [articleCount, setArticleCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
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
  const [expertPicks, setExpertPicks] = useState([]);
  const [premiumArticles, setPremiumArticles] = useState([]);
  const [activeTab, setActiveTab] = useState("recent");
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
          setExpertPicks(data.expertPicks || []);
          setPremiumArticles(data.premiumArticles || []);
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
        if (data && data.active_contributors) setContributorCount(parseInt(data.active_contributors));
        if (data && data.total_members) setMemberCount(parseInt(data.total_members));
        if (data && data.total_articles) setArticleCount(parseInt(data.total_articles));
        if (data && data.total_comments) setCommentCount(parseInt(data.total_comments));
      })
      .catch((err) => console.warn("Stats failed", err));

    getPopularTags()
      .then((res) => setPopularTags(res.data?.tags || []))
      .catch(() => {});
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
            <div className="widget" style={{ flex: 1 }}>
              <div className="widget-header">
                <h3><i className="bi bi-bookmark-fill" style={{ marginRight: 7, color: "#e84a3d" }}></i>Recent Topics</h3>
                <a href="#featured-insights" className="widget-view-all" onClick={(e) => scrollToSection(e, "featured-insights")}>View all</a>
              </div>
              <div className="topics-list">
                {recentActivity.slice(0, 8).map((post) => (
                  <Link
                    key={post.slug || post.id}
                    to={post.category ? `/${post.category.toLowerCase().replace(/\s+/g, "-")}/${post.slug || post.id}` : `/blogs/${post.slug || post.id}`}
                    className="rt-item"
                  >
                    {/* Avatar */}
                    <div className="rt-avatar">
                      {post.author_image ? (
                        <img src={getImageUrl(post.author_image)} alt={post.author_name} onError={(e) => { e.target.src = "https://placehold.co/100x100?text=A"; }} />
                      ) : (
                        <span>{(post.author_name || "G").charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="rt-info">
                      <span className="rt-title">{post.title}</span>
                      {post.is_premium == 1 ? (
                        <span className="rt-badge rt-badge--paid"><i className="bi bi-star-fill"></i> Paid Article</span>
                      ) : post.is_members_only == 1 ? (
                        <span className="rt-badge"><i className="bi bi-lock-fill"></i> Exclusive</span>
                      ) : null}
                      <div className="rt-meta">
                        <span>By {post.author_name || "Guest Author"}</span>
                        <span>{readTime(post)} min read</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Ad */}
            <div className="widget promo-widget">
              {adsConfig.community_left.active ? (
                <div className="promo-box">
                  <a href={adsConfig.community_left.link || "#"} target={adsConfig.community_left.link ? "_blank" : "_self"} rel="noreferrer" onClick={() => handleAdClick("community_left")}>
                    <img src={getImageUrl(adsConfig.community_left.image)} alt="Ad" />
                  </a>
                </div>
              ) : (
                <img src={ads1} alt="Promotion" />
              )}
            </div>

            {/* Top Contributors */}
            {contributors.length > 0 && (
              <div className="widget">
                <div className="widget-header">
                  <h3><i className="bi bi-person-badge-fill" style={{ marginRight: 7, color: "#e84a3d" }}></i>Top Contributors</h3>
                  <Link to="/become-a-contributor" className="widget-view-all">View all</Link>
                </div>
                <div className="top-contributors-list">
                  {contributors.slice(0, 3).map((contributor, index) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <Link key={index} to={`/contributor/${contributor.id}`} className="top-contributor-row">
                        <span className="tc-medal">{medals[index]}</span>
                        <div className="tc-avatar">
                          {contributor.profile_image ? (
                            <img src={getImageUrl(contributor.profile_image)} alt={contributor.full_name} onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                          ) : null}
                          <div className="avatar-fallback" style={{ display: contributor.profile_image ? "none" : "flex" }}>
                            {contributor.full_name ? contributor.full_name.charAt(0) : "C"}
                          </div>
                        </div>
                        <div className="tc-info">
                          <span className="tc-name">{contributor.full_name}</span>
                          <span className="tc-count">{contributor.contributions_count || 0} Contributions</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <Link to="/leaderboard" className="widget-leaderboard-link">See Leaderboard →</Link>
              </div>
            )}

            {/* Popular Tags */}
            <div className="widget">
              <div className="widget-header">
                <h3><i className="bi bi-hash" style={{ marginRight: 4, color: "#e84a3d", fontSize: "1.1rem" }}></i>Popular Tags</h3>
              </div>
              <div className="popular-tags-list">
                {(popularTags.length > 0 ? popularTags : ["SAP Security","GRC","S/4HANA","IAM","BTP","Fiori","Authorization","Audit","Compliance","Role Design"]).slice(0, 9).map((tag, i) => (
                  <Link key={i} to={`/blogs?tag=${encodeURIComponent(tag)}`} className="popular-tag-pill">
                    #{tag}
                  </Link>
                ))}
              </div>
              <Link to="/blogs" className="widget-leaderboard-link" style={{ marginTop: 12 }}>View all tags →</Link>
            </div>
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



            {/* Recent Activity — tabbed */}
            <div className="widget">
              <div className="widget-header">
                <h3>Recent Activity</h3>
              </div>

              {/* Tab strip */}
              <div className="ra-tabs">
                {[
                  { key: "recent",  label: "Recent Articles",       icon: "bi-clock-history" },
                  { key: "expert",  label: "Expert Recommendations", icon: "bi-patch-check-fill" },
                  { key: "premium", label: "Premium Content",        icon: "bi-star-fill" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    className={`ra-tab-btn${activeTab === tab.key ? " active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    <i className={`bi ${tab.icon}`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {(() => {
                const tabData =
                  activeTab === "expert"  ? expertPicks :
                  activeTab === "premium" ? premiumArticles :
                  recentActivity;

                if (!tabData || tabData.length === 0) {
                  return (
                    <div className="ra-empty">
                      {activeTab === "expert"
                        ? "No expert recommendations yet. Admins can mark articles as Expert Picks from the blog list."
                        : activeTab === "premium"
                        ? "No premium content available yet."
                        : "No recent articles."}
                    </div>
                  );
                }

                return (
                  <div className="activity-list">
                    {tabData.slice(0, 4).map((activity) => (
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
                            onError={(e) => { e.target.src = "https://placehold.co/600x400?text=No+Image"; }}
                          />
                        </div>
                        <div className="activity-content">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                            <span className="activity-badge">
                              {activity.category ? activity.category.replace("sap-", "").toUpperCase() : "BLOG"}
                            </span>
                            {activity.is_premium == 1 ? (
                              <span className="exclusive-mini-badge-inline" style={{ background: "#d97706" }}>
                                <i className="bi bi-star-fill"></i> Paid
                              </span>
                            ) : activity.is_members_only == 1 ? (
                              <span className="exclusive-mini-badge-inline">
                                <i className="bi bi-lock-fill"></i> Exclusive
                              </span>
                            ) : null}
                            {activity.is_expert_pick == 1 && (
                              <span className="exclusive-mini-badge-inline" style={{ background: "#7c3aed" }}>
                                <i className="bi bi-patch-check-fill"></i> Expert Pick
                              </span>
                            )}
                          </div>
                          <h4>{activity.title}</h4>
                          <p>{activity.excerpt ? activity.excerpt.substring(0, 100) : ""}...</p>
                          <div className="activity-meta">
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {activity.author_image ? (
                                <img
                                  src={getImageUrl(activity.author_image)}
                                  alt={activity.author_name || activity.author}
                                  style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0" }}
                                  onError={(e) => { e.target.src = "https://placehold.co/100x100?text=Author"; }}
                                />
                              ) : (
                                <i className="bi bi-person-circle"></i>
                              )}
                              {activity.author_name || "Guest Author"}
                            </span>
                            <span>{formatDate(activity.date)}</span>
                          </div>
                          <span className="activity-link">Read & Join Discussion →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}

              <Link to="/become-a-contributor" className="view-all-link-center">
                Join the Community →
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="community-right">

            {/* New to SAP Security? Box */}
            <div className="widget new-to-sap-box">
              <div className="nts-icon-wrap">
                <i className="bi bi-mortarboard-fill"></i>
              </div>
              <h3 className="nts-heading">New to SAP Security?</h3>
              <p className="nts-desc">Start with the basics and build your knowledge.</p>
              <Link to="/learning-hub" className="start-here-btn">
                Start Here <i className="bi bi-arrow-right"></i>
              </Link>
            </div>

            {/* Announcements */}
            <div className="widget">
              <div className="widget-header">
                <h3><i className="bi bi-megaphone-fill" style={{ marginRight: 8, color: "#e84a3d" }}></i>Announcements</h3>
                <Link to="/announcements" className="widget-view-all">View all</Link>
              </div>
              <div className="announcements-list" data-lenis-prevent>
                {!Array.isArray(announcements) || announcements.length === 0 ? (
                  <p style={{ fontSize: "0.9rem", color: "#666" }}>No announcements yet.</p>
                ) : (
                  announcements.map((announcement, i) => {
                    const raw = announcement.date || "";
                    const isoStr = raw.includes(" ") ? raw.replace(" ", "T") + "Z" : raw;
                    const d = new Date(isoStr);
                    const dateLabel = isNaN(d.getTime()) ? raw : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
                    const hasDetail = !!(announcement.slug && (announcement.content || announcement.image));
                    const iconColors = [
                      { bg: "#eff6ff", color: "#2563eb" },
                      { bg: "#f0fdf4", color: "#16a34a" },
                      { bg: "#f5f3ff", color: "#7c3aed" },
                      { bg: "#fff7ed", color: "#ea580c" },
                    ];
                    const ic = iconColors[i % iconColors.length];
                    const inner = (
                      <div className="ann-item">
                        <div className="ann-icon" style={{ background: ic.bg, color: ic.color }}>
                          <i className="bi bi-calendar-event-fill"></i>
                        </div>
                        <div className="ann-body">
                          <span className="ann-date">{dateLabel}</span>
                          <p className="ann-title">{announcement.title}</p>
                          {announcement.link && (
                            <a href={announcement.link} target="_blank" rel="noopener noreferrer" className="ann-link">
                              Learn more <i className="bi bi-arrow-right"></i>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                    return hasDetail ? (
                      <Link key={i} to={`/announcements/${announcement.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={i}>{inner}</div>
                    );
                  })
                )}
              </div>
              <Link to="/announcements" className="ann-view-all-btn">
                View All Announcements
              </Link>
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

            {/* Community at a Glance */}
            <div className="widget">
              <div className="widget-header">
                <h3>Community at a Glance</h3>
              </div>
              <div className="cag-grid">
                <div className="cag-stat">
                  <div className="cag-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                    <i className="bi bi-people-fill"></i>
                  </div>
                  <div className="cag-number">{(memberCount).toLocaleString()}</div>
                  <div className="cag-label">Members</div>
                </div>
                <div className="cag-stat">
                  <div className="cag-icon" style={{ background: "#fef2f2", color: "#e84a3d" }}>
                    <i className="bi bi-file-earmark-text-fill"></i>
                  </div>
                  <div className="cag-number">{(articleCount).toLocaleString()}</div>
                  <div className="cag-label">Articles</div>
                </div>
                <div className="cag-stat">
                  <div className="cag-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                    <i className="bi bi-chat-dots-fill"></i>
                  </div>
                  <div className="cag-number">{(commentCount).toLocaleString()}</div>
                  <div className="cag-label">Comments</div>
                </div>
                <div className="cag-stat">
                  <div className="cag-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
                    <i className="bi bi-person-check-fill"></i>
                  </div>
                  <div className="cag-number">{(contributorCount).toLocaleString()}</div>
                  <div className="cag-label">Contributors</div>
                </div>
              </div>
            </div>

            {/* Join Our Community */}
            <div className="widget join-community-widget">
              <div className="jcw-icon">
                <i className="bi bi-people-fill"></i>
              </div>
              <h3>Join Our Community</h3>
              <p>Share knowledge, earn credits, and grow together with SAP security experts.</p>
              <Link to="/member/signup" className="jcw-btn-primary">
                Create Free Account
              </Link>
              <Link to="/member/login" className="jcw-btn-secondary">
                Already a member? Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
