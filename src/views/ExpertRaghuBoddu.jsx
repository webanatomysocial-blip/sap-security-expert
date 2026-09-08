import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { VITE_SITE_URL } from "../utils/env";
import "../css/ExpertProfile.css";

const EXT = { target: "_blank", rel: "noopener noreferrer" };

const EXPERTISE_AREAS = [
  {
    icon: "bi bi-shield-lock-fill",
    title: "SAP Security & Authorizations",
    items: [
      "SAP authorization architecture",
      "Role design and optimization (PFCG)",
      "User and identity governance",
      "SAP S/4HANA security & migration",
      "Security in SAP Fiori & launchpads",
      "Authorization analysis & tracing",
      "Least privilege architecture",
      "Non-human and technical identities",
    ],
  },
  {
    icon: "bi bi-diagram-3-fill",
    title: "SAP GRC and Access Governance",
    items: [
      "SAP Access Control (ARA, ARM, EAM, BRM)",
      "Access Risk Analysis & rulesets",
      "Segregation of Duties (SoD) design",
      "User Access Review automation",
      "Emergency Access Management (Firefighter)",
      "SAP Identity Access Governance (IAG)",
      "SAP Process Control & continuous monitoring",
      "Enterprise Risk Management",
    ],
  },
  {
    icon: "bi bi-cpu-fill",
    title: "SAP Security & Cybersecurity",
    items: [
      "SAP threat monitoring & triage",
      "SAP SecOps architecture",
      "SAP SIEM / SOAR integrations",
      "SAP HANA database security",
      "Data protection & masking",
      "Privileged access management (PAM)",
      "Audit logging & forensics",
      "Continuous security monitoring",
    ],
  },
  {
    icon: "bi bi-robot",
    title: "Security Automation and AI",
    items: [
      "SAP security orchestration",
      "GRC workflow automation (BRFplus/MSMP)",
      "AI-powered security operations",
      "SAP authorizations for AI agents",
      "Non-human identity governance",
      "Autonomous access anomaly detection",
      "Human-in-the-loop security governance",
      "Continuous audit readiness automation",
    ],
  },
  {
    icon: "bi bi-clipboard-check-fill",
    title: "Audit, Risk & Compliance",
    items: [
      "IT General Controls (ITGC) frameworks",
      "SAP audit readiness & reporting",
      "Statutory audit trail compliance",
      "Internal controls testing",
      "SoD mitigation control design",
      "Regulatory compliance (SOX, GDPR, ISO)",
      "Continuous controls oversight (CCM)",
      "Risk assessment & gap analysis",
    ],
  },
];

const BOOKS = [
  {
    title: "SAP Access Control — Comprehensive Guide",
    badge: "Bestseller",
    desc: "A comprehensive authoritative guide to SAP Access Control covering architecture, installation, configuration, Access Risk Analysis, Emergency Access Management, Access Request Management, Business Role Management, User Access Reviews, Segregation of Duties, BRFplus, MSMP workflows, and Fiori integration.",
    href: "https://www.sap-press.com/sap-access-control_5636/",
  },
  {
    title: "SAP Process Control 12.0 — Comprehensive Guide",
    badge: "Official Guide",
    desc: "A practical guide to SAP Process Control covering compliance governance, configuration, master data, automated control evaluations, continuous controls monitoring (CCM), policy lifecycles, executive reporting, SAP Fiori, and Financial Compliance Management.",
    href: "https://www.sap-press.com/sap-process-control_5799/",
  },
  {
    title: "SAP Cloud Identity Access Governance (IAG)",
    badge: "Cloud Guide",
    desc: "An in-depth guide introducing SAP Cloud Identity Access Governance (IAG) and its core cloud modules: access analysis, privileged access management, access requests, role design, and seamless hybrid integration with on-premise SAP ECC and S/4HANA environments.",
    href: "https://www.sap-press.com/introducing-sap-cloud-identity-access-governance-iag_5985/",
  },
];

const CERTIFICATIONS = [
  "CISA – Certified Information Systems Auditor",
  "CFE – Certified Fraud Examiner",
  "Certified Data Privacy Solutions Engineer (CDPSE)",
  "SAP Certified Security Professional",
  "SAP GRC Associate",
  "ITIL V3 Certified",
  "Foundation PRINCE2",
  "Security+ (CompTIA)",
];

const RESEARCH_TOPICS = [
  "Evolution of SAP Security",
  "Digital Access Risk & Indirect Usage",
  "Continuous SAP SecOps",
  "Continuous Access Governance",
  "SAP Security Vulnerabilities & Patching",
  "Access & SoD Risk Management",
  "Modernization of SAP GRC",
  "Enterprise AI Agent Authorizations",
  "Non-Human Identity Governance",
  "SAP Data Protection & Cryptography",
  "Audit Trails & Regulatory Compliance",
  "Security Automation in Hybrid SAP",
  "Cloud-Based SAP Identity (IAS/IPS)",
];

const VIEWPOINT_QUESTIONS = [
  { q: "Who has access to the business system?", n: "01" },
  { q: "How do they technically have access to it?", n: "02" },
  { q: "What business process does that access permit?", n: "03" },
  { q: "What other systems and APIs are interconnected?", n: "04" },
  { q: "What was the identity actually doing in practice?", n: "05" },
  { q: "Is unauthorized or anomalous activity detectable in real time?", n: "06" },
  { q: "Is the internal control under continuous surveillance?", n: "07" },
  { q: "How can we automate governance while keeping humans accountable?", n: "08" },
];

export default function ExpertRaghuBoddu() {
  const pageUrl = `${VITE_SITE_URL}/experts/raghu-boddu/`;

  return (
    <div className="expert-profile-wrapper">
      <SEO
        title="Raghu Boddu | SAP Security & GRC Expert | SAP Security Expert"
        description="Raghu Boddu is an SAP Security and GRC expert with 25+ years of experience across SAP security, GRC, audit, access governance, automation, and enterprise cybersecurity. CEO of ToggleNow and founder of SAP Security Expert."
        url={pageUrl}
        image="/assets/raghu_boddu.png"
        type="profile"
        keywords="Raghu Boddu, SAP Security, SAP GRC, SAP Access Control, SAP Process Control, SAP Identity Access Governance, SAP S/4HANA Security, SAP Cybersecurity, Segregation of Duties, Emergency Access Management, SAP SecOps, Security Automation, AI for SAP Security, ToggleNow, SAP PRESS Author"
        author="Raghu Boddu"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Raghu Boddu",
          jobTitle: "CEO, ToggleNow & Founder, SAP Security Expert",
          description:
            "SAP Security and GRC expert with 25+ years of experience across SAP security, governance, risk and compliance, audits, access governance, automation, and enterprise cybersecurity.",
          url: pageUrl,
          image: `${VITE_SITE_URL}/assets/raghu_boddu.png`,
          sameAs: [
            "https://www.linkedin.com/in/raghuboddu",
            "https://www.linkedin.com/in/bodduraghu/",
            "https://blog.sap-press.com/author/raghu-boddu",
            "https://community.sap.com/t5/user/viewprofilepage/user-id/600573",
            "https://www.togglenow.com",
            "https://www.raghuboddu.com",
          ],
          worksFor: { "@type": "Organization", name: "ToggleNow", url: "https://www.togglenow.com" },
          founder: { "@type": "Organization", name: "SAP Security Expert", url: VITE_SITE_URL },
        }}
      />

      {/* ────────────────────────────────────────────────────────────
          1. HERO BANNER
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-hero">
        <div className="ep-hero-grid-pattern" />
        <div className="ep-hero-glow-1" />
        <div className="ep-hero-glow-2" />

        <div className="ep-hero-container">
          {/* Breadcrumbs */}
          <nav className="ep-breadcrumbs" aria-label="Breadcrumbs">
            <Link to="/">Home</Link>
            <span className="ep-breadcrumbs-sep">/</span>
            <Link to="/community">Community</Link>
            <span className="ep-breadcrumbs-sep">/</span>
            <span className="ep-breadcrumbs-current">Raghu Boddu</span>
          </nav>

          <div className="ep-hero-layout">
            {/* Left Content Column */}
            <div className="ep-hero-content">
              <div className="ep-badge-row">
                <span className="ep-eyebrow-pill">
                  <span className="pulse-dot" />
                  Founder & Principal Architect
                </span>
                <span className="ep-status-tag">
                  <i className="bi bi-patch-check-fill" style={{ color: "#ee5e42" }} />
                  SAP PRESS Author
                </span>
                <span className="ep-status-tag">
                  <i className="bi bi-award-fill" style={{ color: "#f59e0b" }} />
                  3x Microsoft MVP
                </span>
              </div>

              <h1 className="ep-hero-title">
                Raghu Boddu <br />
                <span className="ep-text-gradient">SAP Security & GRC Expert</span>
              </h1>

              <div className="ep-hero-designation">
                <span className="highlight">CEO @ ToggleNow</span>
                <span>•</span>
                <span>Founder, SAP Security Expert</span>
                <span>•</span>
                <span>Advisory Board Member</span>
              </div>

              <p className="ep-hero-bio-short">
                Over 25 years pioneering enterprise SAP Security, Access Governance, GRC, and Cyber Risk. Author of 3 authoritative SAP PRESS books, transforming static authorization audits into continuous, automated, and AI-enabled SAP SecOps.
              </p>

              <div className="ep-hero-actions">
                <a href="#publications" className="ep-btn-primary">
                  <span>Explore SAP PRESS Books</span>
                  <i className="bi bi-arrow-right" />
                </a>
                <a href="#viewpoint" className="ep-btn-secondary">
                  <span>Executive Viewpoint</span>
                  <i className="bi bi-compass" />
                </a>
              </div>

              {/* Social Channels */}
              <div className="ep-social-strip">
                <a
                  href="https://www.linkedin.com/in/raghuboddu"
                  {...EXT}
                  className="ep-social-pill"
                  title="LinkedIn Profile"
                  aria-label="LinkedIn Profile"
                >
                  <i className="bi bi-linkedin" />
                </a>
                <a
                  href="https://blog.sap-press.com/author/raghu-boddu"
                  {...EXT}
                  className="ep-social-pill"
                  title="SAP PRESS Author Page"
                  aria-label="SAP PRESS Author Page"
                >
                  <i className="bi bi-book-fill" />
                </a>
                <a
                  href="https://www.togglenow.com"
                  {...EXT}
                  className="ep-social-pill"
                  title="ToggleNow Website"
                  aria-label="ToggleNow Website"
                >
                  <i className="bi bi-building" />
                </a>
                <a
                  href="https://www.raghuboddu.com"
                  {...EXT}
                  className="ep-social-pill"
                  title="Personal Site"
                  aria-label="Personal Site"
                >
                  <i className="bi bi-globe2" />
                </a>
              </div>
            </div>

            {/* Right Visual / Portrait Card */}
            <div className="ep-hero-visual">
              <div className="ep-portrait-card">
                <div className="ep-portrait-frame">
                  <img
                    src="/assets/raghu_boddu.png"
                    alt="Raghu Boddu - SAP Security & GRC Expert"
                    className="ep-portrait-img"
                    width="420"
                    height="470"
                  />
                  <div className="ep-portrait-badge-top">
                    <i className="bi bi-shield-check" />
                    <span>VERIFIED AUTHORITY</span>
                  </div>
                  <div className="ep-portrait-caption">
                    <div>
                      <h2 className="ep-portrait-caption-name">Raghu Boddu</h2>
                      <p className="ep-portrait-caption-sub">Hyderabad, India • Global Advisory</p>
                    </div>
                    <div className="ep-portrait-verified-stamp" title="Verified Practitioner">
                      <i className="bi bi-check-lg" />
                    </div>
                  </div>
                </div>

                {/* Floating Micro-Credential */}
                <div className="ep-floating-tag">
                  <div className="ep-floating-icon">
                    <i className="bi bi-award" />
                  </div>
                  <div>
                    <div className="ep-floating-title">25+ Years Experience</div>
                    <div className="ep-floating-sub">Trusted by Fortune 500 Enterprises</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          2. PULL-UP STATS METRIC STRIP
          ──────────────────────────────────────────────────────────── */}
      <div className="ep-stats-container">
        <div className="ep-stats-grid">
          <div className="ep-stat-card">
            <div className="ep-stat-icon-wrap coral">
              <i className="bi bi-shield-shaded" />
            </div>
            <div className="ep-stat-details">
              <span className="ep-stat-number">25+</span>
              <span className="ep-stat-label">Years in SAP Security</span>
            </div>
          </div>

          <div className="ep-stat-card">
            <div className="ep-stat-icon-wrap navy">
              <i className="bi bi-book-half" />
            </div>
            <div className="ep-stat-details">
              <span className="ep-stat-number">3</span>
              <span className="ep-stat-label">SAP PRESS Books</span>
            </div>
          </div>

          <div className="ep-stat-card">
            <div className="ep-stat-icon-wrap amber">
              <i className="bi bi-trophy-fill" />
            </div>
            <div className="ep-stat-details">
              <span className="ep-stat-number">3x</span>
              <span className="ep-stat-label">Microsoft MVP Awardee</span>
            </div>
          </div>

          <div className="ep-stat-card">
            <div className="ep-stat-icon-wrap emerald">
              <i className="bi bi-globe" />
            </div>
            <div className="ep-stat-details">
              <span className="ep-stat-number">2005</span>
              <span className="ep-stat-label">Founded Security Expert</span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          3. EXECUTIVE OVERVIEW & PILLARS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section">
        <div className="ep-container">
          <div className="ep-overview-grid">
            <div className="ep-overview-card">
              <div className="ep-kicker">
                <i className="bi bi-compass" />
                Executive Summary
              </div>
              <h2 className="ep-section-title">25+ Years Shaping SAP Security & GRC</h2>
              <div className="ep-prose">
                <p>
                  Raghu Boddu is the CEO of <strong>ToggleNow</strong> and heads global product innovation and design. In 2005, he founded <a href="https://www.sapsecurityexpert.com" {...EXT}>SAP Security Expert</a> — creating a definitive peer platform and knowledge exchange for practitioners in SAP Security, GRC, Cybersecurity, and Audit.
                </p>
                <p>
                  With deep hands-on expertise across complex global SAP landscapes, Raghu has guided multinational organizations through the transition from legacy static role administration into agile, automated, and continuously governed access environments. He has delivered pioneering orchestrated automations in SAP GRC, chronicled in published <a href="https://togglenow.com/automation-stories/" {...EXT}>Automation Stories</a> acclaimed throughout the ecosystem.
                </p>
                <p>
                  As an educator, author with <a href="https://blog.sap-press.com/author/raghu-boddu" {...EXT}>SAP PRESS / Rheinwerk Publishing</a>, and frequent industry keynote speaker, he actively drives the technical evolution toward modern cloud identity and AI-driven SAP SecOps.
                </p>
              </div>
            </div>

            {/* Strategic Pillars Column */}
            <div className="ep-pillars-column">
              <div className="ep-pillar-card">
                <div className="ep-pillar-icon-box">
                  <i className="bi bi-building-check" />
                </div>
                <div className="ep-pillar-content">
                  <h3>Executive Leadership</h3>
                  <p>
                    CEO at <a href="https://www.togglenow.com" {...EXT}>ToggleNow Global</a> and Advisory Board Member at <a href="https://aginnolabs.com/" {...EXT}>Access Governance Inno Labs Oy</a>.
                  </p>
                </div>
              </div>

              <div className="ep-pillar-card">
                <div className="ep-pillar-icon-box">
                  <i className="bi bi-people-fill" />
                </div>
                <div className="ep-pillar-content">
                  <h3>Community Stewardship</h3>
                  <p>
                    Founder of <strong>SAP Security Expert</strong> — championing practitioner-first tutorials, frameworks, and open collaboration since 2005.
                  </p>
                </div>
              </div>

              <div className="ep-pillar-card">
                <div className="ep-pillar-icon-box">
                  <i className="bi bi-journal-check" />
                </div>
                <div className="ep-pillar-content">
                  <h3>SAP PRESS Author</h3>
                  <p>
                    Authored canonical references on SAP Access Control, SAP Process Control, and SAP Cloud Identity Access Governance (IAG).
                  </p>
                </div>
              </div>

              <div className="ep-pillar-card">
                <div className="ep-pillar-icon-box">
                  <i className="bi bi-award-fill" />
                </div>
                <div className="ep-pillar-content">
                  <h3>Recognized Industry Fellow</h3>
                  <p>
                    Former 3-year Microsoft MVP for Windows Shell, contributor of 30+ Microsoft KB articles, and leading SAP community author.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          4. SAP PRESS PUBLICATIONS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section light-bg" id="publications">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-book-fill" />
              Publications & Literature
            </span>
            <h2 className="ep-section-title">Author with SAP PRESS</h2>
            <p className="ep-section-subtitle">
              Comprehensive reference books that serve as the definitive standard for security architects and GRC administrators worldwide.
            </p>
          </div>

          <div className="ep-books-grid">
            {BOOKS.map((b) => (
              <div className="ep-book-card" key={b.title}>
                <div>
                  <div className="ep-book-top">
                    <span className="ep-book-badge">{b.badge}</span>
                    <i className="bi bi-bookmark-star ep-book-icon" />
                  </div>
                  <h3 className="ep-book-title">{b.title}</h3>
                  <p className="ep-book-desc">{b.desc}</p>
                </div>
                <a href={b.href} {...EXT} className="ep-book-link">
                  <span>View Book at SAP PRESS</span>
                  <i className="bi bi-box-arrow-up-right" />
                </a>
              </div>
            ))}
          </div>

          {/* Online Masterclass Callout */}
          <div className="ep-course-callout">
            <div className="ep-course-callout-content">
              <h4>Masterclass: Authorizations and Security for SAP S/4HANA</h4>
              <p>
                Raghu served as official instructor for Rheinwerk / SAP PRESS's premier 5-session curriculum covering S/4HANA authorizations, PFCG optimization, Fiori catalogs & spaces, security tracing, and audit readiness.
              </p>
            </div>
            <a
              href="https://www.sap-press.com/online-courses/authorizations-and-security-for-sap-s4hana/"
              {...EXT}
              className="ep-course-btn"
            >
              Explore Course Syllabus <i className="bi bi-arrow-right" />
            </a>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          5. DOMAINS OF EXPERTISE
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-grid-fill" />
              Technical Competencies
            </span>
            <h2 className="ep-section-title">Where Raghu's Work Sits</h2>
            <p className="ep-section-subtitle">
              Operating at the critical intersection of SAP Security, enterprise compliance governance, and modern cyber operations.
            </p>
          </div>

          <div className="ep-expertise-grid">
            {EXPERTISE_AREAS.map((area) => (
              <div className="ep-expertise-card" key={area.title}>
                <div className="ep-expertise-header">
                  <div className="ep-expertise-icon">
                    <i className={area.icon} />
                  </div>
                  <h3>{area.title}</h3>
                </div>
                <ul className="ep-expertise-list">
                  {area.items.map((item) => (
                    <li key={item}>
                      <i className="bi bi-check2-circle" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          6. PHILOSOPHY: FROM STATIC SECURITY TO CONTEMPORARY SECOPS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section light-bg" id="viewpoint">
        <div className="ep-container">
          <div className="ep-evolution-container">
            <div className="ep-section-header centered">
              <span className="ep-kicker">
                <i className="bi bi-diagram-2" />
                Evolutionary Perspective
              </span>
              <h2 className="ep-section-title">From SAP Security to SAP SecOps</h2>
              <p className="ep-section-subtitle">
                Over 25 years, the paradigm has shifted from isolated user roles to complex, multi-cloud digital identity fabrics.
              </p>
            </div>

            <div className="ep-compare-grid">
              <div className="ep-compare-card classic">
                <span className="ep-compare-badge">1998 — 2015 Paradigm</span>
                <h3>Classic SAP Security</h3>
                <p className="ep-compare-flow">
                  Users → Roles (PFCG) → Authorizations → Transactions (T-codes)
                </p>
                <p style={{ marginTop: 14, fontSize: "0.9rem", color: "#64748b", lineHeight: 1.6 }}>
                  Static, perimeter-based role models focused purely on t-code restriction and annual periodic audits.
                </p>
              </div>

              <div className="ep-compare-card modern">
                <span className="ep-compare-badge">Contemporary Era</span>
                <h3>Modern SAP SecOps Landscape</h3>
                <p className="ep-compare-flow">
                  Humans + AI Agents → APIs → Fiori Spaces → BTP → Non-Human IDs → Microservices
                </p>
                <p style={{ marginTop: 14, fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.6 }}>
                  Dynamic identity orchestration, automated continuous monitoring, runtime behavioral telemetry, and API controls.
                </p>
              </div>
            </div>

            {/* Signature Can Do vs Did Do Callout */}
            <div className="ep-candodid-box">
              <div className="ep-candodid-header">
                <i className="bi bi-lightbulb-fill" />
                <h3>The Core Philosophy: "Can Do vs. Did Do"</h3>
              </div>
              <div className="ep-candodid-body">
                <p>
                  <strong>Can Do</strong> represents what an identity technically possesses permission to execute according to configured roles and profiles.
                </p>
                <p>
                  <strong>Did Do</strong> captures what that identity actually executed across business tables, RFC destinations, and application payloads.
                </p>
                <p style={{ marginBottom: 0 }}>
                  This distinction marks the boundary between check-the-box compliance and genuine threat prevention. As Raghu notes in his acclaimed article{" "}
                  <Link to="/expert-recommendations/sap-security-2015-model-already-behind" style={{ color: "#ee5e42", fontWeight: 700 }}>
                    "The 2015 Security Model is Already Behind"
                  </Link>
                  , modern defenses require continuous visibility into active operational risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          7. CREDENTIALS & CERTIFICATIONS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-patch-check" />
              Credentials
            </span>
            <h2 className="ep-section-title">Professional Qualifications & Honors</h2>
            <p className="ep-section-subtitle">
              Certified across international standards for information systems audit, fraud examination, and enterprise privacy.
            </p>
          </div>

          <div className="ep-cert-grid">
            {CERTIFICATIONS.map((cert) => (
              <div className="ep-cert-chip" key={cert}>
                <i className="bi bi-patch-check-fill ep-cert-icon" />
                <span className="ep-cert-name">{cert}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          8. THE 8 CRITICAL ACCESS QUESTIONS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section light-bg">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-question-diamond" />
              Security Audit Mindset
            </span>
            <h2 className="ep-section-title">Beyond "Can the User Access It?"</h2>
            <p className="ep-section-subtitle">
              The fundamental questions security architects must ask when evaluating enterprise exposure today.
            </p>
          </div>

          <div className="ep-questions-grid">
            {VIEWPOINT_QUESTIONS.map((item) => (
              <div className="ep-question-card" key={item.n}>
                <span className="ep-question-number">{item.n}</span>
                <span className="ep-question-text">{item.q}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          9. RESEARCH & THOUGHT LEADERSHIP TOPICS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-journal-text" />
              Research & Analysis
            </span>
            <h2 className="ep-section-title">Specialized Research Topics</h2>
            <p className="ep-section-subtitle">
              Ongoing technical investigations and published analyses addressing where emerging cloud architectures challenge legacy controls.
            </p>
          </div>

          <div className="ep-tags-cloud">
            {RESEARCH_TOPICS.map((topic) => (
              <span className="ep-topic-tag" key={topic}>
                {topic}
              </span>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 32 }}>
            <Link to="/expert-recommendations" className="ep-btn-secondary" style={{ color: "#0f172a", borderColor: "#cbd5e1", background: "#fff" }}>
              <span>Browse All Expert Articles</span>
              <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          10. MEDIA & BROADCAST INTERVIEWS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section light-bg">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-camera-video" />
              Media Coverage
            </span>
            <h2 className="ep-section-title">Keynote Interviews & Broadcasts</h2>
            <p className="ep-section-subtitle">
              Expert commentary on enterprise artificial intelligence risks, digital frauds, and enterprise defense strategies.
            </p>
          </div>

          <div className="ep-media-grid">
            <div className="ep-media-card">
              <div>
                <div className="ep-media-header">
                  <span className="ep-media-channel-badge">Sakshi TV</span>
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Broadcast Interview</span>
                </div>
                <h3>Is Artificial Intelligence a Threat to Enterprise Security?</h3>
                <p>
                  Comprehensive television interview analyzing AI-enabled threat actors, autonomous agent vulnerabilities, and the defensive safeguards organizations must adopt.
                </p>
              </div>
              <a href="https://www.youtube.com/watch?v=AiGP4hL041s" {...EXT} className="ep-media-btn">
                <span>Watch Interview on YouTube</span>
                <i className="bi bi-play-circle-fill" />
              </a>
            </div>

            <div className="ep-media-card">
              <div>
                <div className="ep-media-header">
                  <span className="ep-media-channel-badge">Hybiz TV</span>
                  <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Financial Fraud Analysis</span>
                </div>
                <h3>Combating Enterprise & Cyber Frauds</h3>
                <p>
                  Special feature spotlighting emerging digital fraud patterns, insider threat vectors in ERP systems, and proactive forensic controls for fraud prevention.
                </p>
              </div>
              <a href="https://www.youtube.com/watch?v=Rhs66vy54OE" {...EXT} className="ep-media-btn">
                <span>Watch Feature on YouTube</span>
                <i className="bi bi-play-circle-fill" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          11. CURRENT VENTURES
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-briefcase" />
              Ventures & Initiatives
            </span>
            <h2 className="ep-section-title">Active Ventures</h2>
          </div>

          <div className="ep-ventures-grid">
            <div className="ep-venture-card">
              <div>
                <h3>ToggleNow Global</h3>
                <p>
                  A next-generation technology company pioneering automated SAP Security, continuous GRC oversight, and AI-enabled SAP SecOps. ToggleNow translates decades of field experience into managed capabilities and modular automation products.
                </p>
              </div>
              <div className="ep-venture-actions">
                <a href="https://www.togglenow.com" {...EXT} className="ep-btn-primary">
                  <span>Visit ToggleNow</span>
                  <i className="bi bi-box-arrow-up-right" />
                </a>
                <a href="https://togglenow.com/solutions/" {...EXT} className="ep-btn-secondary" style={{ color: "#0f172a", borderColor: "#cbd5e1" }}>
                  <span>Explore Solutions</span>
                </a>
              </div>
            </div>

            <div className="ep-venture-card">
              <div>
                <h3>SAP Security Expert</h3>
                <p>
                  Founded in 2005 as a community-driven sanctuary for practitioners across SAP Security, GRC, BTP, and Audit. Providing independent research, podcasts, implementation checklists, and expert peer insights.
                </p>
              </div>
              <div className="ep-venture-actions">
                <Link to="/" className="ep-btn-primary">
                  <span>Explore Knowledge Hub</span>
                  <i className="bi bi-house" />
                </Link>
                <Link to="/podcasts" className="ep-btn-secondary" style={{ color: "#0f172a", borderColor: "#cbd5e1" }}>
                  <span>Listen to Podcasts</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          12. CONNECT CHANNELS
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-section light-bg">
        <div className="ep-container">
          <div className="ep-section-header centered">
            <span className="ep-kicker">
              <i className="bi bi-share" />
              Channels
            </span>
            <h2 className="ep-section-title">Connect with Raghu Boddu</h2>
            <p className="ep-section-subtitle">
              Available for keynote speaking, executive advisory, research collaboration, and podcast discussions.
            </p>
          </div>

          <div className="ep-connect-grid">
            <a href="https://www.linkedin.com/in/raghuboddu" {...EXT} className="ep-connect-card">
              <div className="ep-connect-icon">
                <i className="bi bi-linkedin" />
              </div>
              <h3>LinkedIn</h3>
              <p>Professional updates, architecture diagrams & articles</p>
            </a>

            <a href="https://blog.sap-press.com/author/raghu-boddu" {...EXT} className="ep-connect-card">
              <div className="ep-connect-icon">
                <i className="bi bi-book-half" />
              </div>
              <h3>SAP PRESS</h3>
              <p>Author catalog, published volumes & eBites</p>
            </a>

            <a href="https://www.togglenow.com" {...EXT} className="ep-connect-card">
              <div className="ep-connect-icon">
                <i className="bi bi-building" />
              </div>
              <h3>ToggleNow</h3>
              <p>Enterprise GRC & SAP Security solutions</p>
            </a>

            <a href="https://www.raghuboddu.com" {...EXT} className="ep-connect-card">
              <div className="ep-connect-icon">
                <i className="bi bi-globe" />
              </div>
              <h3>Personal Portal</h3>
              <p>raghuboddu.com personal website & blog</p>
            </a>
          </div>

          <p style={{ textAlign: "center", marginTop: 28, fontSize: "0.92rem", color: "#64748b" }}>
            SAP Community Profile: <strong style={{ color: "#0f172a" }}>@GRCwithRaghu</strong> &nbsp;·&nbsp; Member since 2005
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────────
          13. BOTTOM CTA BANNER
          ──────────────────────────────────────────────────────────── */}
      <section className="ep-cta-section">
        <div className="ep-container">
          <div className="ep-cta-banner">
            <h2>Explore More SAP Security Insights</h2>
            <p>
              Dive into our library of expert tutorials, download practical security checklists, or connect with fellow enterprise architects.
            </p>
            <div className="ep-cta-btn-group">
              <Link to="/expert-recommendations" className="ep-btn-primary">
                <span>View Expert Articles</span>
                <i className="bi bi-arrow-right" />
              </Link>
              <Link to="/contact-us" className="ep-btn-secondary">
                <span>Contact Community Team</span>
                <i className="bi bi-envelope" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
