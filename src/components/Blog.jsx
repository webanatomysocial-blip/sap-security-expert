import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
// Removed static metadata import
// next-disabled: import "../css/CategoryPage.css";
import BlogSidebar from "./BlogSidebar";
import { getBlogs } from "../services/api";

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch blogs from API
  useEffect(() => {
    const fetchBlogsData = async () => {
      try {
        setLoading(true);
        const res = await getBlogs();
        // Sort by date desc
        const sorted = (Array.isArray(res.data) ? res.data : [])
          .filter((b) => b.status === 'approved' || b.status === 'published')
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setBlogs(sorted);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogsData();
  }, []);

  return (
    <div className="category-page-wrapper">
      {/* Header */}
      <div className="category-header-section">
        <div className="container">
          <div className="breadcrumbs">
            <Link to="/">Home</Link> &gt; <span>All Blogs</span>
          </div>
          <h1>All Blogs</h1>
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
            ) : blogs.length === 0 ? (
              <div className="no-posts">
                <p>No posts found.</p>
                <Link to="/" className="btn-primary">
                  Go Home
                </Link>
              </div>
            ) : (
              <div className="blog-grid-2-col">
                {blogs.map((blog) => (
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
                        {blog.is_members_only == 1 && (
                          <div className="exclusive-badge">
                            <i className="bi bi-lock-fill"></i> Exclusive
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="blog-card-content">
                      <div className="blog-meta-top">
                        <span className="blog-author">
                          <i className="bi bi-person-circle"></i>{" "}
                          {blog.author_name || "Raghu Boddu"}
                        </span>
                        <span className="blog-date">
                          <i className="bi bi-calendar3"></i>{" "}
                          {new Date(blog.date).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <Link
                        to={`/${blog.category}/${blog.slug}`}
                        className="blog-title-link"
                      >
                        <h3>{blog.title}</h3>
                      </Link>

                      <p className="blog-excerpt">
                        {blog.excerpt || (blog.content ? blog.content.replace(/<[^>]*>/g, "").slice(0, 160) + "..." : "No description available.")}
                      </p>

                      <div
                        className="latest-blog-stats"
                        style={{
                          marginTop: "10px",
                          fontSize: "0.85rem",
                          color: "#666",
                        }}
                      >
                        <span style={{ marginRight: "15px" }}>
                          <i className="bi bi-eye"></i> {blog.view_count || 0}
                        </span>
                        <span>
                          <i className="bi bi-chat"></i>{" "}
                          {blog.comment_count || 0}
                        </span>
                      </div>

                      <Link
                        to={`/${blog.category}/${blog.slug}`}
                        className="read-more-link"
                        style={{ marginTop: "15px" }}
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

export default Blogs;
