import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getContributorProfile } from "../services/api";
import Image from "next/image";

const expertiseLabels = {
  sapSecurity: "SAP Security",
  sapGrc: "SAP GRC",
  sapIag: "SAP IAG / Audit",
  sapBtp: "SAP BTP Security",
  sapCyber: "Cybersecurity",
};

const EXPERTISE_COLORS = {
  sapSecurity: { bg: "#fff0ec", color: "#c2410c", border: "#fed7aa" },
  sapGrc:      { bg: "#faf5ff", color: "#7c3aed", border: "#e9d5ff" },
  sapIag:      { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  sapBtp:      { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  sapCyber:    { bg: "#fff7ed", color: "#b45309", border: "#fde68a" },
};

function StatCard({ value, label, color, bg, border, icon }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 14, padding: "18px 16px", textAlign: "center" }}>
      <div style={{ fontSize: "2rem", marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color, fontWeight: 600, marginTop: 5, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>{label}</div>
    </div>
  );
}

export default function ContributorProfile() {
  const { id } = useParams();
  const [contributor, setContributor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);
    getContributorProfile(id)
      .then((res) => {
        if (res.data.status === "success") {
          const c = res.data.contributor;
          if (c.expertise && typeof c.expertise === "string") {
            try { c.expertise = JSON.parse(c.expertise); } catch { c.expertise = {}; }
          }
          ["sap_certifications", "sap_press_books"].forEach((f) => {
            if (c[f] && typeof c[f] === "string") {
              try { c[f] = JSON.parse(c[f]); } catch { c[f] = []; }
            }
          });
          setContributor(c);
        } else {
          setError(res.data.message || "Contributor not found");
        }
      })
      .catch(() => setError("Something went wrong. Please try again later."))
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

  if (error || !contributor) {
    return (
      <div style={{ background: "#f8fafc", minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", maxWidth: 480, width: "100%", padding: "48px 40px", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#fff0ec", border: "2px solid #fecdb5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <i className="bi bi-person-x-fill" style={{ fontSize: "1.8rem", color: "#ee5e42" }} />
          </div>
          <h2 style={{ margin: "0 0 10px", fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
            This contributor is no longer active
          </h2>
          <p style={{ margin: "0 0 28px", color: "#64748b", fontSize: "0.92rem", lineHeight: 1.7 }}>
            This profile is no longer available. The contributor may have left the platform or their account may have been deactivated.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/contributors" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ee5e42", color: "#fff", padding: "10px 22px", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.88rem" }}>
              <i className="bi bi-people-fill" /> View All Contributors
            </Link>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f1f5f9", color: "#475569", padding: "10px 22px", borderRadius: 10, textDecoration: "none", fontWeight: 600, fontSize: "0.88rem" }}>
              <i className="bi bi-house-fill" /> Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const expertiseEntries = contributor.expertise
    ? Object.entries(contributor.expertise).filter(([, v]) => v === true)
    : [];

  const hasReputation = contributor.experience_years || contributor.implementations_count ||
    contributor.peer_rating ||
    (contributor.sap_certifications && contributor.sap_certifications.length) ||
    (contributor.sap_press_books && contributor.sap_press_books.length);

  const avatarUrl = imgError || !contributor.profile_image ? null : contributor.profile_image;

  return (
    <div style={{ background: "#f1f5f9", minHeight: "100vh", paddingBottom: 60 }}>

      {/* ── Hero banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* decorative dots */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 100px", position: "relative" }}>
          <Link to="/contributors" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.55)", fontSize: "0.8rem", textDecoration: "none", marginBottom: 28, fontWeight: 500 }}>
            <i className="bi bi-arrow-left" /> All Contributors
          </Link>
          <div className="cp-hero-flex" style={{ display: "flex", alignItems: "flex-end", gap: 28, flexWrap: "wrap" }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: 110, height: 110, borderRadius: 20,
                border: "4px solid rgba(255,255,255,0.2)",
                background: "#1e293b", overflow: "hidden",
                boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={contributor.full_name} width={110} height={110}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={() => setImgError(true)} />
                ) : (
                  <span style={{ fontSize: "2.8rem", fontWeight: 800, color: "#ee5e42" }}>
                    {contributor.full_name?.charAt(0)}
                  </span>
                )}
              </div>
              {contributor.is_founder && (
                <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: "#ee5e42", color: "#fff", fontSize: "0.6rem", fontWeight: 800, padding: "2px 10px", borderRadius: 20, whiteSpace: "nowrap", letterSpacing: "0.06em" }}>
                  FOUNDER
                </div>
              )}
            </div>

            {/* Name + role */}
            <div className="cp-hero-name-container" style={{ flex: 1, minWidth: 200 }}>
              <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>
                {contributor.full_name}
              </h1>
              <p style={{ margin: "0 0 14px", color: "rgba(255,255,255,0.6)", fontSize: "0.95rem" }}>
                {contributor.role}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {contributor.organization && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", borderRadius: 8, padding: "4px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                    <i className="bi bi-building" /> {contributor.organization}
                  </span>
                )}
                {contributor.country && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)", borderRadius: 8, padding: "4px 12px", fontSize: "0.78rem", fontWeight: 500 }}>
                    <i className="bi bi-geo-alt" /> {contributor.country}
                  </span>
                )}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(238,94,66,0.2)", border: "1px solid rgba(238,94,66,0.4)", color: "#fda58a", borderRadius: 8, padding: "4px 12px", fontSize: "0.78rem", fontWeight: 600 }}>
                  <i className="bi bi-patch-check-fill" /> Verified Contributor
                </span>
              </div>
            </div>

            {/* Social links */}
            <div className="cp-hero-socials" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {contributor.linkedin && (
                <a href={contributor.linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1rem", textDecoration: "none" }}>
                  <i className="bi bi-linkedin" />
                </a>
              )}
              {contributor.twitter_handle && (
                <a href={`https://twitter.com/${contributor.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                  style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1rem", textDecoration: "none" }}>
                  <i className="bi bi-twitter-x" />
                </a>
              )}
              {contributor.personal_website && (
                <a href={contributor.personal_website} target="_blank" rel="noopener noreferrer"
                  style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1rem", textDecoration: "none" }}>
                  <i className="bi bi-globe" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

        {/* Pull-up stats strip */}
        {hasReputation && (Number(contributor.experience_years) > 0 || Number(contributor.implementations_count) > 0 || Number(contributor.peer_rating) > 0 || (contributor.sap_press_books && contributor.sap_press_books.length > 0) || Number(contributor.blog_count) > 0) && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12, marginTop: -36,
            marginBottom: 24, position: "relative", zIndex: 2,
          }}>
            {Number(contributor.experience_years) > 0 && (
              <StatCard value={`${contributor.experience_years}+`} label="Yrs Experience" icon="🗓️" color="#0369a1" bg="#f0f9ff" border="#bae6fd" />
            )}
            {Number(contributor.implementations_count) > 0 && (
              <StatCard value={`${contributor.implementations_count}+`} label="Implementations" icon="🏗️" color="#15803d" bg="#f0fdf4" border="#86efac" />
            )}
            {Number(contributor.peer_rating) > 0 && (
              <StatCard value={parseFloat(contributor.peer_rating).toFixed(1)} label={`Peer Rating${contributor.peer_rating_count > 0 ? ` (${contributor.peer_rating_count})` : ""}`} icon="⭐" color="#b45309" bg="#fffbeb" border="#fcd34d" />
            )}
            {contributor.sap_press_books && contributor.sap_press_books.length > 0 && (
              <StatCard value={contributor.sap_press_books.length} label="SAP PRESS Books" icon="📚" color="#7c3aed" bg="#faf5ff" border="#c4b5fd" />
            )}
            {Number(contributor.blog_count) > 0 && (
              <StatCard value={contributor.blog_count} label="Articles" icon="✍️" color="#ee5e42" bg="#fff8f6" border="#fecdb5" />
            )}
          </div>
        )}

        <div className="cp-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start", marginTop: hasReputation ? 0 : 24 }}>

          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* About */}
            {contributor.short_bio && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff0ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-person-lines-fill" style={{ color: "#ee5e42" }} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>About</h2>
                </div>
                <p style={{ margin: 0, color: "#475569", lineHeight: 1.8, fontSize: "0.95rem" }}>{contributor.short_bio}</p>
              </div>
            )}

            {/* SAP Certifications */}
            {contributor.sap_certifications && contributor.sap_certifications.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-patch-check-fill" style={{ color: "#1d4ed8" }} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>SAP Certifications</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {contributor.sap_certifications.map((cert, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#f8faff", border: "1px solid #dbeafe", borderRadius: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="bi bi-check-lg" style={{ color: "#1d4ed8", fontSize: "0.85rem" }} />
                      </div>
                      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e3a8a" }}>{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SAP PRESS Books */}
            {contributor.sap_press_books && contributor.sap_press_books.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#faf5ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className="bi bi-book-fill" style={{ color: "#7c3aed" }} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>SAP PRESS Books</h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {contributor.sap_press_books.map((book, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "#faf5ff", border: "1px solid #ddd6fe", borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "#ede9fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <i className="bi bi-journal-richtext" style={{ color: "#7c3aed" }} />
                      </div>
                      <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#3b0764" }}>
                        {typeof book === "object"
                          ? book.url
                            ? <a href={book.url} target="_blank" rel="noopener noreferrer" style={{ color: "#7c3aed", textDecoration: "none" }}>{book.title}</a>
                            : book.title
                          : book}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contributions */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff0ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="bi bi-file-earmark-text-fill" style={{ color: "#ee5e42" }} />
                </div>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                  Articles
                  {contributor.blog_count > 0 && (
                    <span style={{ marginLeft: 8, background: "#fff0ec", color: "#ee5e42", border: "1px solid #fecdb5", borderRadius: 20, padding: "1px 10px", fontSize: "0.75rem", fontWeight: 700 }}>
                      {contributor.blog_count}
                    </span>
                  )}
                </h2>
              </div>

              {!contributor.blogs || contributor.blogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8" }}>
                  <i className="bi bi-file-earmark" style={{ fontSize: "2rem", display: "block", marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>No published articles yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {contributor.blogs.map((blog) => (
                    <Link key={blog.id} to={`/${blog.category}/${blog.slug}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        display: "flex", gap: 14, alignItems: "flex-start",
                        padding: "14px", borderRadius: 12, border: "1px solid #f1f5f9",
                        background: "#fafafa", transition: "all 0.18s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#fecdb5"; e.currentTarget.style.background = "#fff8f6"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(238,94,66,0.08)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#f1f5f9"; e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        {blog.image && (
                          <img src={blog.image} alt={blog.title}
                            style={{ width: 72, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0, border: "1px solid #e2e8f0" }}
                            onError={e => { e.currentTarget.style.display = "none"; }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#ee5e42", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                            {blog.category?.replace(/-/g, " ")}
                          </div>
                          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.92rem", lineHeight: 1.35, marginBottom: 4 }}>
                            {blog.title}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", display: "flex", gap: 12, alignItems: "center" }}>
                            {blog.date && <span><i className="bi bi-calendar3" style={{ marginRight: 3 }} />{new Date(blog.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>}
                            {blog.view_count > 0 && <span><i className="bi bi-eye" style={{ marginRight: 3 }} />{blog.view_count}</span>}
                          </div>
                        </div>
                        <i className="bi bi-arrow-right" style={{ color: "#cbd5e1", fontSize: "0.9rem", flexShrink: 0, alignSelf: "center" }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Quick info card */}
            <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {contributor.designation && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <i className="bi bi-briefcase-fill" style={{ color: "#ee5e42", fontSize: "0.9rem", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Designation</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>{contributor.designation}</div>
                    </div>
                  </div>
                )}
                {contributor.organization && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <i className="bi bi-building-fill" style={{ color: "#ee5e42", fontSize: "0.9rem", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Organization</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>{contributor.organization}</div>
                    </div>
                  </div>
                )}
                {contributor.country && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <i className="bi bi-geo-alt-fill" style={{ color: "#ee5e42", fontSize: "0.9rem", marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Location</div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>{contributor.country}</div>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <i className="bi bi-calendar-check-fill" style={{ color: "#ee5e42", fontSize: "0.9rem", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Member Since</div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>
                      {new Date(contributor.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expertise */}
            {expertiseEntries.length > 0 && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Expertise</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {expertiseEntries.map(([key]) => {
                    const c = EXPERTISE_COLORS[key] || { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
                    return (
                      <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, border: `1.5px solid ${c.border}`, color: c.color, borderRadius: 20, padding: "4px 12px", fontSize: "0.75rem", fontWeight: 600 }}>
                        <i className="bi bi-check-circle-fill" style={{ fontSize: "0.65rem" }} />
                        {expertiseLabels[key] || key}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verified badge */}
            <div style={{ background: "linear-gradient(135deg, #fff8f6 0%, #fff 100%)", borderRadius: 16, padding: "20px", border: "1.5px solid #fecdb5", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff0ec", border: "1.5px solid #fecdb5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className="bi bi-patch-check-fill" style={{ color: "#ee5e42", fontSize: "1.2rem" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#ee5e42" }}>Verified Expert</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.4, marginTop: 2 }}>Vetted SAP Security community contributor</div>
                </div>
              </div>
            </div>

            {/* Connect */}
            {(contributor.linkedin || contributor.twitter_handle || contributor.personal_website) && (
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>Connect</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {contributor.linkedin && (
                    <a href={contributor.linkedin} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, textDecoration: "none", color: "#0369a1", fontSize: "0.82rem", fontWeight: 600 }}>
                      <i className="bi bi-linkedin" style={{ fontSize: "1rem" }} /> LinkedIn Profile
                    </a>
                  )}
                  {contributor.twitter_handle && (
                    <a href={`https://twitter.com/${contributor.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, textDecoration: "none", color: "#0f172a", fontSize: "0.82rem", fontWeight: 600 }}>
                      <i className="bi bi-twitter-x" style={{ fontSize: "1rem" }} /> @{contributor.twitter_handle}
                    </a>
                  )}
                  {contributor.personal_website && (
                    <a href={contributor.personal_website} target="_blank" rel="noopener noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, textDecoration: "none", color: "#0f172a", fontSize: "0.82rem", fontWeight: 600 }}>
                      <i className="bi bi-globe" style={{ fontSize: "1rem" }} /> Website
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 700px) {
          .cp-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .cp-hero-flex {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            gap: 16px !important;
          }
          .cp-hero-name-container {
            min-width: 0 !important;
            width: 100% !important;
          }
          .cp-hero-name-container h1 {
            font-size: 1.6rem !important;
          }
          .cp-hero-name-container div {
            justify-content: center !important;
          }
          .cp-hero-socials {
            justify-content: center !important;
            margin-top: 8px !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
