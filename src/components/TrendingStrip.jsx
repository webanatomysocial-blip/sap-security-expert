import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

const TrendingStrip = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/posts?trending=true")
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : response.data.data || [];
        setTrending(data);
      })
      .catch((err) => console.error("Error fetching trending blogs:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading || trending.length === 0) return null;

  return (
    <div className="trending-strip-wrapper">
      <div className="trending-strip-inner container">
        <div className="trending-label">
          <span className="fire-icon">🔥</span>
          <strong>Trending This Week:</strong>
        </div>
        <div className="trending-marquee-container">
          <div className="trending-marquee">
            {trending.map((blog, index) => (
              <React.Fragment key={blog.id}>
                <Link
                  to={`/${(blog.category || "blogs").toLowerCase().replace(/\s+/g, "-")}/${blog.slug || blog.id}`}
                  className="trending-link"
                >
                  <span className="trending-title">{blog.title}</span>
                  <span className="trending-views">
                    <i className="bi bi-eye"></i> {blog.recent_views || blog.view_count || 0}
                  </span>
                </Link>
                {index < trending.length - 1 && <span className="trending-divider">|</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .trending-strip-wrapper {
          background: linear-gradient(90deg, #1e293b 0%, #0f172a 100%);
          color: #f8fafc;
          padding: 10px 0;
          font-size: 0.85rem;
          border-bottom: 1px solid #334155;
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        .trending-strip-inner {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .trending-label {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 20px;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(4px);
        }
        .fire-icon {
          font-size: 1.1rem;
          animation: pulse-fire 2s infinite;
        }
        @keyframes pulse-fire {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
        .trending-marquee-container {
          flex: 1;
          overflow: hidden;
          position: relative;
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        .trending-marquee {
          display: flex;
          align-items: center;
          gap: 16px;
          white-space: nowrap;
          animation: scroll-marquee 25s linear infinite;
        }
        .trending-marquee:hover {
          animation-play-state: paused;
        }
        @keyframes scroll-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .trending-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #e2e8f0;
          text-decoration: none;
          transition: color 0.2s;
        }
        .trending-link:hover {
          color: #38bdf8;
        }
        .trending-title {
          font-weight: 500;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .trending-views {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #94a3b8;
          font-size: 0.75rem;
          background: rgba(255,255,255,0.05);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .trending-divider {
          color: #475569;
          font-size: 0.8rem;
        }
        @media (max-width: 768px) {
          .trending-strip-inner {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .trending-marquee-container {
            width: 100%;
          }
          .trending-title {
            max-width: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default TrendingStrip;
