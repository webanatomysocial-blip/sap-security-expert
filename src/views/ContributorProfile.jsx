import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getContributorProfile } from "../services/api";
import Image from "next/image";
// next-disabled: import "../css/ContributorProfile.css";
const ContributorProfile = () => {
  const { id } = useParams();
  const [contributor, setContributor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    getContributorProfile(id)
      .then((res) => {
        if (res.data.status === "success") {
          setContributor(res.data.contributor);
        } else {
          setError(res.data.message || "Contributor not found");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch contributor", err);
        setError("Something went wrong. Please try again later.");
        setLoading(false);
      });
  }, [id]);

  // Parse expertise if still a string (defensive guard)
  if (contributor && typeof contributor.expertise === 'string') {
    try { contributor.expertise = JSON.parse(contributor.expertise); } catch { contributor.expertise = {}; }
  }

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !contributor) {
    return (
      <div className="profile-loading">
        <h2>{error || "Contributor not found"}</h2>
        <Link to="/" className="btn-read-insight" style={{ marginTop: "20px" }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const expertiseLabels = {
    sapSecurity: "SAP Security",
    sapGrc: "SAP GRC",
    sapIag: "SAP IAG / Audit",
    sapBtp: "SAP BTP Security",
    sapCyber: "Cybersecurity",
  };

  return (
    <div className="contributor-profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header-banner"></div>
          <div className="profile-content">
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large">
                {contributor.profile_image ? (
                  <Image
                    src={contributor.profile_image}
                    alt={contributor.full_name}
                    width={140}
                    height={140}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="avatar-fallback"
                  style={{
                    display: contributor.profile_image ? "none" : "flex",
                  }}
                >
                  {contributor.full_name?.charAt(0)}
                </div>
              </div>
            </div>

            <div className="profile-info">
              <h1>{contributor.full_name}</h1>
              <div className="profile-role-badge">{contributor.role}</div>

              <div className="profile-meta-grid">
                {contributor.organization && (
                  <div className="meta-item">
                    <span className="meta-label">Organization</span>
                    <span className="meta-value">
                      {contributor.organization}
                    </span>
                  </div>
                )}
                {contributor.designation && (
                  <div className="meta-item">
                    <span className="meta-label">Designation</span>
                    <span className="meta-value">
                      {contributor.designation}
                    </span>
                  </div>
                )}
                <div className="meta-item">
                  <span className="meta-label">Member Since</span>
                  <span className="meta-value">
                    {new Date(contributor.created_at).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </span>
                </div>
              </div>

              {contributor.short_bio && (
                <div className="profile-section">
                  <h3>
                    <i className="bi bi-person-lines-fill"></i> About
                  </h3>
                  <div className="profile-bio">{contributor.short_bio}</div>
                </div>
              )}

              {contributor.expertise && (
                <div className="profile-section">
                  <h3>
                    <i className="bi bi-patch-check"></i> Expertise
                  </h3>
                  <div className="expertise-tags">
                    {Object.entries(contributor.expertise)
                      .filter(([_, value]) => value === true)
                      .map(([key, _]) => (
                        <span key={key} className="expertise-tag">
                          {expertiseLabels[key] || key}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="profile-section">
                <h3>
                  <i className="bi bi-link-45deg"></i> Connect
                </h3>
                <div className="social-links-grid">
                  {contributor.linkedin && (
                    <a
                      href={contributor.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link-btn"
                      title="LinkedIn"
                    >
                      <i className="bi bi-linkedin"></i>
                    </a>
                  )}
                  {contributor.twitter_handle && (
                    <a
                      href={`https://twitter.com/${contributor.twitter_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link-btn"
                      title="Twitter"
                    >
                      <i className="bi bi-twitter-x"></i>
                    </a>
                  )}
                  {contributor.personal_website && (
                    <a
                      href={contributor.personal_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link-btn"
                      title="Website"
                    >
                      <i className="bi bi-globe"></i>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contributions section */}
        {contributor.blogs && contributor.blogs.length > 0 && (
          <div className="profile-contributions">
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1.2rem", color: "#0f172a" }}>
              <i className="bi bi-file-earmark-text" style={{ marginRight: "8px", color: "#3b82f6" }}></i>
              Contributions ({contributor.blogs.length})
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {contributor.blogs.map((blog) => (
                <Link
                  key={blog.id}
                  to={`/${blog.category}/${blog.slug}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "1.1rem 1.4rem",
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                      transition: "box-shadow 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(59,130,246,0.10)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                  >
                    {blog.image && (
                      <img
                        src={blog.image}
                        alt={blog.title}
                        style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                        onError={e => { e.currentTarget.style.display = "none"; }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                        {blog.category?.replace(/-/g, " ")}
                      </div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "1rem", marginBottom: 4, lineHeight: 1.3 }}>
                        {blog.title}
                      </div>
                      {blog.excerpt && (
                        <div style={{ fontSize: "0.88rem", color: "#64748b", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {blog.excerpt}
                        </div>
                      )}
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 6 }}>
                        {blog.date ? new Date(blog.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}
                        {blog.view_count > 0 && <span style={{ marginLeft: 12 }}><i className="bi bi-eye" style={{ marginRight: 3 }}></i>{blog.view_count} views</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {contributor.blogs && contributor.blogs.length === 0 && (
          <div className="profile-contributions">
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "1rem", color: "#0f172a" }}>
              <i className="bi bi-file-earmark-text" style={{ marginRight: "8px", color: "#3b82f6" }}></i>
              Contributions
            </h2>
            <p style={{ color: "#94a3b8", fontStyle: "italic" }}>No published articles yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributorProfile;
