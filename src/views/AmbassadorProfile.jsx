import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Image from "next/image";
import SEO from "../components/SEO";
import { getAmbassadorProfile } from "../services/api";
import { countryFlag } from "../constants/countries";
import AmbassadorBadge from "../components/AmbassadorBadge";

const EXPERTISE_LABELS = {
  sapSecurity: "SAP Security (ABAP/Java)",
  sapGrc: "SAP GRC (Access Control, Process Control, RM)",
  sapIag: "Audit & Compliance / IAG",
  sapBtp: "BTP Security",
  sapCyber: "Cybersecurity / IAM / Cloud Security",
};

const AmbassadorProfile = () => {
  const { id } = useParams();
  const [ambassador, setAmbassador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    getAmbassadorProfile(id)
      .then((res) => {
        if (res.data?.status === "success") setAmbassador(res.data.ambassador);
        else setError(res.data?.message || "Ambassador not found");
      })
      .catch(() => setError("Ambassador not found or profile is private."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "4px solid #f1f5f9", borderTop: "4px solid #ee5e42", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Loading profile…</p>
      </div>
    );
  }

  if (error || !ambassador) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <h2 style={{ color: "#6b7280" }}>{error || "Ambassador not found"}</h2>
        <Link to="/ambassadors" className="btn-read-insight" style={{ marginTop: 20, display: "inline-block" }}>
          Back to Ambassadors
        </Link>
      </div>
    );
  }

  const expertiseEntries = ambassador.expertise
    ? Object.entries(ambassador.expertise).filter(([, v]) => v === true)
    : [];
  const avatarUrl = imgError || !ambassador.profile_image ? null : ambassador.profile_image;

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", paddingBottom: 60 }}>
      <SEO title={`${ambassador.full_name} | Country Ambassador | SAP Security Expert`} />

      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 100px", position: "relative" }}>
          <Link to="/ambassadors" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", textDecoration: "none", marginBottom: 28, fontWeight: 500 }}>
            <i className="bi bi-arrow-left" /> All Ambassadors
          </Link>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 28, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 110, height: 110, borderRadius: 20, border: "4px solid rgba(255,255,255,0.2)", background: "#1e293b", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={ambassador.full_name} width={110} height={110} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={() => setImgError(true)} />
                ) : (
                  <span style={{ fontSize: "2.8rem", fontWeight: 800, color: "#ee5e42" }}>{ambassador.full_name?.charAt(0)}</span>
                )}
              </div>
              {ambassador.has_badge && (
                <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: "#fbbf24", color: "#1e293b", fontSize: "0.6rem", fontWeight: 800, padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                  AMBASSADOR
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{ambassador.full_name}</h1>
              {ambassador.current_role && (
                <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>{ambassador.current_role}</p>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ambassador.organization && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", borderRadius: 8, padding: "4px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                    <i className="bi bi-building" /> {ambassador.organization}
                  </span>
                )}
                {ambassador.country && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", borderRadius: 8, padding: "4px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                    {countryFlag(ambassador.country)} {ambassador.country}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "-64px auto 0", padding: "0 24px", position: "relative" }}>
        {ambassador.has_badge && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 30 }}>
            <AmbassadorBadge country={ambassador.country} year={ambassador.badge_year} size={280} />
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 16, padding: "28px 32px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
          {ambassador.motivation && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Motivation</h3>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ambassador.motivation}</p>
            </div>
          )}

          {ambassador.contribution_examples && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Community Contribution</h3>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{ambassador.contribution_examples}</p>
            </div>
          )}

          {ambassador.badge_years?.length > 1 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Badges — {ambassador.badge_years.length} Years as Country Ambassador
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {ambassador.badge_years.map((y) => (
                  <AmbassadorBadge key={y} country={ambassador.country} year={y} size={110} />
                ))}
              </div>
            </div>
          )}

          {expertiseEntries.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Areas of Expertise</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {expertiseEntries.map(([key]) => (
                  <span key={key} style={{ background: "#fff0ec", border: "1px solid #fecdb5", color: "#c2410c", borderRadius: 8, padding: "5px 12px", fontSize: "0.8rem", fontWeight: 600 }}>
                    {EXPERTISE_LABELS[key] || key}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, paddingTop: 20, borderTop: "1px solid #e2e8f0" }}>
            {ambassador.years_experience && (
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Experience</div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>{ambassador.years_experience} years</div>
              </div>
            )}
            {ambassador.linkedin && (
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>LinkedIn</div>
                <a href={ambassador.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ee5e42" }}>View Profile</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorProfile;
