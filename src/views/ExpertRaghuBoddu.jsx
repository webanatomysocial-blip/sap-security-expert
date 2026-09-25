import { useEffect, useRef, useState } from "react";
import SEO from "../components/SEO";
import { VITE_SITE_URL } from "../utils/env";
import {
  LuAward, LuBookOpen, LuClock, LuPlay, LuShieldCheck, LuUsers, LuX,
} from "react-icons/lu";
import {
  ARTICLE_CATEGORIES, AUDIT_MATRIX, BOOKS, CERTIFICATIONS, EXPERTISE, LINKS,
  MODERN_LANDSCAPE, PODCAST_TOPICS, RESEARCH_TOPICS, SECTIONS, SPEAKING_CHANNELS,
  TRUST, VIEWPOINT_QUESTIONS,
} from "../constants/raghuBoddu";
import "../css/ExpertRaghuBoddu.css";

const EXT = { target: "_blank", rel: "noopener noreferrer" };
const TITLE = "Raghu Boddu | SAP Security Expert | SAP Security, GRC & SecOps";
const DESCRIPTION =
  "Raghu Boddu is an SAP Security and GRC expert with 25+ years of experience across SAP Security, cybersecurity, access governance, automation, audit and SAP SecOps.";

/* ── Small shared primitives ──────────────────────────────────────── */

function Arrow({ className = "" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`rb-arrow ${className}`}>
      <path d="M3 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExtLink({ href, children, className = "" }) {
  return (
    <a href={href} {...EXT} className={`rb-ext-link ${className}`}>
      <span>{children}</span>
      <Arrow />
    </a>
  );
}

function Reveal({ children, delay = 0, className = "", as = "div", style }) {
  const Tag = as;
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-visible={visible}
      style={delay > 0 ? { ...style, transitionDelay: `${delay}ms` } : style}
      className={`rb-reveal ${className}`}
    >
      {children}
    </Tag>
  );
}

function EyebrowPill({ text }) {
  return (
    <div className="rb-eyebrow-pill">
      <span className="rb-eyebrow-pill-dot" />
      <span className="rb-eyebrow-pill-text">{text}</span>
    </div>
  );
}

function SectionHeader({ eyebrow, title, intro }) {
  return (
    <Reveal className="rb-section-header">
      {eyebrow && <EyebrowPill text={eyebrow} />}
      <h2 className="rb-section-title">{title}</h2>
      {intro && <p className="rb-section-intro">{intro}</p>}
    </Reveal>
  );
}

function Section({ id, children, tone, className = "" }) {
  return (
    <section id={id} className={`rb-section ${tone === "muted" ? "rb-section--muted" : ""} ${className}`}>
      <div className="rb-section-inner">{children}</div>
    </section>
  );
}

/* ── Nav / scroll chrome ──────────────────────────────────────────── */

function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setPct(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="rb-scroll-progress">
      <div className="rb-scroll-progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

function SectionNav() {
  const [active, setActive] = useState(SECTIONS[0].id);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Profile sections" className="rb-section-nav">
      <p className="rb-eyebrow rb-section-nav-eyebrow">In this profile</p>
      <ul>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={active === s.id ? "active" : ""}>
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileSectionBar() {
  return (
    <div className="rb-mobile-section-bar">
      <div className="rb-mobile-section-bar-inner">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`}>{s.label}</a>
        ))}
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function ExpertRaghuBoddu() {
  const pageUrl = `${VITE_SITE_URL}/experts/raghu-boddu/`;

  return (
    <div className="rb-page">
      <SEO
        title={TITLE}
        description={DESCRIPTION}
        url={pageUrl}
        image="/assets/raghu_boddu_hero.png"
        type="profile"
        keywords="Raghu Boddu, SAP Security, SAP GRC, SAP SecOps, SAP Access Control, SAP Process Control, SAP Identity Access Governance, SAP S/4HANA Security, SAP Cybersecurity, Segregation of Duties, Emergency Access Management, Security Automation, AI for SAP Security, ToggleNow, SAP PRESS Author"
        author="Raghu Boddu"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Raghu Boddu",
          jobTitle: "SAP Security Expert",
          description: DESCRIPTION,
          url: LINKS.personalSite,
          sameAs: [LINKS.linkedin, LINKS.sapPressAuthor, LINKS.sapCommunity, LINKS.sapSecurityExpert, LINKS.toggleNow],
          knowsAbout: [
            "SAP Security", "SAP GRC", "Cyber Security", "Access Governance", "SAP S/4HANA Security",
            "SAP Cloud Security", "Security Automation", "AI for SAP Security", "SAP SecOps", "Audit & Compliance",
          ],
          worksFor: { "@type": "Organization", name: "ToggleNow", url: LINKS.toggleNow },
        }}
      />

      <ScrollProgress />
      <MobileSectionBar />

      <div className="rb-shell">
        <div className="rb-shell-nav">
          <SectionNav />
        </div>

        <main>
          <Hero />
          <TrustStrip />
          <Overview />
          <Expertise />
          <AuditRisk />
          <Books />
          <Training />
          <Certifications />
          <SecOps />
          <Research />
          <Articles />
          <Podcasts />
          <Speaking />
          <Interviews />
          <ToggleNow />
          <Viewpoint />
          <Connect />
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Hero */

const TRUST_ICONS = [LuClock, LuBookOpen, LuShieldCheck, LuAward, LuUsers];

function Hero() {
  return (
    <section id="overview" className="rb-section rb-hero">
      <div className="rb-section-inner">
        <div className="rb-hero-grid">
          <Reveal>
            <p className="rb-eyebrow">SAP Security Expert</p>
            <h1>
              <span style={{ display: "block" }}>Raghu Boddu</span>
              <span className="rb-hero-role">SAP Security Expert</span>
            </h1>
            <p className="rb-hero-tagline">SAP Security, GRC, Cyber Security, Access Governance, Automation, AI</p>
            <p className="rb-hero-desc">
              Raghu Boddu is an SAP Security and GRC expert with around 25 years of experience across
              SAP security, governance, risk and compliance, audits, access governance, automation and
              enterprise cybersecurity.
            </p>
            <div className="rb-hero-actions">
              <a href="#expertise" className="rb-btn-primary">Explore Expertise <Arrow className="rb-arrow-white" /></a>
              <a href="#connect" className="rb-btn-outline">Connect</a>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <figure className="rb-hero-photo">
              <img src="/assets/raghu_boddu_hero.webp" alt="Raghu Boddu" loading="eager" decoding="async" />
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <div className="rb-trust-strip">
      <ul className="rb-trust-grid">
        {TRUST.map((t, i) => {
          const Icon = TRUST_ICONS[i] || LuShieldCheck;
          return (
            <Reveal as="li" key={t.value} delay={i * 60} className="rb-trust-item">
              <p className="rb-trust-value">
                <Icon size={16} style={{ color: "#ea5845", flexShrink: 0, marginTop: 2 }} />
                <span>{t.value}</span>
              </p>
              <p className="rb-trust-label">{t.label}</p>
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ Overview */

function Overview() {
  return (
    <Section id="about">
      <SectionHeader eyebrow="About Raghu Boddu" title="A career built around practical SAP security" />
      <div className="rb-overview-grid">
        <Reveal delay={60} className="rb-overview-text">
          <p>
            He is, by title, CEO of ToggleNow, but heads up product innovation and design. In 2005 he
            founded <ExtLink href={LINKS.sapSecurityExpert}>SAP Security Expert</ExtLink>, a community
            and knowledge platform for practitioners in the fields of SAP Security, GRC, Cybersecurity
            and Audit.
          </p>
          <p>
            Raghu has vast experience in complex SAP environments and a proven track record of helping
            organizations transform from traditional role administration and periodic compliance
            activities to practical, automated and continuously governed SAP security. He has delivered
            many orchestrated automations in SAP GRC, without even using RPA or AI, published as{" "}
            <ExtLink href={LINKS.automationStories}>Automation Stories</ExtLink> and appreciated by the
            SAP Security &amp; GRC community.
          </p>
          <p>
            He is also a published author with{" "}
            <ExtLink href={LINKS.sapPressAuthor}>SAP PRESS / Rheinwerk Publishing</ExtLink>, educator,
            speaker, practitioner and contributor to the SAP security community.
          </p>
        </Reveal>

        <Reveal delay={120} className="rb-card">
          <EyebrowPill text="Key Distinctions" />
          <ul className="rb-list-plain">
            {[
              "25+ years of SAP Security, GRC, Audit & Automation experience",
              "SAP PRESS author: SAP Access Control, SAP Process Control and SAP Cloud Identity and Access Governance",
              "Certifications: CISA, CFE, CDPSE, SAP Certified Security Professional, SAP GRC Associate",
              "Focus: SAP Security, SAP GRC, Access Governance, SAP Cybersecurity, Audit & Compliance, SAP S/4HANA Security, SAP Cloud Security, Security Automation and AI for SAP Security",
              "Former Microsoft MVP: Microsoft Most Valuable Professional for three years in a row",
            ].map((item) => (
              <li key={item}>
                <span className="rb-dot" />
                <span>{item}</span>
              </li>
            ))}
            <li>
              <span className="rb-dot" />
              <span>
                Leadership: CEO, <ExtLink href={LINKS.toggleNow}>ToggleNow Global</ExtLink> · Board
                Member, <ExtLink href={LINKS.agInnoLabs}>Access Governance Inno Labs Oy</ExtLink>
              </span>
            </li>
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- Expertise */

function Expertise() {
  return (
    <Section id="expertise" tone="muted">
      <SectionHeader
        eyebrow="Capabilities"
        title="Areas of Expertise"
        intro="Raghu's work sits at the intersection of SAP Security, enterprise risk and cyber security."
      />
      <div className="rb-expertise-grid">
        {EXPERTISE.map((e, i) => (
          <Reveal as="article" key={e.n} delay={i * 80} className="rb-expertise-card">
            <p className="rb-expertise-num">{e.n}</p>
            <h3>{e.title}</h3>
            <p className="rb-expertise-summary">{e.summary}</p>
            <ul className="rb-expertise-topics">
              {e.topics.map((t) => (
                <li key={t}>
                  <span className="rb-dot" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

function AuditRisk() {
  return (
    <Section id="audit">
      <SectionHeader
        eyebrow="Controls"
        title="Audit, Risk & Compliance"
        intro="A structured control view across ITGC, SAP audit readiness and continuous controls oversight."
      />
      <div className="rb-audit-grid">
        {AUDIT_MATRIX.map((c, i) => (
          <Reveal key={c} delay={i * 40} className="rb-audit-cell">
            <p className="rb-audit-code">C-{String(i + 1).padStart(2, "0")}</p>
            <p>{c}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

/* --------------------------------------------------------------- Books */

function Books() {
  const renderBadge = (b) => {
    if (b.badgeType === "bestseller") {
      return (
        <span className="rb-card-badge rb-badge-bestseller">
          <svg className="rb-badge-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span>{b.badge}</span>
        </span>
      );
    }
    if (b.badgeType === "official") {
      return (
        <span className="rb-card-badge rb-badge-official">
          <svg className="rb-badge-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
          </svg>
          <span>{b.badge}</span>
        </span>
      );
    }
    return (
      <span className="rb-card-badge rb-badge-cloud">
        <svg className="rb-badge-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
        <span>{b.badge}</span>
      </span>
    );
  };

  return (
    <Section id="books" className="rb-publications-section">
      <div className="rb-pub-header-wrap">
        <div>
          <div className="rb-pub-kicker">
            <span className="rb-pub-kicker-bar" />
            <span className="rb-pub-kicker-text">PUBLICATIONS</span>
          </div>
          <h2 className="rb-pub-main-title">Books & Guides</h2>
          <p className="rb-pub-subtitle">
            In-depth resources to help you master SAP GRC, Process Control, and Cloud Security.
          </p>
        </div>
        <div className="rb-pub-nav-arrows" aria-hidden="true">
          <button type="button" className="rb-pub-nav-btn" aria-label="Previous">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" className="rb-pub-nav-btn" aria-label="Next">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="rb-pub-grid">
        {BOOKS.map((b, i) => (
          <Reveal as="article" key={b.title} delay={i * 80} className="rb-pub-card">
            {/* Card Header */}
            <div className="rb-pub-card-header">
              {renderBadge(b)}
              <div className="rb-pub-publisher-top">
                <svg className="rb-pub-book-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                </svg>
                <div className="rb-pub-publisher-names">
                  <span className="rb-pub-pub-primary">Rheinwerk</span>
                  <span className="rb-pub-pub-sub">SAP PRESS</span>
                </div>
              </div>
            </div>

            {/* Book Graphic Showcase with organic pastel backdrop blob */}
            <div className="rb-pub-art-stage">
              <div
                className="rb-pub-art-blob"
                style={{ backgroundColor: b.blobColor }}
              />
              <a href={b.href} {...EXT} className="rb-pub-book-link" aria-label={`View ${b.title}`}>
                <img
                  src={b.cover}
                  alt={b.title}
                  className="rb-pub-cover-img"
                  loading="lazy"
                />
              </a>
            </div>

            {/* Book Body */}
            <div className="rb-pub-card-body">
              <h3 className="rb-pub-book-title">
                <a href={b.href} {...EXT}>{b.title}</a>
              </h3>
              <p className="rb-pub-book-desc">{b.description}</p>

              {/* Card Footer with icon, publisher and link */}
              <div className="rb-pub-card-footer">
                <div className="rb-pub-meta-row">
                  <svg className="rb-pub-meta-icon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" />
                  </svg>
                  <span className="rb-pub-meta-text">{b.publisher}</span>
                </div>
                <a href={b.href} {...EXT} className="rb-pub-action-link">
                  <span>{b.cta}</span>
                  <Arrow />
                </a>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="rb-pub-bottom-cta">
        <a href={LINKS.sapPressAuthor} {...EXT} className="rb-pub-pill-btn">
          <span>View all publications</span>
          <Arrow />
        </a>
      </div>
    </Section>
  );
}

function Training() {
  return (
    <Section id="training">
      <div className="rb-split-grid">
        <div>
          <SectionHeader
            eyebrow="Course"
            title="SAP S/4HANA Security Training"
            intro="Raghu has also contributed as an instructor for SAP PRESS / Rheinwerk's Authorizations and Security for SAP S/4HANA course. It includes practical demonstrations, is spread over 5 sessions and is available today as a recorded session."
          />
          <Reveal delay={80} style={{ marginTop: 24 }}>
            <ExtLink href={LINKS.training}>View Course</ExtLink>
          </Reveal>
        </div>
        <Reveal delay={80} className="rb-card">
          <EyebrowPill text="Course Topics" />
          <ul className="rb-topic-list">
            {["Authorization concepts", "User management", "Roles & profiles", "Fiori authorizations", "Troubleshooting", "Auditing"].map((t) => (
              <li key={t}>
                <span><span className="rb-dot" /><span>{t}</span></span>
                <span className="rb-tech" style={{ color: "var(--rb-text-muted)" }}>SAP S/4HANA</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}

function Certifications() {
  const stack1 = CERTIFICATIONS.slice(0, 4);
  const stack2 = CERTIFICATIONS.slice(4, 8);
  return (
    <Section id="certifications" tone="muted">
      <SectionHeader eyebrow="Credentials" title="Professional Qualifications & Certifications" />
      <div className="rb-cert-grid">
        {[stack1, stack2].map((stack, si) => (
          <ul className="rb-cert-list" key={si}>
            {stack.map((c, i) => (
              <Reveal as="li" key={c.code} delay={(i + si * 4) * 50}>
                <div className="rb-cert-code">
                  <span className="rb-dot" />
                  <span>{c.code}</span>
                </div>
                <span>{c.name}</span>
              </Reveal>
            ))}
          </ul>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------------------------------------- SecOps */

function SecOps() {
  return (
    <Section id="secops">
      <SectionHeader
        eyebrow="Signature thinking"
        title="From SAP Security to SAP SecOps"
        intro="Classic SAP Security was largely static, focused on users, roles, and periodic audits. Modern enterprise landscapes demand a transition to continuous, real-time SAP SecOps."
      />

      <div className="rb-secops-grid">
        <Reveal delay={60} className="rb-model-card">
          <div className="rb-model-head">
            <div>
              <p className="rb-eyebrow" style={{ color: "var(--rb-text-muted)" }}>Traditional Model</p>
              <h3>Classic SAP Security</h3>
            </div>
            <span className="rb-model-tag">Static · Periodic</span>
          </div>
          <p className="rb-model-desc">
            Built primarily around static role provisioning, standard authorization profiles, and
            periodic manual governance reviews.
          </p>
          <div>
            <p className="rb-eyebrow rb-pipeline-label">Authorization Pipeline</p>
            <div className="rb-pipeline-grid">
              {["Users", "Roles", "Authorizations", "Transactions"].map((s, i) => (
                <div className="rb-pipeline-step" key={s}>
                  <span>0{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rb-model-footer">
            <p>Focus: Entitlement assignment &amp; quarterly box-ticking compliance.</p>
          </div>
        </Reveal>

        <Reveal delay={120} className="rb-model-card rb-model-card--modern">
          <div className="rb-model-head">
            <div>
              <EyebrowPill text="Modern Paradigm" />
              <h3>SAP SecOps Landscape</h3>
            </div>
            <span className="rb-model-tag rb-model-tag--active"><span className="rb-eyebrow-pill-dot" />Continuous · Telemetry</span>
          </div>
          <p className="rb-model-desc">
            Encompasses human and non-human identities across hybrid cloud fabrics, orchestrated
            automations, and live risk monitoring.
          </p>
          <div>
            <p className="rb-eyebrow rb-pipeline-label">Ecosystem Vectors</p>
            <div className="rb-tag-chip-row">
              {MODERN_LANDSCAPE.map((m) => <span className="rb-tag-chip" key={m}>{m}</span>)}
            </div>
          </div>
          <div className="rb-model-footer">
            <p><strong style={{ color: "#0f172a" }}>Focus:</strong>{" "}
              <span style={{ color: "var(--rb-text-secondary)" }}>Pervasive visibility, live threat detection &amp; human oversight.</span>
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={160} className="rb-formula-banner">
        <div className="rb-formula-intro">
          <EyebrowPill text="The Core Analytical Framework" />
          <h3 className="rb-formula-title">The "Can Do" vs. "Did Do" Duality</h3>
          <p className="rb-formula-desc">
            Raghu's foundational methodology asserts that knowing what an identity is permitted to do
            is insufficient without analyzing what that identity actually performs.
          </p>
        </div>

        <div className="rb-cando-grid">
          <Reveal delay={80} className="rb-cando-card">
            <div className="rb-cando-tag-row">
              <span className="rb-cando-tag"><span className="rb-eyebrow-pill-dot" />Entitlement State</span>
              <span className="rb-cando-meta">Static Analysis</span>
            </div>
            <h4>Can Do</h4>
            <p className="rb-cando-quote">"What can this identity technically execute?"</p>
            <p className="rb-cando-desc">
              Evaluates assigned roles, transaction authorizations, and Segregation of Duties (SoD)
              permissions configured in SAP GRC and identity governance repositories.
            </p>
          </Reveal>
          <Reveal delay={160} className="rb-cando-card">
            <div className="rb-cando-tag-row">
              <span className="rb-cando-tag"><span className="rb-eyebrow-pill-dot" />Runtime Activity</span>
              <span className="rb-cando-meta">Dynamic Telemetry</span>
            </div>
            <h4>Did Do</h4>
            <p className="rb-cando-quote">"What did the identity actually perform?"</p>
            <p className="rb-cando-desc">
              Captures audit logs, transaction executions, database queries, and behavioral anomalies
              to verify if potential access was actually exercised.
            </p>
          </Reveal>
        </div>

        <Reveal delay={240} className="rb-formula-row">
          <div className="rb-formula-boxes">
            <span className="rb-formula-box">Can Do</span>
            <span className="rb-formula-plus">+</span>
            <span className="rb-formula-box">Did Do</span>
            <span className="rb-formula-goesto">&#10132;</span>
            <span className="rb-formula-box rb-formula-box--result">Security Context</span>
          </div>
          <p className="rb-formula-note">
            Continuous correlation enables proactive incident containment rather than retrospective
            audits.
          </p>
        </Reveal>
      </Reveal>
    </Section>
  );
}

/* ------------------------------------------------------------ Research */

function Research() {
  const mid = Math.ceil(RESEARCH_TOPICS.length / 2);
  const col1 = RESEARCH_TOPICS.slice(0, mid);
  const col2 = RESEARCH_TOPICS.slice(mid);

  return (
    <Section id="research" tone="muted">
      <SectionHeader
        eyebrow="Insights"
        title="Research & Expert Insights"
        intro="Raghu writes on emerging issues in SAP Security, GRC and enterprise cyber security, with particular interest in areas where traditional security models are challenged by changing technology."
      />
      <div className="rb-link-grid">
        {[col1, col2].map((col, ci) => (
          <ul className="rb-link-list" key={ci}>
            {col.map((t, i) => (
              <Reveal as="li" key={t} delay={(i + ci * mid) * 30}>
                <a href={LINKS.sseRecommendations} {...EXT}>
                  <span>{t}</span>
                  <Arrow />
                </a>
              </Reveal>
            ))}
          </ul>
        ))}
      </div>

      <Reveal delay={100} className="rb-recommendation-card">
        <EyebrowPill text="Expert Recommendation" />
        <h3>SAP Security 2015 model already behind</h3>
        <p>
          In his latest SAP Security Expert work, Raghu states that the traditional security model
          from 2015 is no longer sufficient for the current SAP landscape, where Fiori, BTP, APIs,
          automation and AI open up additional access paths and identities.
        </p>
        <ExtLink href={LINKS.sse2015Model}>Read Expert Recommendation</ExtLink>
      </Reveal>
    </Section>
  );
}

function Articles() {
  return (
    <Section id="articles">
      <SectionHeader
        eyebrow="Published content"
        title="Technical Articles & Published Content"
        intro="Raghu regularly publishes practical SAP Security and GRC content through SAP Security Expert, SAP PRESS and other professional channels."
      />
      <div className="rb-articles-grid">
        {ARTICLE_CATEGORIES.map((a, i) => (
          <Reveal as="article" key={a.category} delay={i * 60} className="rb-article-card">
            <p>{a.category}</p>
            <p>{a.description}</p>
            <ExtLink href={LINKS.sapSecurityExpert}>Read articles</ExtLink>
          </Reveal>
        ))}
      </div>
      <Reveal delay={100} style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 24 }}>
        <ExtLink href={LINKS.linkedin}>Publishing presence on LinkedIn</ExtLink>
        <ExtLink href={LINKS.sapPressAuthor}>SAP PRESS author page</ExtLink>
      </Reveal>
    </Section>
  );
}

function Podcasts() {
  const mid = Math.ceil(PODCAST_TOPICS.length / 2);
  const col1 = PODCAST_TOPICS.slice(0, mid);
  const col2 = PODCAST_TOPICS.slice(mid);
  return (
    <Section id="podcasts" tone="muted">
      <SectionHeader
        eyebrow="Conversations"
        title="Podcasts & Discussions"
        intro="Raghu joins conversations with SAP Security, GRC, cybersecurity and technology professionals."
      />
      <div className="rb-link-grid">
        {[col1, col2].map((col, ci) => (
          <ul className="rb-link-list rb-podcast-list" key={ci}>
            {col.map((p, i) => (
              <Reveal as="li" key={p} delay={(i + ci * mid) * 40}>
                <a href={LINKS.ssePodcasts} {...EXT}>
                  <span>
                    <span className="rb-podcast-kicker"><span className="rb-dot" />Podcast / Discussion</span>
                    <span className="rb-podcast-title">{p}</span>
                  </span>
                  <Arrow />
                </a>
              </Reveal>
            ))}
          </ul>
        ))}
      </div>
      <Reveal delay={80} style={{ marginTop: 32 }}>
        <ExtLink href={LINKS.ssePodcasts}>SAP Security Expert Podcasts</ExtLink>
      </Reveal>
    </Section>
  );
}

function Speaking() {
  return (
    <Section id="speaking">
      <SectionHeader eyebrow="Community" title="Speaking & Sharing Knowledge" />
      <div className="rb-speaking-grid">
        <Reveal>
          <ul className="rb-channel-cell-list">
            {SPEAKING_CHANNELS.map((s, i) => (
              <Reveal as="li" key={s} delay={i * 50}>
                <span className="rb-dot" />
                <span>{s}</span>
              </Reveal>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={100} className="rb-quote-block" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <blockquote style={{ margin: 0 }}>
            <p>"So what should a security professional actually do differently on Monday morning?"</p>
            <footer>Raghu's focus is deliberately practical.</footer>
          </blockquote>
        </Reveal>
      </div>
    </Section>
  );
}

function Interviews() {
  const [activeVideo, setActiveVideo] = useState(null);
  const media = [
    { source: "Sakshi TV", title: 'Interview: "Is AI a threat?"', href: LINKS.sakshiTv, videoId: "AiGP4hL041s" },
    { source: "Hybiz TV", title: "Cyber frauds: television discussion", href: LINKS.hybizTv, videoId: "Rhs66vy54OE" },
  ];

  return (
    <Section id="interviews" tone="muted">
      <SectionHeader
        eyebrow="Media"
        title="Interviews & Articles"
        intro="Raghu's professional journey and expertise in SAP and AI have been spotlighted on technology, professional and media platforms."
      />
      <div className="rb-media-grid">
        {media.map((m, i) => {
          const key = `${m.videoId}-${i}`;
          const isPlaying = activeVideo === key;
          const thumbnailUrl = `https://img.youtube.com/vi/${m.videoId}/hqdefault.jpg`;
          return (
            <Reveal as="article" key={key} delay={i * 70} className="rb-media-card">
              <div className="rb-media-thumb-wrap">
                {isPlaying ? (
                  <div className="rb-media-iframe-wrap">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${m.videoId}?autoplay=1&rel=0&modestbranding=1`}
                      title={m.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                    <button type="button" onClick={() => setActiveVideo(null)} aria-label="Close video" className="rb-media-close-btn">
                      <LuX size={16} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setActiveVideo(key)} className="rb-media-thumb-btn" aria-label={`Play video: ${m.title}`}>
                    <img src={thumbnailUrl} alt={m.title} loading="lazy" referrerPolicy="no-referrer" />
                    <div className="rb-media-gradient" />
                    <div className="rb-media-source-badge">{m.source}</div>
                    <div className="rb-media-play">
                      <div className="rb-media-play-circle"><LuPlay size={20} /></div>
                    </div>
                  </button>
                )}
              </div>
              <div className="rb-media-body">
                <span className="rb-media-kicker"><span className="rb-dot" />{m.source}</span>
                <h3 className="rb-media-title">{m.title}</h3>
                <div className="rb-media-footer">
                  <button type="button" onClick={() => setActiveVideo(key)} className="rb-media-watch-btn">
                    <LuPlay size={14} /> Watch Video
                  </button>
                  <a href={m.href} {...EXT} style={{ fontSize: 13, color: "var(--rb-text-muted)" }}>Open on YouTube</a>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <Reveal delay={80} style={{ marginTop: 32, maxWidth: "48rem", fontSize: 15, lineHeight: 1.65, color: "var(--rb-text-secondary)" }}>
        <p>
          Raghu has also contributed significantly to a variety of technical communities, publishing
          on <ExtLink href={LINKS.sapCommunity}>SAP Community Blogs</ExtLink> and authoring over 30
          Microsoft Knowledge Base articles during his earlier Microsoft ecosystem work. He was awarded
          Microsoft Most Valuable Professional (MVP) for Windows Shell three years running.
        </p>
      </Reveal>
    </Section>
  );
}

/* ----------------------------------------------------------- ToggleNow */

function ToggleNow() {
  const chain = ["SAP Security", "GRC", "Cybersecurity", "Automation", "AI-driven Security Operations"];
  return (
    <Section id="togglenow">
      <div className="rb-split-grid">
        <div>
          <SectionHeader
            eyebrow="Leadership"
            title="ToggleNow"
            intro="Raghu is the CEO of ToggleNow, a SAP-centric technology and services company working across SAP Security, GRC, cyber security, automation and AI-driven security operations."
          />
          <Reveal delay={80} style={{ marginTop: 16, fontSize: 15, lineHeight: 1.65, color: "var(--rb-text-secondary)" }}>
            <p>
              At ToggleNow his focus is on translating years of SAP Security and GRC experience into
              practical technology, automation and managed capabilities.
            </p>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <ExtLink href={LINKS.toggleNow}>Go to ToggleNow</ExtLink>
              <ExtLink href={LINKS.toggleNowSolutions}>Discover ToggleNow products &amp; solutions</ExtLink>
              {LINKS.toggleNowSecOps && <ExtLink href={LINKS.toggleNowSecOps}>Explore SAP Security &amp; SecOps</ExtLink>}
              <ExtLink href={LINKS.automationStories}>Automation Stories</ExtLink>
            </div>
          </Reveal>
        </div>
        <Reveal delay={100} className="rb-card">
          <EyebrowPill text="Executive Leadership" />
          <p className="rb-exec-label">CEO / Product Innovation</p>
          <ol className="rb-chain-list">
            {chain.map((c, i) => (
              <li key={c}>
                <p className="rb-chain-step">{c}</p>
                {i < chain.length - 1 && <p className="rb-chain-arrow">&#8595;</p>}
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </Section>
  );
}

/* ----------------------------------------------------------- Viewpoint */

function Viewpoint() {
  const stack1 = VIEWPOINT_QUESTIONS.slice(0, 4);
  const stack2 = VIEWPOINT_QUESTIONS.slice(4, 8);
  return (
    <Section id="viewpoint" tone="muted">
      <SectionHeader eyebrow="Philosophy" title="Raghu's Viewpoint" />
      <Reveal delay={60} className="rb-viewpoint-quote">
        <p>SAP Security should be more than just "Can the user access it?"</p>
        <p>Security today demands a wider set of questions.</p>
      </Reveal>

      <div className="rb-viewpoint-grid">
        {[stack1, stack2].map((stack, si) => (
          <ol className="rb-viewpoint-list" key={si}>
            {stack.map((q, i) => (
              <Reveal as="li" key={q} delay={(i + si * 4) * 50}>
                <span className="rb-viewpoint-num">{String(i + 1 + si * 4).padStart(2, "0")}</span>
                <span className="rb-viewpoint-q">{q}</span>
              </Reveal>
            ))}
          </ol>
        ))}
      </div>

      <Reveal delay={80} style={{ marginTop: 32, maxWidth: "48rem", fontSize: 15, color: "var(--rb-text-secondary)" }}>
        <p>These questions are increasingly shaping Raghu's philosophy of SAP Security.</p>
      </Reveal>
    </Section>
  );
}

function Connect() {
  const channels = [
    { label: "LinkedIn", value: "Raghu Boddu", href: LINKS.linkedin },
    { label: "SAP Profile", value: "@GRCwithRaghu", href: LINKS.sapCommunity },
    { label: "SAP Security Expert", value: "sapsecurityexpert.com", href: LINKS.sapSecurityExpert },
    { label: "ToggleNow", value: "togglenow.com", href: LINKS.toggleNow },
    { label: "Personal website", value: "www.raghuboddu.com", href: LINKS.personalSite },
  ];
  return (
    <Section id="connect">
      <SectionHeader
        eyebrow="Get in touch"
        title="Follow & Connect"
        intro="Connect with Raghu on his professional channels or his personal website for professional discussions, speaking opportunities, interviews, podcasts, research collaborations or SAP Security / GRC topics."
      />
      <div className="rb-connect-grid">
        <Reveal>
          <ul className="rb-channel-list">
            {channels.map((c) => (
              <li key={c.label}>
                <a href={c.href} {...EXT}>
                  <span>
                    <span className="rb-channel-label">{c.label}</span>
                    <span className="rb-channel-value">{c.value}</span>
                  </span>
                  <Arrow />
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={100} className="rb-card rb-cta-card">
          <EyebrowPill text="Start A Conversation" />
          <h3>Speaking, interviews, podcasts and research collaborations</h3>
          <div className="rb-cta-actions">
            <a href={LINKS.linkedin} {...EXT} className="rb-cta-primary">Connect with Raghu <Arrow className="rb-arrow-white" /></a>
            <a href={LINKS.sapSecurityExpert} {...EXT} className="rb-cta-outline">Explore SAP Security Expert <Arrow /></a>
            <a href={LINKS.toggleNow} {...EXT} className="rb-cta-outline-muted">Visit ToggleNow <Arrow /></a>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
