import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Image from "next/image";
import SEO from "../components/SEO";
import { getApprovedAmbassadors } from "../services/api";
import { countryFlag } from "../constants/countries";
import AmbassadorBadge from "../components/AmbassadorBadge";

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {[...ambassadors].sort((a, b) => (b.has_badge ? 1 : 0) - (a.has_badge ? 1 : 0)).map((a) => (
              <Link
                key={a.id}
                to={`/ambassador/${a.id}`}
                style={{
                  background: "#fff", borderRadius: 16, padding: 22, textDecoration: "none",
                  border: a.has_badge ? "1.5px solid #fbbf24" : "1px solid #e2e8f0",
                  boxShadow: a.has_badge ? "0 4px 16px rgba(251,191,36,0.12)" : "0 1px 4px rgba(0,0,0,0.04)",
                  display: "block", position: "relative",
                }}
              >
                {a.has_badge ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
                    <AmbassadorBadge country={a.country} year={a.badge_year} size={110} isLightbox />
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{a.full_name}</div>
                      {a.current_role && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{a.current_role}</div>}
                      {a.country && (
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>
                          {countryFlag(a.country)} {a.country}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#f1f5f9", position: "relative" }}>
                      {a.profile_image ? (
                        <Image src={a.profile_image} alt={a.full_name} fill style={{ objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#ee5e42", fontSize: "1.3rem" }}>
                          {a.full_name?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{a.full_name}</div>
                      {a.current_role && <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{a.current_role}</div>}
                      {a.country && (
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>
                          {countryFlag(a.country)} {a.country}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AmbassadorsDirectory;
