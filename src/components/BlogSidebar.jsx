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
        <h3 className="widget-title">
          {searchTerm ? "Search Results" : "Latest Posts"}
        </h3>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skel-block" style={{ height: '14px', width: '90%' }} />
                <div className="skel-block" style={{ height: '10px', width: '40%' }} />
              </div>
            ))}
          </div>
        ) : (
          <ul className="latest-posts-list">
            {filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <li key={post.id} className="latest-post-item">
                  <Link to={`/${(post.category || "blogs").toLowerCase().replace(/\s+/g, "-")}/${post.slug || post.id}`}>
                    {highlightSearch(post.title)}
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
                  </Link>
                </li>
              ))
            ) : (
              <li className="latest-post-item">No posts found.</li>
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
