import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { getCommunityCountries } from "../services/api";
import { countryFlag } from "../constants/countries";

const MeetTheCommunity = () => {
  const [data, setData] = useState({ total_members: 0, total_countries: 0, countries: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    getCommunityCountries()
      .then((res) => { if (res.data?.status === "success") setData(res.data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px 80px" }}>
      <SEO title="Meet the SAP Security Community | SAP Security Expert" />

      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#ee5e42", letterSpacing: 1, textTransform: "uppercase" }}>Our Global Reach</span>
        <h1 style={{ fontSize: "2.4rem", fontWeight: 800, color: "#0f172a", margin: "10px 0 16px" }}>
          Meet the SAP Security Community
        </h1>
        {!loading && (
          <p style={{ fontSize: "1.15rem", color: "#475569", fontWeight: 600 }}>
            {data.total_members}+ professionals &nbsp;·&nbsp; {data.total_countries}+ countries
          </p>
        )}
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, padding: "32px 28px", boxShadow: "0 8px 24px rgba(15,23,42,0.04)", marginBottom: 32 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
          Our community spans professionals across these countries
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#64748b", margin: "0 0 24px" }}>
          Sorted by community size.
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Loading…</div>
        ) : data.countries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>No country data yet.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
            {data.countries.map((c) => (
              <div key={c.country} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f8fafc", borderRadius: 12, border: "1px solid #f1f5f9" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.92rem", fontWeight: 600, color: "#1e293b" }}>
                  <span style={{ fontSize: "1.3rem" }}>{countryFlag(c.country)}</span>
                  {c.country}
                </span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ee5e42" }}>
                  {c.count} expert{c.count === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA 1 — join */}
      <div style={{
        background: "linear-gradient(135deg, #1e293b 0%, #334155 60%, #1e3a5f 100%)",
        borderRadius: 20, padding: "36px 32px", textAlign: "center", marginBottom: 24,
      }}>
        <h3 style={{ color: "#fff", fontSize: "1.4rem", fontWeight: 800, margin: "0 0 10px" }}>
          You can be part of this global community too.
        </h3>
        <p style={{ color: "#cbd5e1", margin: "0 0 22px", fontSize: "0.95rem" }}>
          Register today and connect with SAP Security professionals worldwide.
        </p>
        <Link
          to="/member/signup"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, background: "#ee5e42", color: "#fff",
            padding: "13px 28px", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", textDecoration: "none",
          }}
        >
          Register Today <i className="bi bi-arrow-right" />
        </Link>
      </div>

      {/* CTA 2 — ambassador program */}
      <div style={{
        display: "flex", alignItems: "center", gap: 20, background: "#fff7ed", border: "1.5px solid #fed7aa",
        borderRadius: 20, padding: "28px 30px", flexWrap: "wrap",
      }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, background: "#ea580c", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <i className="bi bi-award-fill" style={{ color: "#fff", fontSize: "1.6rem" }} />
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
            SAP Security Expert — Country Ambassador
          </h3>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "#78350f", lineHeight: 1.5 }}>
            An earned recognition for outstanding SAP Security professionals who strengthen their local and global community.
          </p>
        </div>
        <Link to="/contact-us" style={{ color: "#ea580c", fontWeight: 700, fontSize: "0.9rem", textDecoration: "none", whiteSpace: "nowrap" }}>
          Know more →
        </Link>
      </div>
    </div>
  );
};

export default MeetTheCommunity;
