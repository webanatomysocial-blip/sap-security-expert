import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Image from "next/image";
import BlogSidebar from "../components/BlogSidebar";
import { getLearnings } from "../services/api";

// ── Module registry ───────────────────────────────────────────────────────────
// Each entry maps a URL slug to display config + which blog categories to pull in.
export const LEARNING_MODULES = [
  {
    slug: "security-fundamentals",
    num: 1,
    title: "Security Fundamentals",
    subtitle: "Module 01",
    desc: "The ground floor of SAP Security. How SAP is structured, where security fits in, and the mental model you need before anything else makes sense.",
    color: "#3b82f6",
    icon: "bi-shield-check",
    categories: ["sap-security", "sap-s4hana-security", "sap-fiori-security", "sap-cis"],
  },
  {
    slug: "user-management",
    num: 2,
    title: "User Management",
    subtitle: "Module 02",
    desc: "How SAP users actually work — creation, maintenance, lifecycle, and the transactions you'll use every day.",
    color: "#8b5cf6",
    icon: "bi-people",
    categories: ["sap-security", "sap-iag", "sap-access-control"],
  },
  {
    slug: "role-management",
    num: 3,
    title: "Role Management",
    subtitle: "Module 03",
    desc: "The heart of SAP Security. Build, derive, and maintain the roles that drive every authorization decision.",
    color: "#f59e0b",
    icon: "bi-person-badge",
    categories: ["sap-security", "sap-access-control", "sap-grc"],
  },
  {
    slug: "authorization-concepts",
    num: 4,
    title: "Authorization Concepts",
    subtitle: "Module 04",
    desc: "The plumbing underneath roles — auth objects, fields, values, and the runtime check engine.",
    color: "#ef4444",
    icon: "bi-key",
    categories: ["sap-access-control", "sap-security", "sap-btp-security"],
  },
  {
    slug: "audit-compliance",
    num: 5,
    title: "Audit & Compliance",
    subtitle: "Module 05",
    desc: "Tracking who did what, and proving it for auditors. Logs, reports, and the SoD conversation.",
    color: "#10b981",
    icon: "bi-clipboard2-check",
    categories: ["sap-grc", "sap-process-control", "sap-cybersecurity"],
  },
  {
    slug: "grc-advanced",
    num: 6,
    title: "GRC & Advanced Topics",
    subtitle: "Module 06",
    desc: "Beyond the basics: GRC Access Control, IAG, and the enterprise governance layer.",
    color: "#e84a3d",
    icon: "bi-diagram-3",
    categories: ["sap-grc", "sap-iag", "sap-process-control", "sap-access-control"],
  },
];

const formatDate = (str) => {
  if (!str) return "";
  const d = new Date(str.includes(" ") ? str.replace(" ", "T") + "Z" : str + "T00:00:00Z");
  return isNaN(d.getTime()) ? str : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const LearningModulePage = () => {
  const { moduleSlug } = useParams();
  const module = LEARNING_MODULES.find((m) => m.slug === moduleSlug);

  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!module) { setLoading(false); return; }
    setLoading(true);
    getLearnings(module.slug)
      .then((res) => {
        const items = (Array.isArray(res.data) ? res.data : [])
          .sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
        setArticles(items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [moduleSlug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Module not found — shouldn't happen with our routes but guard anyway
  if (!module) {
    return (
      <div style={{ padding: "80px", textAlign: "center" }}>
        <h2>Module not found</h2>
        <Link to="/learning-hub" className="btn-primary" style={{ marginTop: "16px", display: "inline-block" }}>
          Back to Learning Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="category-page-wrapper">

      {/* ── Module hero header ── */}
      <div className="lm-hero" style={{ "--lm-color": module.color }}>
        <div className="container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <Link to="/learning-hub" className="breadcrumb-link">Learning Hub</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">{module.title}</span>
          </nav>

          <div className="lm-hero-inner">
            <div className="lm-hero-left">
              <div className="lm-module-badge">
                <i className={`bi ${module.icon}`} />
                {module.subtitle}
              </div>
              <h1 className="lm-hero-title">{module.title}</h1>
              <p className="lm-hero-desc">{module.desc}</p>

              <div className="lm-hero-meta">
                <span className="lm-meta-pill">
                  <i className="bi bi-journals" />
                  {loading ? "—" : articles.length} article{!loading && articles.length !== 1 ? "s" : ""}
                </span>
                <span className="lm-meta-pill lm-meta-pill--cat">
                  <i className="bi bi-bookmark-check" style={{ marginRight: "4px" }} />
                  {module.subtitle}
                </span>
              </div>
            </div>

            {/* Module number display */}
            <div className="lm-hero-num" aria-hidden>
              {String(module.num).padStart(2, "0")}
            </div>
          </div>

          {/* Module nav strip */}
          <div className="lm-module-strip">
            {LEARNING_MODULES.map((m) => (
              <Link
                key={m.slug}
                to={`/learning/${m.slug}`}
                className={`lm-strip-item${m.slug === moduleSlug ? " active" : ""}`}
                style={m.slug === moduleSlug ? { "--lm-active-color": m.color } : {}}
              >
                <span className="lm-strip-num">{String(m.num).padStart(2, "0")}</span>
                <span className="lm-strip-name">{m.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="category-content container">
        <div className="category-layout-grid">
          <div className="category-main-column">

            {loading ? (
              <div className="loading-state"><p>Loading articles…</p></div>
            ) : error ? (
              <div className="error-state"><p>Error: {error}</p></div>
            ) : articles.length === 0 ? (
              <div className="no-posts">
                <div className="lm-empty-state">
                  <i className={`bi ${module.icon} lm-empty-icon`} style={{ color: module.color }} />
                  <h3>Articles coming soon</h3>
                  <p>We're building out the {module.title} content library. Check back soon, or explore other modules while you wait.</p>
                  <Link to="/learning-hub" className="btn-primary go-home-btn">Browse all modules</Link>
                </div>
              </div>
            ) : (
              <>
                <p className="lm-results-label">
                  Showing <strong>{articles.length}</strong> article{articles.length !== 1 ? "s" : ""} in {module.title}
                </p>
                <div className="blog-grid-2-col">
                  {articles.map((article) => {
                    const img = article.author_image ? article.author_image.trim() : "";
                    const cleanImg = img === "" || img.toUpperCase() === "NULL" ? null : img;
                    const articleLink = `/learning/${article.category}/${article.slug}`;
                    return (
                      <div key={article.id} className="blog-grid-card">
                        <div className="blog-card-image">
                          <Link to={articleLink}>
                            <Image
                              src={article.image || "https://placehold.co/600x400?text=No+Image"}
                              alt={article.image_alt || article.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              style={{ objectFit: "cover" }}
                            />
                          </Link>
                          <span className="blogs-card-category-tag" style={{ background: module.color }}>
                            <i className="bi bi-journal-bookmark" style={{ marginRight: "4px" }} />
                            {module.title}
                          </span>
                        </div>

                        <div className="blog-card-content">
                          <div className="blog-meta-top">
                            <span className="blog-author" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {cleanImg ? (
                                <Image src={cleanImg} alt={article.author_name || "Author"} width={20} height={20}
                                  style={{ borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                              ) : (
                                <i className="bi bi-person-circle" />
                              )}
                              {article.author_name || article.author || "SAP Security Expert"}
                            </span>
                            <span className="blog-date">
                              <i className="bi bi-calendar3" /> {formatDate(article.date)}
                            </span>
                          </div>

                          <Link to={articleLink} className="blog-title-link">
                            <h3>{article.title}</h3>
                          </Link>

                          {article.excerpt && <p className="blog-excerpt">{article.excerpt}</p>}

                          <div className="blogs-card-footer">
                            <div className="blogs-card-stats">
                              <span><i className="bi bi-eye" /> {article.view_count || 0}</span>
                              <span><i className="bi bi-chat" /> {article.comment_count || 0}</span>
                            </div>
                            <Link to={articleLink} className="read-more-link">
                              Read More &rarr;
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
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

export default LearningModulePage;
