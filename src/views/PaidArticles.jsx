import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Image from "next/image";
import BlogSidebar from "../components/BlogSidebar";
import { getBlogs, getMyUnlocks, getCommunityStats } from "../services/api";
import { useMemberAuth } from "../context/MemberAuthContext";

const PaidArticles = () => {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();

  const [blogs, setBlogs] = useState([]);
  const [unlockedSlugs, setUnlockedSlugs] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [communityStats, setCommunityStats] = useState({ members: null, comments: null });

  const fmt = (n) => {
    const v = parseInt(n) || 0;
    return v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "K+" : String(v);
  };

  useEffect(() => {
    getCommunityStats()
      .then((res) => {
        const data = res.data;
        if (data) setCommunityStats({ members: fmt(data.total_members), comments: fmt(data.total_comments) });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/member/login?return=/paid-articles");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const [blogsRes, unlocksRes] = await Promise.all([
          getBlogs(),
          getMyUnlocks(),
        ]);

        if (Array.isArray(blogsRes.data)) {
          const cleaned = blogsRes.data.map((b) => {
            let authorImg = b.author_image ? b.author_image.trim() : "";
            if (authorImg.toUpperCase() === "NULL" || authorImg === "") authorImg = null;
            return { ...b, author_image: authorImg };
          });
          setBlogs(cleaned);
        }

        const slugs = (unlocksRes.data?.unlocks || []).map((u) => u.blog_slug);
        setUnlockedSlugs(new Set(slugs));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isLoggedIn, navigate]);

  const paidBlogs = useMemo(() => {
    return blogs
      .filter((b) => {
        if (!["approved", "published", "active"].includes(b.status)) return false;
        return Number(b.is_premium) === 1;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [blogs]);

  const unlockedBlogs = useMemo(
    () => paidBlogs.filter((b) => unlockedSlugs.has(b.slug)),
    [paidBlogs, unlockedSlugs]
  );

  const lockedBlogs = useMemo(
    () => paidBlogs.filter((b) => !unlockedSlugs.has(b.slug)),
    [paidBlogs, unlockedSlugs]
  );

  const formatDate = (d) => {
    const dt = new Date(d);
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };

  const BlogCard = ({ blog, unlocked }) => (
    <div className="blog-grid-card" style={{ position: "relative" }}>
      <div className="blog-card-image">
        <Link to={`/${blog.category}/${blog.slug}`}>
          <Image
            src={blog.image || "https://placehold.co/600x400?text=No+Image"}
            alt={blog.title}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            style={{ objectFit: "cover", filter: unlocked ? "none" : "brightness(0.6)" }}
          />
          <div className="exclusive-badge" style={{ background: "#d97706" }}>
            <i className="bi bi-star-fill"></i> PREMIUM
          </div>
          {unlocked && (
            <div
              className="exclusive-badge"
              style={{ background: "#16a34a", top: "auto", bottom: 8, right: 8, left: "auto" }}
            >
              <i className="bi bi-unlock-fill"></i> Unlocked
            </div>
          )}
          {!unlocked && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i className="bi bi-lock-fill" style={{ color: "#fff", fontSize: "2rem", opacity: 0.8 }}></i>
            </div>
          )}
        </Link>
      </div>
      <div className="blog-card-content">
        <div className="blog-meta-top">
          <span className="blog-author" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {blog.author_image ? (
              <Image
                src={blog.author_image}
                alt={blog.author_name || blog.author}
                width={24}
                height={24}
                style={{ borderRadius: "50%", objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 }}
                onError={(e) => { e.currentTarget.src = "https://placehold.co/100x100?text=Author"; }}
              />
            ) : (
              <i className="bi bi-person-circle"></i>
            )}
            {blog.author_name || "Guest Author"}
          </span>
          <span className="blog-date">
            <i className="bi bi-calendar3"></i> {formatDate(blog.date)}
          </span>
        </div>

        <Link to={`/${blog.category}/${blog.slug}`} className="blog-title-link">
          <h3>{blog.title}</h3>
        </Link>

        {blog.excerpt && <p className="blog-excerpt">{blog.excerpt}</p>}

        {unlocked ? (
          <Link to={`/${blog.category}/${blog.slug}`} className="read-more-link">
            Read Article &rarr;
          </Link>
        ) : (
          <Link to={`/${blog.category}/${blog.slug}`} className="read-more-link" style={{ color: "#d97706" }}>
            <i className="bi bi-lock-fill"></i> Unlock to Read
          </Link>
        )}
      </div>
    </div>
  );

  const contributorCount = useMemo(() => {
    if (!paidBlogs.length) return 0;
    const authors = new Set(paidBlogs.map(b => b.author_name || b.author).filter(Boolean));
    return authors.size;
  }, [paidBlogs]);

  return (
    <div className="category-page-wrapper">
      {/* Header */}
      <div className="cat-hero-light">
        <div className="container">
          <nav className="blog-breadcrumb cat-hero-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">Paid Articles</span>
          </nav>
          <div className="cat-hero-inner">
            <div className="cat-hero-text">
              <h1 className="cat-hero-title">PAID ARTICLES</h1>
              <p className="cat-hero-desc">Premium in-depth content unlocked with credits</p>
              
              <div className="cat-stats-row">
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{loading ? "—" : `${paidBlogs.length}`}</span>
                    <span className="cat-stat-label">Articles</span>
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
                    <span className="cat-stat-number">{loading ? "—" : `${contributorCount || 1}`}</span>
                    <span className="cat-stat-label">Expert Contributors</span>
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
                    <span className="cat-stat-number">{communityStats.members || "4.3K+"}</span>
                    <span className="cat-stat-label">Community Members</span>
                  </div>
                </div>
                
                <div className="cat-stat-divider"></div>
                
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{communityStats.comments || "1.7K+"}</span>
                    <span className="cat-stat-label">Discussions</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="cat-hero-illustration-new">
              <img src="/assets/images/sap-security.png" alt="Paid Articles" />
            </div>
          </div>
        </div>
      </div>

      <div className="category-content container">
        <div className="category-layout-grid">
          <div className="category-main-column">
            {loading ? (
              <div className="blog-grid-2-col">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skel-card">
                    <div className="skel-block skel-image" />
                    <div className="skel-block skel-line w-40" />
                    <div className="skel-block skel-line w-90" />
                    <div className="skel-block skel-line w-70" />
                    <div className="skel-block skel-line w-50" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="error-state"><p>Error: {error}</p></div>
            ) : paidBlogs.length === 0 ? (
              <div className="no-posts">
                <p className="no-posts-text">No paid articles available yet.</p>
                <Link to="/" className="btn-primary go-home-btn">Go Home</Link>
              </div>
            ) : (
              <>
                {unlockedBlogs.length > 0 && (
                  <section style={{ marginBottom: "48px" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="bi bi-unlock-fill" style={{ color: "#16a34a" }}></i>
                      Your Unlocked Articles ({unlockedBlogs.length})
                    </h2>
                    <div className="blog-grid-2-col">
                      {unlockedBlogs.map((blog) => (
                        <BlogCard key={blog.id} blog={blog} unlocked={true} />
                      ))}
                    </div>
                  </section>
                )}

                {lockedBlogs.length > 0 && (
                  <section>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="bi bi-star-fill" style={{ color: "#d97706" }}></i>
                      All Paid Articles ({lockedBlogs.length})
                    </h2>
                    <div className="blog-grid-2-col">
                      {lockedBlogs.map((blog) => (
                        <BlogCard key={blog.id} blog={blog} unlocked={false} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          <div className="category-sidebar-column">
            <BlogSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaidArticles;
