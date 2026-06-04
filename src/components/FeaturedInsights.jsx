import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
// blogMetadata import removed
// Removed static metadata import
import { LuEye, LuMessageSquare } from "react-icons/lu";
// next-disabled: import "../css/FeaturedInsights.css";
// next-disabled: import "../css/LatestBlogs.css"; // Import LatestBlogs styling
import { api } from "../services/api"; // Added API import

// Category mapping for tabs
const categoryMapping = {
  All: "all",
  "SAP Security": "sap-security",
  "SAP GRC & IAG": "sap-grc", // Updated label
  "SAP Cybersecurity": "sap-cybersecurity", // Updated label
};

export default function FeaturedInsights({ id }) {
  const [activeTab, setActiveTab] = useState("All");
  const [allBlogs, setAllBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch latest blogs from API
    api
      .get("/posts")
      .then((response) => {
        const data = response.data;
        const blogData = Array.isArray(data) ? data : data.data || [];

        const mappedBlogs = blogData
          .filter((b) => {
            const isApproved = ["published", "active", "approved"].includes(b.status.toLowerCase());
            const postDate = new Date(b.date || b.created_at);
            const now = new Date();
            const isLive = postDate.setHours(0,0,0,0) <= now.setHours(23,59,59,999);
            return isApproved && isLive;
          })
          .map((b) => {
            let authorImg = b.author_image ? b.author_image.trim() : "";
            if (authorImg.toUpperCase() === "NULL" || authorImg === "") {
              authorImg = null;
            }
            return {
              ...b,
              author_image: authorImg,
              image:
                b.image ||
                b.featured_image ||
                "https://placehold.co/600x400?text=No+Image",
              date:
                b.date ||
                b.published_at ||
                b.created_at ||
                new Date().toISOString(),
              slug: b.slug || b.id,
            };
          });

        setAllBlogs(mappedBlogs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching blogs:", err);
        setLoading(false);
      });
  }, []);

  // Filter blogs based on active tab
  const getFilteredBlogs = () => {
    if (loading) return [];

    if (activeTab === "All") {
      return allBlogs.slice(0, 3);
    }

    const categoryKey = categoryMapping[activeTab];
    return allBlogs
      .filter((blog) => {
        // Direct match
        if (blog.category === categoryKey || blog.subCategory === categoryKey)
          return true;

        // Parent aggregation logic
        if (categoryKey === "sap-grc") {
          return (
            blog.category === "sap-access-control" ||
            blog.subCategory === "sap-access-control" ||
            blog.category === "sap-process-control" ||
            blog.subCategory === "sap-process-control" ||
            blog.category === "sap-iag" ||
            blog.subCategory === "sap-iag"
          );
        }
        if (categoryKey === "sap-security") {
          return (
            blog.category === "sap-security" ||
            blog.category === "sap-btp-security" ||
            blog.category === "sap-public-cloud" ||
            blog.category === "sap-s4hana-security" ||
            blog.category === "sap-fiori-security"
          );
        }
        return false;
      })
      .slice(0, 3); // Limit to 3 (was 6)
  };

  const filteredBlogs = getFilteredBlogs();

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

  // Get category badge label - Reused from LatestBlogs
  const getCategoryLabel = (category, subCategory) => {
    const val = subCategory || category;
    if (!val) return "SAP Security";

    const categoryLabels = {
      "sap-grc": "SAP GRC",
      "sap-iag": "IAG",
      "sap-public-cloud": "Cloud",
      "sap-btp-security": "SAP BTP",
      "sap-cybersecurity": "Cybersecurity",
      podcasts: "Podcast",
      "expert-recommendations": "Expert Recommendations",
      "sap-access-control": "SAP Access Control",
      "sap-process-control": "SAP Process Control",
      "sap-security": "SAP Security",
    };

    if (categoryLabels[val]) return categoryLabels[val];

    // Format slug as label: "sap-security" -> "SAP Security" (handling 'sap' as special case)
    return val
      .split("-")
      .map((word) =>
        word.toLowerCase() === "sap"
          ? "SAP"
          : word.charAt(0).toUpperCase() + word.slice(1),
      )
      .join(" ");
  };

  return (
    <section
      className="featured-insights-section"
      id={id || "featured-insights"}
    >
      <div className="container">
        <div className="section-header-centered">
          <h2>Featured Insights</h2>
          <p>Curated articles & videos to help you stay ahead of the curve.</p>
        </div>

        {/* Tabs */}
        <div className="insights-tabs">
          {Object.keys(categoryMapping).map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Blog Cards Grid - Using LatestBlogs Design */}
        {/* We reuse the class names from LatestBlogs.css which should be imported or shared */}
        <div className="latest-blogs-grid">
          {filteredBlogs.map((blog) => (
            <Link
              to={`/${(blog.category || "blogs").toLowerCase().replace(/\s+/g, "-")}/${blog.slug || blog.id}`}
              key={blog.id}
              className="latest-blog-card"
            >
              <div className="latest-blog-image">
                <Image src={blog.image} alt={blog.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                {blog.is_members_only == 1 && (
                  <div className="exclusive-badge-overlay">
                    <i className="bi bi-lock-fill"></i> Exclusive
                  </div>
                )}
              </div>
              <div className="latest-blog-content">
                <span className="featured-blog-badge">
                  {getCategoryLabel(blog.category, blog.subCategory)}
                </span>
                <h3>{blog.title}</h3>
                <p className="latest-blog-excerpt">{blog.excerpt}</p>
                <div className="latest-blog-meta">
                  <span
                    className="latest-blog-author"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {blog.author_image ? (
                      <Image
                        src={blog.author_image}
                        alt={blog.author_name || blog.author}
                        width={26}
                        height={26}
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
