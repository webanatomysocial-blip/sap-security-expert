import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BsSearch } from "react-icons/bs";
import Image from "next/image";
// Removed static categories import
// next-disabled: import "../css/BlogSidebar.css";
import { getBlogs, getAdsByZone } from "../services/api";

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
        <h3 className="widget-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="bi bi-lightning-charge-fill" style={{ color: "#ee5e42", fontSize: "1rem" }} />
          {searchTerm ? "Search Results" : "Latest Posts"}
        </h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div className="skel-block" style={{ width: 64, height: 52, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skel-block" style={{ height: '12px', width: '90%', borderRadius: 4 }} />
                  <div className="skel-block" style={{ height: '12px', width: '70%', borderRadius: 4 }} />
                  <div className="skel-block" style={{ height: '10px', width: '40%', borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ul className="latest-posts-list">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => {
                const categorySlug = (post.category || "blogs").toLowerCase().replace(/\s+/g, "-");
                const categoryLabel = post.category
                  ? post.category.replace(/^sap-/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                  : "Blog";
                const isPremium = Number(post.is_premium) === 1;
                const isExclusive = Number(post.is_members_only) === 1 && !isPremium;
                const postDate = post.date ? new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
                return (
                  <li key={post.id} className="latest-post-item" style={{ marginBottom: 0, padding: 0, border: "none" }}>
                    <Link
                      to={`/${categorySlug}/${post.slug || post.id}`}
                      style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none" }}
                    >
                      {/* Thumbnail */}
                      <div style={{ flexShrink: 0, width: 64, height: 52, borderRadius: 8, overflow: "hidden", background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                        {post.image ? (
                          <Image
                            src={post.image}
                            alt={post.title}
                            width={64}
                            height={52}
                            style={{ objectFit: "cover", width: "100%", height: "100%" }}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <i className="bi bi-file-earmark-text" style={{ color: "#cbd5e1", fontSize: "1.2rem" }} />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Category pill */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#ee5e42", background: "#fff0ec", border: "1px solid #fecdb5", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: 0.4 }}>
                            {categoryLabel}
                          </span>
                          {isPremium && (
                            <span className="sidebar-exclusive-tag" style={{ background: "#d97706", marginLeft: 0, marginTop: 0 }}>
                              <i className="bi bi-star-fill" /> PREMIUM
                            </span>
                          )}
                          {isExclusive && (
                            <span className="sidebar-exclusive-tag" style={{ marginLeft: 0, marginTop: 0 }}>
                              <i className="bi bi-lock-fill" /> EXCLUSIVE
                            </span>
                          )}
                          {!isPremium && !isExclusive && (
                            <span className="sidebar-exclusive-tag" style={{ background: "#16a34a", marginLeft: 0, marginTop: 0 }}>
                              <i className="bi bi-unlock-fill" /> FREE
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <span className="latest-post-title" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", transition: "color 0.2s" }}>
                          {highlightSearch(post.title)}
                        </span>

                        {/* Date */}
                        {postDate && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                            <i className="bi bi-calendar3" style={{ color: "#94a3b8", fontSize: "0.65rem" }} />
                            <span style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 500 }}>{postDate}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })
            ) : (
              <li style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                <i className="bi bi-search" style={{ display: "block", fontSize: "1.5rem", marginBottom: 8 }} />
                No posts found.
              </li>
            )}
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
                      {Number(post.is_premium) === 1 && (
                        <span className="sidebar-exclusive-tag" style={{ background: "#d97706" }}>
                          <i className="bi bi-star-fill" /> PREMIUM
                        </span>
                      )}
                      {Number(post.is_members_only) === 1 && Number(post.is_premium) !== 1 && (
                        <span className="sidebar-exclusive-tag">
                          <i className="bi bi-lock-fill" /> EXCLUSIVE
                        </span>
                      )}
                      {Number(post.is_premium) !== 1 && Number(post.is_members_only) !== 1 && (
                        <span className="sidebar-exclusive-tag" style={{ background: "#16a34a" }}>
                          <i className="bi bi-unlock-fill" /> FREE
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
