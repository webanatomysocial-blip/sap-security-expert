import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Image from "next/image";
import { getMemberPublicProfile } from "../services/api";

const MemberPublicProfile = () => {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    getMemberPublicProfile(id)
      .then((res) => {
        if (res.data?.status === "error") setError(res.data.message || "Member not found");
        else setMember(res.data);
      })
      .catch(() => setError("Member not found or profile is private."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2 style={{ color: "#6b7280" }}>{error || "Member not found"}</h2>
        <Link to="/" className="btn-read-insight" style={{ marginTop: 20, display: "inline-block" }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const joinedDate = member.joined
    ? new Date(member.joined).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="contributor-profile-page">
      <div className="profile-container">
        <nav className="blog-breadcrumb" style={{ marginBottom: 24 }}>
          <Link to="/" className="breadcrumb-link" style={{ color: "#64748b" }}>Home</Link>
          <span className="breadcrumb-sep" style={{ color: "#94a3b8" }}><i className="bi bi-chevron-right" /></span>
          <span className="breadcrumb-current" style={{ color: "#1e293b" }}>Member Profile</span>
        </nav>

        <div className="profile-card">
          {/* Banner */}
          <div className="profile-header-banner" style={{ background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e3a5f 100%)" }}>
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />
          </div>

          <div className="profile-content">
            {/* Avatar */}
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar-large" style={{ position: "relative" }}>
                <Image src={member.profile_image || "/assets/placeholder.webp"} alt={member.name || "Member"} fill style={{ objectFit: "cover" }} />
              </div>
            </div>

            {/* Name + role + company */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", margin: "0 0 6px" }}>
                {member.name || "Community Member"}
              </h1>
              {member.job_role && (
                <p style={{ margin: "0 0 4px", fontSize: 15, color: "#475569", fontWeight: 500 }}>
                  {member.job_role}
                </p>
              )}
              {member.company_name && (
                <p style={{ margin: 0, fontSize: 14, color: "#64748b" }}>
                  <i className="bi bi-building" style={{ marginRight: 6 }} />{member.company_name}
                </p>
              )}
              {member.location && (
                <p style={{ margin: "4px 0 0", fontSize: 14, color: "#64748b" }}>
                  <i className="bi bi-geo-alt" style={{ marginRight: 6 }} />{member.location}
                </p>
              )}
            </div>

            {/* Stats row */}
            {(joinedDate || member.comment_count != null) && (
              <div style={{
                display: "flex", gap: 32, paddingTop: 20,
                borderTop: "1px solid #e2e8f0", marginTop: 4,
              }}>
                {joinedDate && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 4 }}>
                      Member since
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{joinedDate}</div>
                  </div>
                )}
                {member.comment_count != null && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", marginBottom: 4 }}>
                      Comments
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>{member.comment_count}</div>
                  </div>
                )}
              </div>
            )}

            {/* Reputation badge — Explorer */}
            <div style={{ marginTop: 20 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10,
                background: "#eff6ff", border: "1.5px solid #bfdbfe",
                borderRadius: 12, padding: "10px 16px",
              }}>
                <i className="bi bi-compass-fill" style={{ fontSize: "1.2rem", color: "#2563eb" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#2563eb" }}>Explorer</span>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, background: "#2563eb", color: "#fff", padding: "1px 7px", borderRadius: 20 }}>Level</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748b", lineHeight: 1.4 }}>Active member of the SAP Security Expert community</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberPublicProfile;
