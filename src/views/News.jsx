import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import BlogSidebar from "../components/BlogSidebar";
import { getNewsList } from "../services/api";

const News = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getNewsList()
      .then((res) => setItems(Array.isArray(res.data) ? res.data : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="category-page-wrapper">

      {/* Header — same structure as CategoryLayout */}
      <div className="category-header-section">
        <div className="container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right"></i></span>
            <span className="breadcrumb-current">News &amp; Updates</span>
          </nav>
          <h1>News &amp; Updates</h1>
        </div>
      </div>

      <div className="category-content container">
        <div className="category-layout-grid">

          {/* Main column */}
          <div className="category-main-column">
            {loading ? (
              <div className="loading-state">
                <p>Loading news...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>Error loading news: {error}</p>
                <Link to="/" className="btn-primary">Go Home</Link>
              </div>
            ) : items.length === 0 ? (
              <div className="no-posts">
                <p className="no-posts-text">No news published yet. Check back soon.</p>
                <Link to="/" className="btn-primary go-home-btn">Go Home</Link>
              </div>
            ) : (
              <div className="blog-grid-2-col">
                {items.map((item) => (
                  <div key={item.id} className="blog-grid-card">
                    <div className="blog-card-image">
                      <Link to={`/news/${item.slug}`}>
                        <Image
                          src={item.image || "https://placehold.co/600x400?text=No+Image"}
                          alt={item.image_alt || item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                          style={{ objectFit: "cover" }}
                        />
                      </Link>
                    </div>
                    <div className="blog-card-content">
                      <div className="blog-meta-top">
                        <span className="blog-author" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <i className="bi bi-megaphone"></i>
                          SAP Security Expert
                        </span>
                        <span className="blog-date">
                          <i className="bi bi-calendar3"></i>{" "}
                          {(() => {
                            const d = new Date(item.date || item.created_at);
                            return isNaN(d.getTime())
                              ? item.date
                              : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                          })()}
                        </span>
                      </div>

                      <Link to={`/news/${item.slug}`} className="blog-title-link">
                        <h3>{item.title}</h3>
                      </Link>

                      {item.excerpt && (
                        <p className="blog-excerpt">{item.excerpt}</p>
                      )}

                      <Link to={`/news/${item.slug}`} className="read-more-link">
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

export default News;
