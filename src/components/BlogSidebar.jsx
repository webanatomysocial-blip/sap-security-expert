import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import Image from "next/image";
// Removed static categories import
// next-disabled: import "../css/BlogSidebar.css";
import { getCategories, getBlogs, getAdsByZone } from "../services/api";

const BlogSidebar = ({ sidebarAd: propSidebarAd = {}, relatedBlogs = [] }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const handleAdClick = (zone) => {
    import("../services/api").then(({ trackAdClick }) => {
      trackAdClick(zone).catch(() => {});
    });
  };
  const [sidebarAd, setSidebarAd] = useState(
    propSidebarAd && propSidebarAd.active
      ? propSidebarAd
      : {
          active: false,
          image: "",
          link: "",
        },
  );

  // Sync prop changes via useEffect to avoid re-render loops
  useEffect(() => {
    if (propSidebarAd && propSidebarAd.active) {
      setSidebarAd(propSidebarAd);
    }
  }, [propSidebarAd]);

  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Categories State
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Helper to format slug to name
  const formatCategoryName = (slug) => {
    if (!slug) return "";
    // Manual overrides for specific acronyms
    const overrides = {
      "sap-grc": "SAP GRC",
      "sap-iag": "SAP IAG",
      "sap-cis": "SAP CIS (IAS/IPS)",
      "sap-sac-security": "SAP SAC Security",
      "sap-btp-security": "SAP BTP Security",
      "sap-s4hana-security": "SAP S/4HANA Security",
      "sap-fiori-security": "SAP Fiori Security",
      "sap-public-cloud": "SAP Public Cloud",
      "sap-successfactors-security": "SuccessFactors",
      "sap-security-other": "Other SAP Security",
      "sap-access-control": "SAP Access Control",
      "sap-process-control": "SAP Process Control",
      "sap-cybersecurity": "SAP Cybersecurity",
      "sap-licensing": "SAP Licensing",
    };
    if (overrides[slug]) return overrides[slug];

    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Fetch Categories
  useEffect(() => {
    getCategories()
      .then((res) => {
        const data = res.data;
        if (data.status === "success") {
          setCategories(data.categories || []);
        }
        setLoadingCategories(false);
      })
      .catch((err) => {
        console.error("Error fetching categories:", err);
        setLoadingCategories(false);
      });
  }, []);

  // Fetch Posts for Search & Latest
  useEffect(() => {
    getBlogs()
      .then((res) => {
        const data = res.data;
        const posts = Array.isArray(data) ? data : data.data || [];
        const mapped = posts.map((b) => ({
          ...b,
          slug: b.slug || b.id,
          date: b.date || b.published_at || b.created_at,
        }));
        setAllPosts(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching posts for sidebar:", err);
        setLoading(false);
      });
  }, []);

  // Fetch Ads (if not provided by prop)
  useEffect(() => {
    if (!sidebarAd.active && (!propSidebarAd || !propSidebarAd.active)) {
      getAdsByZone("blog_sidebar")
        .then((res) => {
          const data = res.data;
          if (Array.isArray(data) && data.length > 0) {
            const ad = data[0];
            setSidebarAd({
              active: true,
              image: ad.image,
              link: ad.link,
            });
          } else if (data && data.active) {
            setSidebarAd(data);
          } else {
            setSidebarAd({ active: false });
          }
        })
        .catch((err) => console.error("Error fetching ads:", err));
    }
  }, [propSidebarAd, sidebarAd.active]);

  const filteredPosts = allPosts
    .filter((post) => {
      const postDate = new Date(post.date || post.created_at);
      const now = new Date();
      const isLive =
        (post.status === "published" ||
          post.status === "active" ||
          post.status === "approved") &&
        postDate.setHours(0,0,0,0) <= now.setHours(23,59,59,999);
      if (!isLive) return false;

      return post.title
        ? post.title.toLowerCase().includes(searchTerm.toLowerCase())
        : false;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const highlightSearch = (text) => {
    if (!searchTerm.trim()) return text;
    const parts = text.split(new RegExp(`(${searchTerm})`, "gi"));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <span key={i} className="search-highlight">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <aside className="blog-sidebar">
      {/* Search Widget */}
      <div className="sidebar-widget search-widget">
        <div className="search-form">
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="button" aria-label="Search">
            <BsSearch />
          </button>
        </div>
      </div>

      {/* Latest Posts Widget (or Search Results) */}
      <div className="sidebar-widget latest-posts-widget">
        <h3 className="widget-title">
          {searchTerm ? "Search Results" : "Latest Posts"}
        </h3>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul className="latest-posts-list">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <li key={post.id} className="latest-post-item">
                  <Link to={`/${(post.category || "blogs").toLowerCase().replace(/\s+/g, "-")}/${post.slug || post.id}`}>
                    {highlightSearch(post.title)}
                    {Number(post.is_members_only) === 1 && (
                      <span className="sidebar-exclusive-tag">
                        <i className="bi bi-lock-fill"></i> Exclusive
                      </span>
                    )}
                  </Link>
                </li>
              ))
            ) : (
              <li className="latest-post-item">No posts found.</li>
            )}
          </ul>
        )}
      </div>

      {/* Categories Widget */}
      <div className="sidebar-widget categories-widget">
        <h3 className="widget-title">Categories</h3>
        {loadingCategories ? (
          <p>Loading categories...</p>
        ) : (
          <ul className="categories-list">
            <li>
              <Link to="/blogs" className="cat-link-all">
                All Categories
              </Link>
            </li>
            {categories.map((slug, idx) => (
              <li key={idx}>
                <Link to={`/${slug}`}>{formatCategoryName(slug)}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dynamic Sidebar Ad */}
      {sidebarAd.active && (
        <div
          className="sidebar-widget-img promo-widget"
          style={{ textAlign: "center", marginTop: "20px" }}
        >
          <a
            href={sidebarAd.link || "#"}
            target={sidebarAd.link ? "_blank" : "_self"}
            rel="noopener noreferrer"
            onClick={() => handleAdClick("blog_sidebar")}
          >
            <Image
              src={sidebarAd.image}
              alt="Sidebar Ad"
              width={300}
              height={300}
              style={{
                objectFit: "contain",
                display: "block",
                margin: "0 auto",
              }}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </a>
        </div>
      )}

      {/* Related Blogs Widget */}
      {relatedBlogs && relatedBlogs.length > 0 && (
        <div className="sidebar-widget related-blogs-highlight" style={{ marginTop: "30px" }}>
          <h3 className="widget-title">Related Blogs</h3>
          <ul className="latest-posts-list">
            {relatedBlogs.map((post) => {
              const categorySlug = (post.category || "blogs").toLowerCase().replace(/\s+/g, "-");
              const displayImage = post.image || post.featured_image;
              return (
                <li key={post.id} className="latest-post-item related-post-item">
                  <Link to={`/${categorySlug}/${post.slug || post.id}`} className="related-post-link">
                    <div className="related-post-img-wrapper">
                      <Image 
                        src={displayImage || "https://placehold.co/80x60?text=SAP"} 
                        alt={post.title} 
                        width={80}
                        height={60}
                        className="related-post-img"
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          e.currentTarget.src = "https://placehold.co/80x60?text=SAP";
                        }}
                      />
                    </div>
                    <div className="related-post-content">
                      <span className="related-post-title">{post.title}</span>
                      {Number(post.is_members_only) === 1 && (
                        <span className="sidebar-exclusive-tag">
                          <i className="bi bi-lock-fill"></i> Exclusive
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
};

export default BlogSidebar;
