import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SEO from "../components/SEO";
import AmbassadorBadge from "../components/AmbassadorBadge";
import { useMemberAuth } from "../context/MemberAuthContext";
import { getAmbassadorMemberProfile } from "../services/api";

// The one page a Country Ambassador needs after logging in: their
// application details, current badge, and every year they've held it —
// deliberately NOT the full Contributor admin portal (Manage Comments,
// Manage Ads, etc. don't apply to them).
export default function AmbassadorMemberPage() {
  const { isLoggedIn } = useMemberAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/member/login?return=/member/ambassador");
      return;
    }
    getAmbassadorMemberProfile()
      .then((res) => setProfile(res.data.ambassador))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load your Ambassador profile."))
      .finally(() => setLoading(false));
  }, [isLoggedIn, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        Loading your Ambassador profile…
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center", padding: 24 }}>
        <p style={{ color: "#64748b" }}>{error || "This account isn't an approved Country Ambassador."}</p>
        <Link to="/" style={{ color: "#ee5e42", fontWeight: 600 }}>Go home</Link>
      </div>
    );
  }

  const parseTags = (val) => {
    let obj = val || {};
    if (typeof obj === "string") {
      try { obj = JSON.parse(obj); } catch { obj = {}; }
    }
    return Array.isArray(obj) ? obj : Object.keys(obj).filter((k) => obj[k]);
  };
  const expertiseTags = parseTags(profile.expertise);
  const communityContributionTags = parseTags(profile.community_contribution);
  const ambassadorMotivationTags = parseTags(profile.ambassador_motivations);

  const TagRow = ({ label, tags }) => tags.length > 0 && (
    <div style={{ marginTop: 16 }}>
      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {tags.map((tag) => (
          <span key={tag} style={{ background: "#f3513f1a", color: "#ee5e42", borderRadius: 50, padding: "5px 14px", fontSize: "0.78rem", fontWeight: 600, textTransform: "capitalize" }}>
            {tag.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2")}
          </span>
        ))}
      </div>
    </div>
  );

  const AnswerBlock = ({ label, value }) => value && (
    <div style={{ marginBottom: 20 }}>
      <span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>{label}</span>
      <p style={{ margin: "6px 0 0", color: "#334155", fontSize: "0.92rem", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{value}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "48px 20px 80px" }}>
      <SEO title={`${profile.full_name} | Country Ambassador Dashboard`} />

      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32, flexWrap: "wrap" }}>
        <div style={{
          width: 84, height: 84, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
          background: "linear-gradient(135deg, #fff0ec, #ffe4dc)",
          border: profile.has_badge ? "3px solid #fbbf24" : "1px solid #fecdb5",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", fontWeight: 700, color: "#ee5e42",
        }}>
          {profile.image ? (
            <img src={profile.image} alt={profile.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            (profile.full_name || "A")[0].toUpperCase()
          )}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "#0f172a" }}>{profile.full_name}</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b" }}>
            Country Ambassador{profile.country ? ` · ${profile.country}` : ""}
          </p>
        </div>
      </div>

      {/* Badge */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.05rem", color: "#0f172a", marginBottom: 16 }}>Country Ambassador Badge</h2>
        {profile.has_badge ? (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <AmbassadorBadge country={profile.country} year={profile.badge_year} size={220} />
          </div>
        ) : (
          <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 12, padding: 24, textAlign: "center", color: "#64748b", fontSize: "0.9rem" }}>
            You're an approved Country Ambassador. The yearly badge is granted separately by the SAP Security Expert team.
          </div>
        )}

        {profile.badge_history?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Badge History
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.badge_history.map((h) => (
                <span key={h.badge_year} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 50, padding: "6px 14px", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                  <i className="bi bi-award-fill" style={{ color: "#f59e0b", marginRight: 6 }} />
                  {h.badge_year}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Application details */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.05rem", color: "#0f172a", marginBottom: 16 }}>Your Details</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Email</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.email || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>LinkedIn</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b", overflowWrap: "anywhere" }}>{profile.linkedin ? <a href={profile.linkedin} target="_blank" rel="noreferrer" style={{ color: "#ee5e42" }}>View Profile</a> : "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Organization</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.organization || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Role</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.current_role || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Location</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{[profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Years of Experience</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.years_experience || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Mentorship Experience</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.mentorship_experience || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Community Help Frequency</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.community_helping_frequency || "—"}</p></div>
          <div><span style={{ fontSize: "0.75rem", color: "#94a3b8", textTransform: "uppercase" }}>Contribution Willingness</span><p style={{ margin: "2px 0 0", fontWeight: 600, color: "#1e293b" }}>{profile.contribution_willingness || "—"}</p></div>
        </div>

        <TagRow label="Areas of Expertise" tags={expertiseTags} />
        <TagRow label="Community Contribution" tags={communityContributionTags} />
        <TagRow label="Motivations" tags={ambassadorMotivationTags} />

        <div style={{ marginTop: 24 }}>
          <AnswerBlock label="Contribution Plan" value={profile.motivation} />
          <AnswerBlock label="Community Initiative Example" value={profile.contribution_examples} />
          <AnswerBlock label="Country Security Challenge" value={profile.country_challenge} />
          <AnswerBlock label="What a Country Ambassador Should Be" value={profile.ambassador_definition} />
          <AnswerBlock label="Other Motivation" value={profile.other_motivation_text} />
          <AnswerBlock label="Published Work / Contribution Links" value={profile.contribution_links} />
        </div>
      </section>

      {/* Actions */}
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link
          to="/member/settings"
          style={{ background: "linear-gradient(135deg, #ee5e42, #c0392b)", color: "#fff", padding: "12px 24px", borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem" }}
        >
          Edit Profile Settings
        </Link>
      </section>
    </div>
  );
}
