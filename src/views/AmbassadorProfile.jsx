import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Image from "next/image";
import SEO from "../components/SEO";
import { getAmbassadorProfile } from "../services/api";
import { countryFlag } from "../constants/countries";
import AmbassadorBadge from "../components/AmbassadorBadge";
import { 
  LuAward, 
  LuBuilding, 
  LuClock, 
  LuMapPin, 
  LuLinkedin, 
  LuExternalLink, 
  LuQuote, 
  LuHeartHandshake, 
  LuShieldCheck, 
  LuArrowLeft,
  LuSparkles,
  LuCircleCheck
} from "react-icons/lu";

const EXPERTISE_LABELS = {
  sapSecurity: "SAP Security (ABAP/Java)",
  sapGrc: "SAP GRC (Access Control, Process Control, RM)",
  sapIag: "Audit & Compliance / IAG",
  sapBtp: "BTP Security",
  sapCyber: "Cybersecurity / IAM / Cloud Security",
};

/* ── helper: gather all badge years from the ambassador object ── */
function getBadgeYears(ambassador) {
  if (ambassador.badge_years?.length > 0) return ambassador.badge_years;
  if (ambassador.has_badge && ambassador.badge_year) return [ambassador.badge_year];
  return [];
}

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "65vh", gap: 16 }}>
        <div style={{ width: 44, height: 44, border: "4px solid #e2e8f0", borderTop: "4px solid #ee5e42", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "#64748b", fontSize: "0.92rem", fontWeight: 500 }}>Loading ambassador profile…</p>
      </div>
    );
  }

  if (error || !ambassador) {
    return (
      <div style={{ textAlign: "center", padding: "100px 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fee2e2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <LuShieldCheck size={32} />
        </div>
        <h2 style={{ color: "#1e293b", fontSize: "1.6rem", fontWeight: 800 }}>{error || "Ambassador not found"}</h2>
        <p style={{ color: "#64748b", marginTop: 8 }}>The requested profile might be private or does not exist.</p>
        <Link to="/ambassadors" className="btn-read-insight" style={{ marginTop: 24, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <LuArrowLeft size={16} /> Back to Ambassadors
        </Link>
      </div>
    );
  }

  const expertiseEntries = ambassador.expertise
    ? Object.entries(ambassador.expertise).filter(([, v]) => v === true)
    : [];
  const avatarUrl = imgError || !ambassador.profile_image ? null : ambassador.profile_image;
  const badgeYears = getBadgeYears(ambassador);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: 80 }}>
      <SEO title={`${ambassador.full_name} | Country Ambassador | SAP Security Expert`} />

      {/* ── HERO HEADER ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #090d16 0%, #0f172a 40%, #1e293b 100%)",
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.8,
          }}
        />
        {/* Accent gold top glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent, #f59e0b 35%, #fbbf24 65%, transparent)",
          }}
        />

        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "36px 24px 72px", position: "relative" }}>
          {/* Back link */}
          <Link
            to="/ambassadors"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.84rem",
              textDecoration: "none",
              marginBottom: 28,
              fontWeight: 600,
              padding: "6px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
          >
            <LuArrowLeft size={15} /> All Ambassadors
          </Link>

          {/* Hero Content Banner */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
            {/* Left: Avatar & Identity */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 280, flex: 1 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: "50%",
                    border: "3.5px solid rgba(245, 158, 11, 0.6)",
                    background: "#0f172a",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={ambassador.full_name}
                      width={104}
                      height={104}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <span style={{ fontSize: "2.6rem", fontWeight: 800, color: "#f59e0b" }}>
                      {ambassador.full_name?.charAt(0)}
                    </span>
                  )}
                </div>
                {!!ambassador.has_badge && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: -4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
                      color: "#ffffff",
                      fontSize: "0.6rem",
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.08em",
                      boxShadow: "0 2px 8px rgba(217, 119, 6, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <LuAward size={10} /> AMBASSADOR
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 800, color: "#ffffff", lineHeight: 1.2 }}>
                    {ambassador.full_name}
                  </h1>
                  {ambassador.country && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.1)",
                        color: "#ffffff",
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        border: "1px solid rgba(255,255,255,0.15)",
                      }}
                    >
                      <span>{countryFlag(ambassador.country)}</span>
                      <span>{ambassador.country}</span>
                    </span>
                  )}
                </div>

                {ambassador.current_role && (
                  <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", fontWeight: 500 }}>
                    {ambassador.current_role}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginTop: 12 }}>
                  {ambassador.organization && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.75)", fontSize: "0.82rem" }}>
                      <LuBuilding size={14} color="#f59e0b" /> {ambassador.organization}
                    </span>
                  )}
                  {ambassador.years_experience && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(255,255,255,0.75)", fontSize: "0.82rem" }}>
                      <LuClock size={14} color="#f59e0b" /> {ambassador.years_experience} Years Experience
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Recognition Summary */}
            {badgeYears.length > 0 && (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  borderRadius: 14,
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "linear-gradient(135deg, #d97706, #b45309)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
                  }}
                >
                  <LuAward size={22} />
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#fcd34d", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Official Community Leader
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#ffffff" }}>
                    {ambassador.country} Ambassador · {badgeYears.join(", ")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT (Overlaps hero smoothly) ── */}
      <div style={{ maxWidth: 1080, margin: "-40px auto 0", padding: "0 24px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>

          {/* LEFT COLUMN: Main Ambassador Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. Motivation */}
            {ambassador.motivation && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: "24px 28px",
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff7ed", color: "#f97316", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LuQuote size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Motivation & Vision
                  </h3>
                </div>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                  {ambassador.motivation}
                </p>
              </div>
            )}

            {/* 2. Community Contribution */}
            {ambassador.contribution_examples && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: "24px 28px",
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LuHeartHandshake size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Community Contributions
                  </h3>
                </div>
                <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>
                  {ambassador.contribution_examples}
                </p>
              </div>
            )}

            {/* 3. Areas of Expertise */}
            {expertiseEntries.length > 0 && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  padding: "24px 28px",
                  boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <LuShieldCheck size={16} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Areas of Expertise
                  </h3>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {expertiseEntries.map(([key]) => (
                    <span
                      key={key}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                      }}
                    >
                      <LuCircleCheck size={13} color="#059669" />
                      {EXPERTISE_LABELS[key] || key}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Badge Presentation & Profile Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. Official Ambassador Badge Card */}
            {badgeYears.length > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #fffdfa 100%)",
                  borderRadius: 16,
                  padding: "26px",
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.08)",
                  border: "1.5px solid #fed7aa",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Gold accent line */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: "linear-gradient(90deg, #d97706, #f59e0b, #fbbf24)",
                  }}
                />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                        color: "#b45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #fcd34d",
                      }}
                    >
                      <LuAward size={18} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                        Ambassador Badge{badgeYears.length > 1 ? "s" : ""}
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                        Official badge verification
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      background: "#fff7ed",
                      border: "1px solid #fed7aa",
                      color: "#c2410c",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    Verified
                  </span>
                </div>

                {/* Badge Visuals */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 14,
                    border: "1px solid #f1f5f9",
                    padding: "20px 14px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", alignItems: "center" }}>
                    {badgeYears.map((yr) => (
                      <div key={yr} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <AmbassadorBadge
                          country={ambassador.country}
                          year={yr}
                          size={badgeYears.length === 1 ? 160 : 120}
                        />
                        <div
                          style={{
                            marginTop: 10,
                            padding: "3px 12px",
                            borderRadius: 20,
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            background: "linear-gradient(135deg, #0f172a, #1e293b)",
                            color: "#fcd34d",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                            border: "1px solid rgba(252, 211, 77, 0.3)",
                          }}
                        >
                          {yr} Ambassador
                        </div>
                      </div>
                    ))}
                  </div>

                  <p style={{ margin: "16px 0 0", fontSize: "0.76rem", color: "#94a3b8", textAlign: "center", maxWidth: 300, lineHeight: 1.4 }}>
                    Click or save the badge to verify official community representation for {ambassador.country}.
                  </p>
                </div>
              </div>
            )}

            {/* 2. Connect & Credentials Card */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: "24px 28px",
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ margin: "0 0 16px", fontSize: "0.85rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Ambassador Information
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Country:</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    {countryFlag(ambassador.country)} {ambassador.country || "Global"}
                  </span>
                </div>

                {ambassador.organization && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Organization:</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                      {ambassador.organization}
                    </span>
                  </div>
                )}

                {ambassador.current_role && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Role:</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                      {ambassador.current_role}
                    </span>
                  </div>
                )}

                {ambassador.linkedin && (
                  <div style={{ marginTop: 6 }}>
                    <a
                      href={ambassador.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "10px 16px",
                        borderRadius: 10,
                        background: "#0a66c2",
                        color: "#ffffff",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.86rem",
                        boxShadow: "0 2px 8px rgba(10, 102, 194, 0.2)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <LuLinkedin size={16} /> View LinkedIn Profile <LuExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbassadorProfile;

