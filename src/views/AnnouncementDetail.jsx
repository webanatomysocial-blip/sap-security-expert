import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Image from "next/image";
import { getAnnouncementBySlug } from "../services/api";
import BlogSidebar from "../components/BlogSidebar";

const formatDate = (str) => {
  if (!str) return "";
  const d = new Date(str.includes(" ") ? str.replace(" ", "T") + "Z" : str + "T00:00:00Z");
  return isNaN(d.getTime()) ? str : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
};

const AnnouncementDetail = () => {
  const { slug } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    getAnnouncementBySlug(slug)
      .then((res) => { setItem(res.data); setLoading(false); })
      .catch(() => { setError("Announcement not found"); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ padding: "80px", textAlign: "center" }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  if (error || !item) return (
    <div style={{ padding: "80px", textAlign: "center" }}>
      <h2>Announcement not found</h2>
      <Link to="/announcements" className="btn-primary" style={{ marginTop: "16px", display: "inline-block" }}>
        Back to Announcements
      </Link>
    </div>
  );

  return (
    <div className="category-page-wrapper">
      {/* Hero banner */}
      <div className="ann-detail-hero">
        <div className="container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <Link to="/announcements" className="breadcrumb-link">Announcements</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current" title={item.title}>
              {item.title.length > 60 ? item.title.slice(0, 60) + "…" : item.title}
            </span>
          </nav>

          <div className="ann-detail-hero-meta">
            <span className="ann-detail-type-badge">
              <i className="bi bi-megaphone-fill" /> Announcement
            </span>
            <h1 className="ann-detail-title">{item.title}</h1>
            {item.excerpt && <p className="ann-detail-excerpt">{item.excerpt}</p>}
            <div className="ann-detail-meta-row">
              <span><i className="bi bi-calendar3" /> {formatDate(item.date || item.created_at)}</span>
              {item.views > 0 && <span><i className="bi bi-eye" /> {item.views} views</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="ann-detail-content-wrap container">
        <div className="category-layout-grid">
          <div className="category-main-column">

            {/* Featured image */}
            {item.image && (
              <div className="ann-detail-featured-image">
                <Image
                  src={item.image}
                  alt={item.image_alt || item.title}
                  width={900}
                  height={480}
                  style={{ width: "100%", height: "auto", objectFit: "cover", borderRadius: "12px", display: "block" }}
                />
              </div>
            )}

            {/* Body content */}
            {item.content ? (
              <div
                className="blog-content-body ann-detail-body"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            ) : (
              <p className="ann-detail-empty">No additional content for this announcement.</p>
            )}

            {/* External link CTA */}
            {item.link && (
              <div className="ann-detail-link-cta">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="ann-detail-link-btn">
                  <i className="bi bi-box-arrow-up-right" /> View Full Announcement
                </a>
              </div>
            )}

            {/* Back link */}
            <div className="ann-detail-back-row">
              <Link to="/announcements" className="ann-detail-back-link">
                <i className="bi bi-arrow-left" /> Back to Announcements
              </Link>
            </div>
          </div>

          <div className="category-sidebar-column">
            <BlogSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementDetail;
