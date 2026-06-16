import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
// Removed static metadata import
import BlogSidebar from "./BlogSidebar";
// next-disabled: import "../css/CategoryPage.css";
import { getBlogs } from "../services/api";

const CategoryLayout = ({ categorySlug, displayName }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  return (
    <div className="category-page-wrapper">
      {/* Header */}
      <div className="category-header-section">
        <div className="container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right"></i></span>
            <span className="breadcrumb-current">{displayName}</span>
          </nav>
          <h1>{displayName}</h1>
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
                            <i className="bi bi-star-fill"></i> Premium
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
