import { Link } from "react-router-dom";

const sections = [
  {
    heading: "Main Pages",
    links: [
      { label: "Home", to: "/" },
      { label: "About Us", to: "/about" },
      { label: "Blogs & Tutorials", to: "/blogs" },
      { label: "Contact Us", to: "/contact-us" },
      { label: "Become a Contributor", to: "/become-a-contributor" },
      { label: "Membership & Credits", to: "/membership" },
      { label: "Learning Hub", to: "/learning-hub" },
    ],
  },
  {
    heading: "SAP Security",
    links: [
      { label: "SAP Security", to: "/sap-security" },
      { label: "SAP S/4HANA Security", to: "/sap-s4hana-security" },
      { label: "SAP Fiori Security", to: "/sap-fiori-security" },
      { label: "SAP BTP Security", to: "/sap-btp-security" },
      { label: "SAP Public Cloud Security", to: "/sap-public-cloud" },
      { label: "SAP Analytics Cloud Security", to: "/sap-sac-security" },
      { label: "SAP Cloud Identity Services", to: "/sap-cis" },
      { label: "SAP SuccessFactors Security", to: "/sap-successfactors-security" },
      { label: "Advanced SAP Security", to: "/sap-security-other" },
      { label: "Cybersecurity", to: "/sap-cybersecurity" },
    ],
  },
  {
    heading: "SAP GRC",
    links: [
      { label: "SAP GRC", to: "/sap-grc" },
      { label: "SAP Access Control", to: "/sap-access-control" },
      { label: "SAP Process Control", to: "/sap-process-control" },
      { label: "SAP IAG", to: "/sap-iag" },
    ],
  },
  {
    heading: "Content & Resources",
    links: [
      { label: "Expert Voices & Podcasts", to: "/podcasts" },
      { label: "Global Voices in SAP Security", to: "/videos" },
      { label: "Product Reviews", to: "/product-reviews" },
      { label: "Expert Recommendations", to: "/expert-recommendations" },
      { label: "Expert Papers", to: "/expert-papers" },
      { label: "Downloads", to: "/downloads" },
      { label: "SAP Licensing", to: "/sap-licensing" },
      { label: "News & Updates", to: "/news" },
      { label: "Announcements", to: "/announcements" },
    ],
  },
  {
    heading: "Learning Modules",
    links: [
      { label: "Security Fundamentals", to: "/learning/security-fundamentals" },
      { label: "User Management", to: "/learning/user-management" },
      { label: "Role Management", to: "/learning/role-management" },
      { label: "Authorization Concepts", to: "/learning/authorization-concepts" },
      { label: "Audit & Compliance", to: "/learning/audit-compliance" },
      { label: "GRC & Advanced Topics", to: "/learning/grc-advanced" },
    ],
  },
  {
    heading: "Community",
    links: [
      { label: "Leaderboard", to: "/leaderboard" },
      { label: "SAP Transactions Reference", to: "/transactions" },
      { label: "Contributor Application", to: "/apply-contributor" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms-conditions" },
      { label: "Accessibility Statement", to: "/accessibility-statement" },
      { label: "Safety Movement", to: "/safety-movement" },
      { label: "Security & Compliance", to: "/security-compliance-overview" },
      { label: "Responsible AI", to: "/responsible-ai-automation-statement" },
    ],
  },
  {
    heading: "Technical",
    links: [
      { label: "XML Sitemap", href: "/sitemap.xml" },
      { label: "LLMs.txt", href: "/llms.txt" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div style={s.page}>
      <div style={s.hero}>
        <h1 style={s.heroTitle}>Sitemap</h1>
        <p style={s.heroSub}>
          A complete directory of every page on SAP Security Expert.
        </p>
      </div>

      <div style={s.container}>
        <div style={s.grid}>
          {sections.map((sec) => (
            <div key={sec.heading} style={s.card}>
              <h2 style={s.cardHeading}>
                <span style={s.dot} />
                {sec.heading}
              </h2>
              <ul style={s.list}>
                {sec.links.map((link) =>
                  link.href ? (
                    <li key={link.href} style={s.item}>
                      <a href={link.href} target="_blank" rel="noopener noreferrer" style={s.link}>
                        <i className="bi bi-arrow-right-short" style={s.arrow} />
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.to} style={s.item}>
                      <Link to={link.to} style={s.link}>
                        <i className="bi bi-arrow-right-short" style={s.arrow} />
                        {link.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#f8fafc" },
  hero: {
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
    padding: "64px 24px 48px",
    textAlign: "center",
    color: "#fff",
  },
  heroTitle: { fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, margin: "0 0 12px", color: "#fff" },
  heroSub: { fontSize: 16, color: "#94a3b8", margin: 0 },
  container: { maxWidth: 1100, margin: "0 auto", padding: "48px 24px 64px" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 24,
  },
  card: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "24px 20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "#0f172a",
    margin: "0 0 14px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#1e3a5f",
    flexShrink: 0,
  },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 },
  item: {},
  link: {
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    color: "#334155",
    textDecoration: "none",
    padding: "5px 0",
    borderRadius: 4,
    transition: "color 0.15s",
  },
  arrow: { fontSize: 18, color: "#94a3b8", marginRight: 2, flexShrink: 0 },
};
