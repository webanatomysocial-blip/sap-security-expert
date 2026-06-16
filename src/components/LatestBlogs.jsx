import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
// Removed static metadata import
// Removed static metadata import
import { LuEye, LuMessageSquare } from "react-icons/lu";
import { api } from "../services/api"; // Added API import
// next-disabled: import "../css/LatestBlogs.css";
export default function LatestBlogs() {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    // Fetch latest blogs from API
    api
      .get("/posts")
      .then((response) => {
        const data = response.data;
        // Ensure data is an array
        const blogData = Array.isArray(data) ? data : data.data || [];

        // Map and validate data to prevent crashes
        const mappedData = blogData
          .filter(
            (b) =>
              (b.status === "published" ||
                b.status === "active" ||
                b.status === "approved") &&
              new Date(b.date || b.created_at) <= new Date(),
          ) // Ensure only live blogs/announcements show
          .map((b) => ({
            ...b,
            // Ensure valid date or fallback to now
            date:
              b.date ||
              b.published_at ||
              b.created_at ||
              new Date().toISOString(),
            image:
              b.image ||
              b.featured_image ||
              "https://placehold.co/600x400?text=No+Image",
            slug: b.slug || b.id,
          }));

        // Sort by date descending and take latest 6
        const sorted = mappedData
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 6);
        setBlogs(sorted);
      })
      .catch((err) => console.error("Error fetching blogs:", err));
  }, []);

  // No fallback to static metadata - API Source of Truth
  const latestBlogs = blogs;

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(
      dateString.includes("T")
        ? dateString
        : dateString.replace(" ", "T") + "Z",
    );
    if (isNaN(date.getTime())) {
      const d2 = new Date(dateString + "T00:00:00Z");
      if (isNaN(d2.getTime())) return dateString;
      return d2.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get category badge label
  const getCategoryLabel = (category, subCategory) => {
    const categoryLabels = {
      "sap-grc": "SAP GRC",
      "sap-iag": "IAM",
      "sap-public-cloud": "Cloud",
      "sap-btp-security": "Cybersecurity",
      "sap-cybersecurity": "Cybersecurity",
      podcasts: "Podcast",
      "expert-recommendations": "Expert Recommendations",
      "sap-access-control": "SAP Access Control",
    };

    return (
      categoryLabels[subCategory] || categoryLabels[category] || "SAP Security"
    );
  };

  return (
    <section className="latest-blogs-section">
      <div className="container">
        <div className="section-header-centered">
          <h2>Latest Blogs & Activity</h2>
          <p>
            Stay updated with the latest insights from our SAP security experts.
          </p>
        </div>

        {/* Blog Cards Grid */}
        <div className="latest-blogs-grid">
          {latestBlogs.map((blog) => (
            <Link
              to={`/${(blog.category || "blogs").toLowerCase().replace(/\s+/g, "-")}/${blog.slug || blog.id}`}
              key={blog.id}
              className="latest-blog-card"
            >
              <div className="latest-blog-image">
                <Image src={blog.image} alt={blog.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                <span className="latest-blog-badge">
                  {getCategoryLabel(blog.category, blog.subCategory)}
                </span>
                {blog.is_premium == 1 && (
                  <div className="exclusive-badge-overlay" style={{ background: "#d97706" }}>
                    <i className="bi bi-star-fill"></i> Premium
                  </div>
                )}
                {blog.is_members_only == 1 && blog.is_premium != 1 && (
                  <div className="exclusive-badge-overlay">
                    <i className="bi bi-lock-fill"></i> Exclusive
                  </div>
                )}
              </div>
              <div className="latest-blog-content">
                <h3>{blog.title}</h3>
                <p className="latest-blog-excerpt">
                  {blog.excerpt || (blog.content ? blog.content.replace(/<[^>]*>/g, "").slice(0, 120) + "..." : "Explore more about this topic in our latest post.")}
                </p>
                <div className="latest-blog-meta">
                  <span className="latest-blog-author">
                    <i className="bi bi-person-circle"></i>{" "}
                    {blog.author_name || "Raghu Boddu"}
                  </span>
                  <div className="latest-blog-stats">
                    <span>
                      <i className="bi bi-eye"></i>{" "}
                      {blog.view_count || blog.views || 0}
                    </span>
                    <span>
                      <i className="bi bi-chat"></i> {blog.comment_count || 0}
                    </span>
                  </div>
                </div>
                <div className="latest-blog-footer">
                  <span className="latest-blog-date">
                    <i className="bi bi-calendar3"></i> {formatDate(blog.date)}
                  </span>
                  <span className="read-more">Read More →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
