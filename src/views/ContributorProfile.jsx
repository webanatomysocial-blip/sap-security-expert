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
      </div>
    </div>
  );
};

export default ContributorProfile;
