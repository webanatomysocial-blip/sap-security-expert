import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import BlogSidebar from "./BlogSidebar";
import { getBlogs } from "../services/api";

const CATEGORY_LABELS = {
  "sap-security": "SAP Security",
  "sap-s4hana-security": "SAP S/4HANA",
  "sap-fiori-security": "SAP Fiori",
  "sap-btp-security": "SAP BTP",
  "sap-public-cloud": "Public Cloud",
  "sap-sac-security": "SAP SAC",
  "sap-cis": "SAP CIS",
  "sap-successfactors-security": "SuccessFactors",
  "sap-security-other": "Other",
  "sap-access-control": "Access Control",
  "sap-process-control": "Process Control",
  "sap-iag": "SAP IAG",
  "sap-grc": "SAP GRC",
  "sap-cybersecurity": "Cybersecurity",
  "product-reviews": "Product Reviews",
  "podcasts": "Podcasts",
  "videos": "Videos",
  "expert-recommendations": "Expert Recs",
};

const FILTER_TABS = [
  { value: "all", label: "All" },
  { value: "sap-security", label: "SAP Security" },
  { value: "sap-grc", label: "GRC" },
  { value: "sap-btp-security", label: "BTP" },
  { value: "sap-s4hana-security", label: "S/4HANA" },
  { value: "sap-fiori-security", label: "Fiori" },
  { value: "sap-cybersecurity", label: "Cybersecurity" },
  { value: "product-reviews", label: "Reviews" },
  { value: "podcasts", label: "Podcasts" },
];

const formatDate = (str) => {
  if (!str) return "";
  const d = new Date(str);
  return isNaN(d.getTime())
    ? str
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    getBlogs()
      .then((res) => {
        const sorted = (Array.isArray(res.data) ? res.data : [])
          .filter((b) => b.status === "approved" || b.status === "published")
          .map((b) => {
            const img = b.author_image ? b.author_image.trim() : "";
            let co = [];
            if (b.co_authors) {
              try { co = Array.isArray(b.co_authors) ? b.co_authors : JSON.parse(b.co_authors); } catch { co = []; }
            }
            return { ...b, author_image: img.toUpperCase() === "NULL" || img === "" ? null : img, co_authors: co };
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setBlogs(sorted);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return blogs.filter((b) => {
      const matchCat = activeCategory === "all" || b.category === activeCategory;
      const matchSearch =
        !search ||
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        (b.author_name || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [blogs, activeCategory, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <div className="category-page-wrapper">

      {/* ── Hero header ── */}
      <div className="blogs-all-header">
        <div className="container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">All Blogs</span>
          </nav>

          <div className="blogs-all-header-inner">
            <div>
              <h1>All Blogs &amp; Articles</h1>
              <p>Expert tutorials, best practices, and deep-dives across SAP Security, GRC, BTP, and more.</p>
            </div>
            <div className="blogs-all-count">
              <strong>{loading ? "—" : blogs.length}</strong>
              <span>articles</span>
            </div>
          </div>

          {/* Search */}
          <div className="blogs-all-search">
            <i className="bi bi-search" />
            <input
              type="text"
              placeholder="Search by title or author…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setVisibleCount(12); }}
            />
            {search && (
              <button className="blogs-search-clear" onClick={() => setSearch("")}>
                <i className="bi bi-x" />
              </button>
            )}
          </div>

          {/* Category filter tabs */}
          <div className="blogs-all-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                className={`blogs-all-tab${activeCategory === tab.value ? " active" : ""}`}
                onClick={() => { setActiveCategory(tab.value); setVisibleCount(12); }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="category-content container">
        <div className="category-layout-grid">
          <div className="category-main-column">

            {/* Result count */}
            {!loading && !error && (
              <div className="blogs-all-result-count">
                {search || activeCategory !== "all" ? (
                  <span>
                    <strong>{filtered.length}</strong> result{filtered.length !== 1 ? "s" : ""}
                    {search && <> for "<em>{search}</em>"</>}
                    {activeCategory !== "all" && <> in <em>{CATEGORY_LABELS[activeCategory] || activeCategory}</em></>}
                    <button className="blogs-clear-filters" onClick={() => { setSearch(""); setActiveCategory("all"); setVisibleCount(12); }}>
                      Clear filters
                    </button>
                  </span>
                ) : (
                  <span>Showing <strong>{Math.min(visibleCount, filtered.length)}</strong> of <strong>{filtered.length}</strong> articles</span>
                )}
              </div>
            )}

            {loading ? (
              <div className="loading-state"><p>Loading blogs…</p></div>
            ) : error ? (
              <div className="error-state">
                <p>Error loading blogs: {error}</p>
                <Link to="/" className="btn-primary">Go Home</Link>
              </div>
            ) : filtered.length === 0 ? (
              <div className="no-posts">
                <p className="no-posts-text">No posts match your search.</p>
                <button className="btn-primary" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="blog-grid-2-col">
                  {visible.map((blog) => (
                    <div key={blog.id} className="blog-grid-card">
                      <div className="blog-card-image">
                        <Link to={`/${blog.category}/${blog.slug}`}>
                          <Image
                            src={blog.image || "https://placehold.co/600x400?text=No+Image"}
                            alt={blog.image_alt || blog.title}
                            fill
                            sizes="(max-width: 768px) 100vw, 300px"
                            style={{ objectFit: "cover" }}
                          />
                          {blog.is_premium == 1 && (
                            <div className="exclusive-badge" style={{ background: "#d97706" }}>
                              <i className="bi bi-star-fill" /> Premium
                            </div>
                          )}
                          {blog.is_members_only == 1 && blog.is_premium != 1 && (
                            <div className="exclusive-badge">
                              <i className="bi bi-lock-fill" /> Exclusive
                            </div>
                          )}
                        </Link>
                        {blog.category && CATEGORY_LABELS[blog.category] && (
                          <span className="blogs-card-category-tag">
                            {CATEGORY_LABELS[blog.category]}
                          </span>
                        )}
                      </div>
                      <div className="blog-card-content">
                        <div className="blog-meta-top">
                          <span className="blog-author" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {blog.author_image ? (
                              <Image
                                src={blog.author_image}
                                alt={blog.author_name || "Author"}
                                width={20}
                                height={20}
                                style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                              />
                            ) : (
                              <i className="bi bi-person-circle" />
                            )}
                            {blog.author_name || "SAP Security Expert"}
                            {blog.co_authors && blog.co_authors.length > 0 && (
                              <span style={{
                                fontSize: "10px",
                                fontWeight: 700,
                                background: "#ede9fe",
                                color: "#5b21b6",
                                borderRadius: "4px",
                                padding: "1px 6px",
                              }}>
                                +{blog.co_authors.length}
                              </span>
                            )}
                          </span>
                          <span className="blog-date">
                            <i className="bi bi-calendar3" /> {formatDate(blog.date)}
                          </span>
                        </div>

                        <Link to={`/${blog.category}/${blog.slug}`} className="blog-title-link">
                          <h3>{blog.title}</h3>
                        </Link>

                        {blog.excerpt && (
                          <p className="blog-excerpt">{blog.excerpt}</p>
                        )}

                        <div className="blogs-card-footer">
                          <div className="blogs-card-stats">
                            <span><i className="bi bi-eye" /> {blog.view_count || 0}</span>
                            <span><i className="bi bi-chat" /> {blog.comment_count || 0}</span>
                          </div>
                          <Link to={`/${blog.category}/${blog.slug}`} className="read-more-link">
                            Read More &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="blogs-load-more">
                    <button className="blogs-load-more-btn" onClick={() => setVisibleCount((c) => c + 12)}>
                      Load more articles
                      <i className="bi bi-arrow-down" />
                    </button>
                    <span className="blogs-load-more-count">
                      {filtered.length - visibleCount} more to load
                    </span>
                  </div>
                )}
              </>
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

export default Blogs;
