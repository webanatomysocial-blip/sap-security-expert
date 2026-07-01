import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import { getContributorsLeaderboard } from "../services/api";

const MEDALS = ["🥇", "🥈", "🥉"];

const ContributorsLeaderboard = () => {
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    getContributorsLeaderboard()
      .then((res) => {
        setContributors(Array.isArray(res.data) ? res.data : (res.data?.contributors || []));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="category-page-wrapper">
      <div className="blogs-all-header">
        <div className="container">
          <nav className="blog-breadcrumb" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-link">Home</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <Link to="/become-a-contributor" className="breadcrumb-link">Contributors</Link>
            <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
            <span className="breadcrumb-current">Leaderboard</span>
          </nav>
          <div className="blogs-all-header-inner" style={{ alignItems: "center" }}>
            <div>
              <h1>Contributors Leaderboard</h1>
              <p>Top contributors ranked by their knowledge-sharing impact in the SAP Security community.</p>
            </div>
            {!loading && (
              <div className="blogs-all-count">
                <strong>{contributors.length}</strong>
                <span>contributors</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: "48px 20px", maxWidth: 860, margin: "0 auto" }}>
        {loading ? (
          <div className="loading-state"><p>Loading leaderboard…</p></div>
        ) : error ? (
          <div className="error-state"><p>{error}</p></div>
        ) : contributors.length === 0 ? (
          <p style={{ color: "#6b7280", textAlign: "center" }}>No contributors found.</p>
        ) : (
          <div className="leaderboard-list">
            {/* Top 3 podium */}
            {contributors.length >= 1 && (
              <div className="leaderboard-podium">
                {contributors.slice(0, Math.min(3, contributors.length)).map((c, i) => (
                  <Link key={c.id} to={`/contributor/${c.id}`} className={`podium-card podium-rank-${i + 1}`}>
                    <div className="podium-medal">{MEDALS[i]}</div>
                    <div className="podium-avatar">
                      {c.profile_image ? (
                        <Image src={c.profile_image} alt={c.name || c.full_name} fill style={{ objectFit: "cover" }} />
                      ) : (
                        <i className="bi bi-person-circle" style={{ fontSize: 36, color: "#9ca3af" }} />
                      )}
                    </div>
                    <div className="podium-name">{c.name || c.full_name}</div>
                    {c.role && <div className="podium-role">{c.role}</div>}
                    <div className="podium-count">{c.contributions_count || 0} <span>articles</span></div>
                  </Link>
                ))}
              </div>
            )}

            {/* Remaining rows */}
            {contributors.slice(3).map((c, i) => (
              <Link key={c.id} to={`/contributor/${c.id}`} className="leaderboard-row">
                <div className="lb-rank">#{i + 4}</div>
                <div className="lb-avatar">
                  {c.profile_image ? (
                    <Image src={c.profile_image} alt={c.name || c.full_name} fill style={{ objectFit: "cover" }} />
                  ) : (
                    <i className="bi bi-person-circle" style={{ fontSize: 24, color: "#9ca3af" }} />
                  )}
                </div>
                <div className="lb-info">
                  <div className="lb-name">{c.name || c.full_name}</div>
                  {c.role && <div className="lb-role">{c.role}</div>}
                </div>
                <div className="lb-count">
                  <strong>{c.contributions_count || 0}</strong>
                  <span>articles</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributorsLeaderboard;
