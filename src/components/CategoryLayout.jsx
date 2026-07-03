import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
// Removed static metadata import
import BlogSidebar from "./BlogSidebar";
// next-disabled: import "../css/CategoryPage.css";
import { getBlogs, getCommunityStats } from "../services/api";

const CATEGORY_METADATA = {
  'sap-security': {
    intro: 'SAP Security is the foundation of enterprise trust, ensuring only authorised users can execute specific business activities. This pillar covers role design (PFCG), authorization objects, Segregation of Duties, system auditing, and secure configuration of RFC and gateway destinations.',
    banner: '/assets/images/hero-sap-security.png',
  },
  'sap-grc': {
    intro: 'SAP GRC is the industry-standard suite for managing business risks, ensuring regulatory compliance, and automating control monitoring across SAP landscapes. This hub covers Access Risk Analysis (ARA) ruleset optimization, Access Request Management (ARM) workflows, Emergency Access Management (EAM) firefighter logs, and Business Role Management (BRM).',
    banner: '/assets/images/hero-sap-grc.png',
  },
  'sap-btp-security': {
    intro: 'SAP Business Technology Platform (BTP) is the integration and extension core of modern SAP architectures. Securing BTP demands deep knowledge of Cloud Identity Services (IAS/IPS), Role Collections, API security, and security monitoring.',
    banner: '/assets/images/hero-sap-btp-security.png',
  },
  'sap-public-cloud': {
    intro: 'SAP S/4HANA Cloud Public Edition shifts infrastructure responsibility to SAP while customers secure user access, integrations, and configurations. This hub covers IAM with IAS/IPS, business catalog permissions, communication arrangements, and audit strategies specific to the public cloud model.',
    banner: '/assets/images/hero-sap-public-cloud.png',
  },
  'sap-cybersecurity': {
    intro: 'Stay ahead of evolving threats and protect your SAP ecosystem. Get expert insights, best practices, and tools to strengthen your cybersecurity posture.',
    banner: '/assets/images/hero-sap-cybersecurity.png',
  },
  'sap-iag': {
    intro: 'SAP Identity Access Governance (IAG) is a cloud-native SaaS solution for governing identities across hybrid environments. This hub covers intelligent access analysis, SoD checks, automated provisioning, and machine-learning-powered risk analysis.',
    banner: '/assets/images/hero-sap-iag.png',
  },
  'sap-s4hana-security': {
    intro: 'SAP S/4HANA introduces HANA database security, Fiori UX authorizations, and a modern role design model. This pillar covers HANA user permission design, business catalog and spaces mapping, role migration from ECC, and securing S/4HANA.',
    banner: '/assets/images/hero-sap-s4hana-security.png',
  },
  'sap-fiori-security': {
    intro: 'SAP Fiori is the web-based UX gateway to SAP applications. Securing it requires tight alignment between launchpad catalogs, OData service authorizations, and back-end role design.',
    banner: '/assets/images/hero-sap-fiori-security.png',
  },
  'sap-access-control': {
    intro: 'SAP GRC Access Control prevents, detects, and mitigates authorization risks across enterprise landscapes. This hub provides practical tutorials on ARA ruleset maintenance, ARM workflow design, EAM firefighter monitoring, and BRM role governance.',
    banner: '/assets/images/hero-sap-access-control.png',
  },
  'sap-process-control': {
    intro: 'SAP GRC Process Control automates internal control design, testing, and continuous monitoring. This hub covers CCM script configuration, manual control assessments, risk frameworks, and audit-readiness strategies.',
    banner: '/assets/images/hero-sap-process-control.png',
  },
  'sap-sac-security': {
    intro: 'SAP Analytics Cloud (SAC) holds sensitive financial and operational data. This pillar covers folder-level permission architecture, row-level security, SSO via SAML 2.0, team and role governance, and secure live data connections.',
    banner: '/assets/images/hero-sap-sac-security.png',
  },
  'sap-successfactors-security': {
    intro: 'SAP SuccessFactors contains confidential HR and compensation data. This hub covers Role-Based Permissions (RBP) design, target population rules, SSO via IAS/IPS, and GDPR-compliant data privacy configurations.',
    banner: '/assets/images/hero-sap-successfactors-security.png',
  },
  'sap-cis': {
    intro: 'SAP CIS covers infrastructure-level hardening: HANA and OS security, CIS benchmarks, network layer controls, Security Audit Log configuration, and regular patch management.',
    banner: '/assets/images/hero-sap-cis.png',
  },
  'sap-security-other': {
    intro: 'SAP Security covers a vast landscape of core systems, integration touchpoints, and custom developments. This pillar explores ABAP secure coding standards, interface security (RFC/ALE/IDoc), legacy application hardening, and custom authorization design.',
    banner: '/assets/images/hero-sap-security-other.png',
  },
  'product-reviews': {
    intro: 'Get unbiased, technical reviews of SAP security products, GRC tools, cybersecurity solutions, and third-party add-ons to help you make informed software selection decisions.',
    banner: '/assets/images/hero-product-reviews.png',
  },
  'podcasts': {
    intro: 'Listen to expert voices and podcasts discussing the latest trends, challenges, and solutions in SAP security, governance, risk, compliance, and cybersecurity.',
    banner: '/assets/images/hero-podcasts.png',
  },
  'videos': {
    intro: 'Watch step-by-step video tutorials, presentations, webinars, and live demonstrations on SAP security configuration, GRC implementation, and cybersecurity hardening.',
    banner: '/assets/images/hero-videos.png',
  },
  'expert-recommendations': {
    intro: 'Handpicked books, courses, toolkits, and study materials recommended by SAP security experts to accelerate your learning and career growth.',
    banner: '/assets/images/hero-expert-recommendations.png',
  }
};

const CategoryLayout = ({ categorySlug, displayName }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [communityStats, setCommunityStats] = useState({ members: null, comments: null });

  const fmt = (n) => {
    const v = parseInt(n) || 0;
    return v >= 1000 ? (v / 1000).toFixed(1).replace(/\.0$/, "") + "K+" : String(v);
  };

  // Fetch blogs from API
  useEffect(() => {
    const fetchBlogsData = async () => {
      try {
        setLoading(true);
        const res = await getBlogs();
        if (Array.isArray(res.data)) {
          const cleaned = res.data.map((blog) => {
            let authorImg = blog.author_image ? blog.author_image.trim() : "";
            if (authorImg.toUpperCase() === "NULL" || authorImg === "") {
              authorImg = null;
            }
            return {
              ...blog,
              author_image: authorImg,
            };
          });
          setBlogs(cleaned);
        } else {
          setBlogs([]);
        }
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogsData();
  }, []);

  // Fetch community stats
  useEffect(() => {
    getCommunityStats()
      .then((res) => {
        const data = res.data;
        if (data) setCommunityStats({ members: fmt(data.total_members), comments: fmt(data.total_comments) });
      })
      .catch(() => {});
  }, []);

  // Filter blogs by category slug
  const categoryBlogs = useMemo(() => {
    if (!blogs.length) return [];

    return blogs
      .filter((blog) => {
        // Date check for public scheduling - allow today (midnight local)
        const postDate = new Date(blog.date || blog.created_at);
        const now = new Date();
        const isLive = postDate.setHours(0,0,0,0) <= now.setHours(23,59,59,999);
        if (!isLive) return false;

        // Status safety check
        if (!['approved', 'published', 'active'].includes(blog.status)) return false;

        const secCats = Array.isArray(blog.secondary_categories)
          ? blog.secondary_categories
          : (() => { try { return JSON.parse(blog.secondary_categories || "[]"); } catch { return []; } })();

        // Parent category logic: sap-security shows its sub-categories AND itself
        if (categorySlug === "sap-security") {
          const sapSecGroup = ["sap-security", "sap-btp-security", "sap-public-cloud", "sap-fiori-security", "sap-s4hana-security"];
          return sapSecGroup.includes(blog.category) || sapSecGroup.some((s) => secCats.includes(s));
        }
        if (categorySlug === "sap-grc") {
          const grcGroup = ["sap-grc", "sap-access-control", "sap-process-control", "sap-iag"];
          return (
            grcGroup.includes(blog.category) ||
            grcGroup.includes(blog.subCategory) ||
            grcGroup.some((s) => secCats.includes(s))
          );
        }
        // Direct category, legacy subCategory, or secondary_categories match
        return (
          blog.category === categorySlug ||
          blog.subCategory === categorySlug ||
          secCats.includes(categorySlug)
        );
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [blogs, categorySlug]);


  const metadata = CATEGORY_METADATA[categorySlug] || {
    intro: `Explore resources, guidelines, and articles on ${displayName}.`,
    banner: '/assets/images/hero-sap-security.png',
  };

  const contributorCount = useMemo(() => {
    if (!categoryBlogs.length) return 0;
    const authors = new Set(categoryBlogs.map(b => b.author_name || b.author).filter(Boolean));
    return authors.size;
  }, [categoryBlogs]);

  return (
    <div className="category-page-wrapper">
      {/* Header */}
      <div className="cat-hero-light" style={{ backgroundImage: `url(${metadata.banner})` }}>
        <div className="container">
          <nav className="blog-breadcrumb cat-hero-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">{displayName}</span>
          </nav>
          <div className="cat-hero-inner">
            <div className="cat-hero-text">
              <h1 className="cat-hero-title">{displayName.toUpperCase()}</h1>
              <p className="cat-hero-desc">{metadata.intro}</p>
              
              <div className="cat-stats-row">
                <div className="cat-stat-item">
                  <div className="cat-stat-icon-wrap">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div className="cat-stat-info">
                    <span className="cat-stat-number">{loading ? "—" : `${categoryBlogs.length}`}</span>
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
          </div>
        </div>
      </div>

      <div className="category-content container">
        <div className="category-layout-grid">
          {/* Main Content: Blog Grid */}
          <div className="category-main-column">
            {loading ? (
              <div className="loading-state">
                <p>Loading blogs...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>Error loading blogs: {error}</p>
                <Link to="/" className="btn-primary">
                  Go Home
                </Link>
              </div>
            ) : categoryBlogs.length === 0 ? (
              <div className="no-posts">
                <p className="no-posts-text">
                  No posts found in this category.
                </p>
                <Link to="/" className="btn-primary go-home-btn">
                  Go Home
                </Link>
              </div>
            ) : (
              <div className="blog-grid-2-col">
                {categoryBlogs.map((blog) => (
                  <div key={blog.id} className="blog-grid-card">
                    <div className="blog-card-image">
                      <Link to={`/${blog.category}/${blog.slug}`}>
                        <Image
                          src={
                            blog.image ||
                            "https://placehold.co/600x400?text=No+Image"
                          }
                          alt={blog.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          style={{ objectFit: 'cover' }}
                        />
                        {blog.is_premium == 1 && (
                          <div className="exclusive-badge" style={{ background: "#d97706" }}>
                            <i className="bi bi-star-fill"></i> Paid Article
                          </div>
                        )}
                        {blog.is_members_only == 1 && blog.is_premium != 1 && (
                          <div className="exclusive-badge">
                            <i className="bi bi-lock-fill"></i> Exclusive
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="blog-card-content">
                      <div className="blog-meta-top">
                        <span
                          className="blog-author"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {blog.author_image ? (
                            <Image
                              src={blog.author_image}
                              alt={blog.author_name || blog.author}
                              width={24}
                              height={24}
                              style={{
                                borderRadius: "50%",
                                objectFit: "cover",
                                border: "1px solid #e2e8f0",
                                flexShrink: 0,
                              }}
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://placehold.co/100x100?text=Author";
                              }}
                            />
                          ) : (
                            <i className="bi bi-person-circle"></i>
                          )}
                          {blog.author_name || "Guest Author"}
                        </span>
                        <span className="blog-date">
                          <i className="bi bi-calendar3"></i>{" "}
                          {(() => {
                            const d = new Date(blog.date);
                            return isNaN(d.getTime())
                              ? blog.date
                              : d.toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                });
                          })()}
                        </span>
                      </div>

                      {blog.difficulty_level && (() => {
                        const LEVEL = { Beginner: { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" }, Intermediate: { color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" }, Advanced: { color: "#7c3aed", bg: "#faf5ff", border: "#ddd6fe" }, Expert: { color: "#b45309", bg: "#fffbeb", border: "#fde68a" }, Enterprise: { color: "#be123c", bg: "#fff1f2", border: "#fecdd3" } };
                        const m = LEVEL[blog.difficulty_level];
                        return m ? (
                          <span style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: m.bg, color: m.color, border: `1.5px solid ${m.border}`, marginBottom: "6px" }}>
                            {blog.difficulty_level}
                          </span>
                        ) : null;
                      })()}

                      <Link
                        to={`/${blog.category}/${blog.slug}`}
                        className="blog-title-link"
                      >
                        <h3>{blog.title}</h3>
                      </Link>

                      {blog.excerpt && (
                        <p className="blog-excerpt">{blog.excerpt}</p>
                      )}

                      <Link
                        to={`/${blog.category}/${blog.slug}`}
                        className="read-more-link"
                      >
                        Read More &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
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

export default CategoryLayout;
