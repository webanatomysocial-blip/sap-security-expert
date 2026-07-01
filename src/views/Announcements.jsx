import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import BlogSidebar from "../components/BlogSidebar";
import { getPublicAnnouncements, getCommunityStats } from "../services/api";

const formatDate = (str) => {
  if (!str) return "";
  const d = new Date(str.includes(" ") ? str.replace(" ", "T") + "Z" : str + "T00:00:00Z");
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const Announcements = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [communityStats, setCommunityStats] = useState({ members: null, comments: null });

  const fmt = (n) => {
    const v = parseInt(n) || 0;
    return v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "K+" : String(v);
  };

  useEffect(() => {
    getPublicAnnouncements()
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getCommunityStats()
      .then((res) => {
        const data = res.data;
        if (data) setCommunityStats({ members: fmt(data.total_members), comments: fmt(data.total_comments) });
      })
      .catch(() => {});
  }, []);

  const hasDetail = (item) => !!(item.slug && (item.content || item.image));

  return (
    <div className="category-page-wrapper">

      {/* Header */}
      <div className="cat-hero">
        <div className="container">
          <nav className="blog-breadcrumb cat-hero-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">Announcements</span>
          </nav>
          <div className="cat-hero-inner">
            <div className="cat-hero-text">
              <h1 className="cat-hero-title">ANNOUNCEMENTS</h1>
              <p className="cat-hero-desc">Stay up to date with the latest news, updates, and important information from SAP Security Expert.</p>
              
              <div className="cat-stats-row">
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{loading ? "—" : items.length}</span>
                    <span className="cat-stat-label">Announcements</span>
                  </div>
                </div>
                
                <div className="cat-stat-divider"></div>
                
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 11 2 2 4-4" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{communityStats.members || "—"}</span>
                    <span className="cat-stat-label">Community Members</span>
                  </div>
                </div>
                
                <div className="cat-stat-divider"></div>
                
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{communityStats.comments || "—"}</span>
                    <span className="cat-stat-label">Discussions</span>
                  </div>
                </div>
                
              </div>
            </div>
            <div className="cat-hero-illustration-new">
              <img src="/assets/images/sap-announcements.png" alt="Announcements" />
            </div>
          </div>
        </div>
      </div>

      <div className="category-content container">
        <div className="category-layout-grid">

          {/* Main column */}
          <div className="category-main-column">
            {loading ? (
              <div className="loading-state"><p>Loading announcements…</p></div>
            ) : error ? (
              <div className="error-state">
                <p>Error loading announcements: {error}</p>
                <Link to="/" className="btn-primary">Go Home</Link>
              </div>
            ) : items.length === 0 ? (
              <div className="no-posts">
                <p className="no-posts-text">No announcements yet. Check back soon.</p>
                <Link to="/" className="btn-primary go-home-btn">Go Home</Link>
              </div>
            ) : (
              <div className="blog-grid-2-col">
                {items.map((item) => {
                  const linkTo = hasDetail(item) ? `/announcements/${item.slug}` : null;
                  return (
                    <div key={item.id} className="blog-grid-card">
                      <div className="blog-card-image">
                        {linkTo ? (
                          <Link to={linkTo}>
                            <Image
                              src={item.image || "https://placehold.co/600x400?text=Announcement"}
                              alt={item.image_alt || item.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              style={{ objectFit: "cover" }}
                            />
                          </Link>
                        ) : (
                          <div style={{ position: "relative", width: "100%", height: "100%", background: "linear-gradient(135deg,#0f172a,#1e3a5f)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-megaphone-fill" style={{ fontSize: "2.5rem", color: "rgba(255,255,255,.25)" }} />
                          </div>
                        )}
                        {/* Announcement badge */}
                        <span className="blogs-card-category-tag">Announcement</span>
                      </div>

                      <div className="blog-card-content">
                        <div className="blog-meta-top">
                          <span className="blog-author" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <i className="bi bi-megaphone" />
                            SAP Security Expert
                          </span>
                          <span className="blog-date">
                            <i className="bi bi-calendar3" /> {formatDate(item.date || item.created_at)}
                          </span>
                        </div>

                        {linkTo ? (
                          <Link to={linkTo} className="blog-title-link">
                            <h3>{item.title}</h3>
                          </Link>
                        ) : (
                          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: "8px 0" }}>{item.title}</h3>
                        )}

                        {item.excerpt && (
                          <p className="blog-excerpt">{item.excerpt}</p>
                        )}

                        <div className="blogs-card-footer">
                          <div className="blogs-card-stats">
                            {item.views > 0 && <span><i className="bi bi-eye" /> {item.views}</span>}
                          </div>
                          {linkTo ? (
                            <Link to={linkTo} className="read-more-link">Read More &rarr;</Link>
                          ) : item.link ? (
                            <a href={item.link} target="_blank" rel="noopener noreferrer" className="read-more-link">
                              View &rarr;
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="category-sidebar-column">
            <BlogSidebar />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Announcements;
