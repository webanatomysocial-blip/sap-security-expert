import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import { getMemberDirectory } from "../services/api";

const MemberDirectory = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    getMemberDirectory()
      .then((res) => setMembers(res.data?.members || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="contributor-profile-page">
      <div className="profile-container">
        <nav className="blog-breadcrumb" style={{ marginBottom: 24 }}>
          <Link to="/" className="breadcrumb-link" style={{ color: "#64748b" }}>Home</Link>
          <span className="breadcrumb-sep" style={{ color: "#94a3b8" }}><i className="bi bi-chevron-right" /></span>
          <span className="breadcrumb-current" style={{ color: "#1e293b" }}>Community Directory</span>
        </nav>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", margin: "0 0 24px" }}>Community Directory</h1>

        {loading ? (
          <div className="profile-loading"><div className="spinner" /><p>Loading members…</p></div>
        ) : members.length === 0 ? (
          <p style={{ color: "#64748b" }}>No members have opted into the public directory yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {members.map((m) => (
              <Link
                key={m.id}
                to={`/member/${m.id}`}
                className="profile-card"
                style={{ padding: 20, textAlign: "center", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 12px", borderRadius: "50%", overflow: "hidden" }}>
                  <Image src={m.profile_image || "/assets/placeholder.webp"} alt={m.name || "Member"} fill style={{ objectFit: "cover" }} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{m.name || "Community Member"}</div>
                {m.job_role && <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>{m.job_role}</div>}
                {m.company_name && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{m.company_name}</div>}
                {m.country && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}><i className="bi bi-flag" style={{ marginRight: 4 }} />{m.country}</div>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDirectory;
