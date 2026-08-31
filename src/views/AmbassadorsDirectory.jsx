import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import SEO from "../components/SEO";
import { getApprovedAmbassadors } from "../services/api";
import { countryFlag } from "../constants/countries";

const AmbassadorsDirectory = () => {
  const [ambassadors, setAmbassadors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    getApprovedAmbassadors()
      .then((res) => setAmbassadors(Array.isArray(res.data) ? res.data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <SEO title="Country Ambassadors | SAP Security Expert" />

      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)", padding: "56px 24px", textAlign: "center" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fbbf24", letterSpacing: 1, textTransform: "uppercase" }}>Global Expert Directory</span>
        <h1 style={{ fontSize: "2.1rem", fontWeight: 800, color: "#fff", margin: "10px 0 8px" }}>Country Ambassadors</h1>
        <p style={{ color: "#94a3b8", maxWidth: 560, margin: "0 auto" }}>
          Local expertise, global community — meet the professionals bringing their region's perspective to SAPSecurityExpert.
        </p>
      </div>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "48px 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>Loading…</div>
        ) : ambassadors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            No ambassadors yet.{" "}
            <Link to="/become-a-country-ambassador" style={{ color: "#ee5e42", fontWeight: 700 }}>Apply here</Link>.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24, alignItems: "stretch" }}>
            {[...ambassadors].sort((a, b) => (b.has_badge ? 1 : 0) - (a.has_badge ? 1 : 0)).map((a) => (
              <Link
                key={a.id}
                to={`/ambassador/${a.id}`}
                style={{
                  background: a.has_badge ? "linear-gradient(135deg, #fffdf5 0%, #fffbeb 100%)" : "#fff",
                  borderRadius: 24,
                  textDecoration: "none",
                  border: a.has_badge ? "2px solid #fbbf24" : "1px solid #e2e8f0",
                  boxShadow: a.has_badge
                    ? "0 10px 25px -5px rgba(245, 158, 11, 0.12), 0 8px 10px -6px rgba(245, 158, 11, 0.12)"
                    : "0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  position: "relative",
                  padding: "36px 24px 28px",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "pointer",
                  height: "100%",
                  boxSizing: "border-box",
                }}
                className="ambassador-directory-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = a.has_badge
                    ? "0 20px 25px -5px rgba(245, 158, 11, 0.18), 0 10px 10px -5px rgba(245, 158, 11, 0.18)"
                    : "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = a.has_badge
                    ? "0 10px 25px -5px rgba(245, 158, 11, 0.12), 0 8px 10px -6px rgba(245, 158, 11, 0.12)"
                    : "0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -2px rgba(0, 0, 0, 0.03)";
                }}
              >
                {/* Star Icon in Top Right */}
                <div style={{ position: "absolute", top: 20, right: 20, fontSize: "1.2rem" }}>
                  {a.has_badge ? (
                    <i className="bi bi-star-fill" style={{ color: "#fbbf24" }} />
                  ) : (
                    <i className="bi bi-star" style={{ color: "#cbd5e1" }} />
                  )}
                </div>

                {/* Badge Tag in Top Left */}
                {!!a.has_badge && (
                  <div style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    background: "#fbbf24",
                    color: "#1e293b",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    padding: "4px 10px",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    <i className="bi bi-award-fill" />
                    {a.badge_year ? `${a.badge_year}` : "Badge"}
                  </div>
                )}

                {/* Circular Avatar */}
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  overflow: "hidden",
                  position: "relative",
                  background: "linear-gradient(135deg, #fff0ec, #ffe4dc)",
                  border: a.has_badge ? "3px solid #fbbf24" : "1.5px solid #fecdb5",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                  marginBottom: 20,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {a.profile_image ? (
                    <Image src={a.profile_image} alt={a.full_name} fill style={{ objectFit: "cover" }} />
                  ) : (
                    <div style={{ fontWeight: 800, color: "#ee5e42", fontSize: "2rem" }}>
                      {a.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Profile Details */}
                <div style={{ textAlign: "center", width: "100%", display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1.1rem", lineHeight: "1.3" }}>
                      {a.full_name}
                    </div>
                    {a.current_role && (
                      <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 6, fontWeight: 500, lineHeight: "1.4" }}>
                        {a.current_role}
                      </div>
                    )}
                  </div>
                  {a.country && (
                    <div style={{ fontSize: "0.8rem", color: "#475569", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span>{countryFlag(a.country)}</span>
                      <span style={{ fontWeight: 500 }}>{a.country}</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbassadorsDirectory;
