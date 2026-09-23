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
  LuLinkedin,
  LuShieldCheck,
  LuArrowLeft,
  LuCircleCheck,
} from "react-icons/lu";

const EXPERTISE_LABELS = {
  sapSecurity: "SAP Security (ABAP/Java)",
  sapGrc: "SAP GRC (Access Control, Process Control, Risk Management)",
  sapIag: "SAP IAG",
  sapBtp: "SAP BTP Security",
  sapCyber: "Cybersecurity / IAM / Cloud Security",
  sapAudit: "SAP Audit",
  s4hanaSecurity: "S/4HANA Security",
  btpSecurity: "BTP Security",
  iam: "IAM / Identity",
};

// Friendly summary word for how many community-contribution types an
// ambassador checked at application time — real and dynamic (derived from
// their actual answers), just not a raw count.
function contributionSummary(communityContribution) {
  if (!communityContribution || typeof communityContribution !== "object") return null;
  const count = Object.values(communityContribution).filter(Boolean).length;
  if (count <= 0) return null;
  if (count === 1) return "A little";
  if (count <= 3) return "Some";
  return "Many";
}

/* ── helper: gather all badge years from the ambassador object ── */
function getBadgeYears(ambassador) {
  if (ambassador.badge_years?.length > 0) return ambassador.badge_years;
  if (ambassador.has_badge && ambassador.badge_year) return [ambassador.badge_year];
  return [];
}

// Builds the year-tile gallery: current year first (if earned), then earned
// years descending, then the next not-yet-earned year as an aspirational tile.
function buildBadgeTiles(badgeYears) {
  const currentYear = new Date().getFullYear();
  const earned = new Set(badgeYears.map(Number));
  const tiles = [];
  if (earned.has(currentYear)) {
    tiles.push({ year: currentYear, status: "current" });
  }
  [...earned]
    .filter((y) => y !== currentYear)
    .sort((a, b) => b - a)
    .forEach((y) => tiles.push({ year: y, status: "earned" }));
  const nextYear = currentYear + 1;
  if (!earned.has(nextYear)) tiles.push({ year: nextYear, status: "not-yet" });
  return tiles;
}

const AmbassadorProfile = () => {
  const { id } = useParams();
  const [ambassador, setAmbassador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const badgeYears = getBadgeYears(ambassador);
  const badgeTiles = buildBadgeTiles(badgeYears);
  const currentYear = new Date().getFullYear();
  const displayBadgeYear = badgeYears.includes(currentYear) ? currentYear : (badgeYears[0] || currentYear);
  const contribSummary = contributionSummary(ambassador.community_contribution);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", paddingBottom: 80 }}>
      <SEO title={`${ambassador.full_name} | Country Ambassador | SAP Security Expert`} />

      {/* ── HERO HEADER ── */}
      <div style={{ background: "#0f172a" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px 40px" }}>
          <Link
            to="/ambassadors"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "rgba(255,255,255,0.65)", fontSize: "0.84rem", textDecoration: "none",
              marginBottom: 28, fontWeight: 600,
              padding: "6px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <LuArrowLeft size={15} /> All Country Ambassadors
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: 96, height: 96, borderRadius: "50%",
                  border: "3px solid #f59e0b",
                  background: "#0f172a",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {ambassador.profile_image ? (
                  <Image src={ambassador.profile_image} alt={ambassador.full_name} width={96} height={96} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "2.4rem", fontWeight: 800, color: "#fbbf24" }}>
                    {ambassador.full_name?.charAt(0)}
                  </span>
                )}
              </div>
              {!!ambassador.has_badge && (
                <span
                  style={{
                    marginTop: -12, background: "#f59e0b", color: "#1e293b",
                    fontSize: "0.68rem", fontWeight: 800, padding: "3px 12px", borderRadius: 20,
                    display: "flex", alignItems: "center", gap: 4, letterSpacing: "0.03em",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  <LuAward size={11} /> AMBASSADOR
                </span>
              )}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "2.1rem", fontWeight: 800, color: "#ffffff" }}>
                  {ambassador.full_name}
                </h1>
                {ambassador.country && (
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "rgba(255,255,255,0.1)", color: "#ffffff",
                      padding: "4px 12px", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600,
                    }}
                  >
                    {countryFlag(ambassador.country)} {ambassador.country}
                  </span>
                )}
              </div>
              {ambassador.current_role && (
                <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.7)", fontSize: "1rem" }}>
                  {ambassador.current_role}
                </p>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", marginTop: 10 }}>
                {ambassador.organization && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.75)", fontSize: "0.85rem" }}>
                    <LuBuilding size={14} /> {ambassador.organization}
                  </span>
                )}
                {ambassador.years_experience && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.75)", fontSize: "0.85rem" }}>
                    <LuClock size={14} /> {ambassador.years_experience} of experience
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24, alignItems: "start" }}>

          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* About the Ambassador */}
            <div style={{ background: "#ffffff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0", borderLeft: "4px solid #f59e0b" }}>
              <h3 style={{ display: "inline-block", margin: "0 0 14px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", background: "#fef3c7", padding: "2px 8px" }}>
                About the Ambassador
              </h3>
              <p style={{ margin: 0, color: "#334155", lineHeight: 1.75, whiteSpace: "pre-wrap", fontSize: "0.96rem" }}>
                {ambassador.about_me
                  ? ambassador.about_me
                  : `${ambassador.full_name} is a Country Ambassador for SAP Security Expert${ambassador.country ? ` representing ${ambassador.country}` : ""}, connecting local professionals to the wider global community.`}
              </p>
            </div>

            {/* Areas of Expertise */}
            {expertiseEntries.length > 0 && (
              <div style={{ background: "#ffffff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                  Areas of Expertise
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {expertiseEntries.map(([key]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        border: "1px solid #e2e8f0", borderRadius: 10,
                        padding: "12px 16px", fontSize: "0.92rem", fontWeight: 600, color: "#1e293b",
                      }}
                    >
                      <LuCircleCheck size={17} color="#16a34a" />
                      {EXPERTISE_LABELS[key] || key}
                    </div>
                  ))}
                </div>

                {contribSummary && (
                  <div style={{ marginTop: 18 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Community Contributions
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>
                      {contribSummary}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Badge preview */}
            {!!ambassador.has_badge && (
              <div style={{ background: "#0f172a", borderRadius: 12, padding: "24px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <AmbassadorBadge country={ambassador.country} year={displayBadgeYear} size={160} />
                </div>
                <span
                  style={{
                    display: "inline-block", marginTop: 14, background: "#fef3c7", color: "#92400e",
                    fontSize: "0.75rem", fontWeight: 800, padding: "4px 14px", borderRadius: 20, letterSpacing: "0.03em",
                  }}
                >
                  {displayBadgeYear} AMBASSADOR
                </span>
                <p style={{ margin: "12px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
                  Click or save the badge to verify official community representation for {ambassador.country}.
                </p>
              </div>
            )}

            {/* Ambassador Information */}
            <div style={{ background: "#ffffff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 18px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                Ambassador Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Country</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    {countryFlag(ambassador.country)} {ambassador.country || "Global"}
                  </div>
                </div>
                {ambassador.organization && (
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Organization</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {ambassador.organization}
                    </div>
                  </div>
                )}
                {ambassador.current_role && (
                  <div>
                    <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 600 }}>Role</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                      {ambassador.current_role}
                    </div>
                  </div>
                )}
              </div>

              {ambassador.linkedin && (
                <a
                  href={ambassador.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginTop: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 16px", borderRadius: 10, background: "#0a66c2", color: "#ffffff",
                    textDecoration: "none", fontWeight: 700, fontSize: "0.9rem",
                  }}
                >
                  <LuLinkedin size={17} /> View LinkedIn Profile
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── AMBASSADOR BADGES GALLERY ── */}
        {badgeTiles.length > 0 && (
          <div style={{ marginTop: 24, background: "#ffffff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Ambassador Badges</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                  Recognized for representing {ambassador.country || "the region's"}'s SAP security community, year over year.
                </p>
              </div>
              {badgeYears.length > 0 && (
                <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "0.78rem", fontWeight: 700, padding: "5px 14px", borderRadius: 20 }}>
                  {badgeYears.length} year{badgeYears.length === 1 ? "" : "s"} earned
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {badgeTiles.map((tile) => {
                const isCurrent = tile.status === "current";
                const isEarned = tile.status === "earned" || isCurrent;
                return (
                  <div
                    key={tile.year}
                    style={{
                      width: 130, padding: "16px 12px 18px", borderRadius: 12, textAlign: "center",
                      border: isCurrent ? "2px solid #f59e0b" : "1px solid #e2e8f0",
                      background: isCurrent ? "#fffbeb" : "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex", justifyContent: "center",
                        opacity: isEarned ? 1 : 0.35,
                        filter: isEarned ? "none" : "grayscale(1)",
                        pointerEvents: isEarned ? "auto" : "none",
                      }}
                    >
                      <AmbassadorBadge country={ambassador.country} year={tile.year} size={80} />
                    </div>
                    <div style={{ marginTop: 10, fontSize: "1.15rem", fontWeight: 800, color: isEarned ? "#0f172a" : "#cbd5e1" }}>
                      {tile.year}
                    </div>
                    <div style={{ marginTop: 2, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em", color: isCurrent ? "#b45309" : isEarned ? "#16a34a" : "#94a3b8" }}>
                      {isCurrent ? "CURRENT" : isEarned ? "EARNED" : "NOT YET EARNED"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbassadorProfile;
