import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getApprovedContributors } from '../services/api';
// next-disabled: import '../css/About.css';

const TOPICS = [
  {
    icon: 'bi bi-shield-lock-fill',
    title: 'SAP Security & GRC',
    desc: 'Role design, authorization objects, SoD analysis, Access Control workflows, and system hardening.',
  },
  {
    icon: 'bi bi-cloud-check-fill',
    title: 'SAP BTP & Cloud Security',
    desc: 'IAS/IPS configuration, BTP Role Collections, API security, and public cloud compliance.',
  },
  {
    icon: 'bi bi-person-badge-fill',
    title: 'Identity & Access Governance',
    desc: 'SAP IAG, automated provisioning, machine-learning risk analysis, and hybrid identity management.',
  },
  {
    icon: 'bi bi-speedometer2',
    title: 'S/4HANA & Fiori Security',
    desc: 'HANA database permissions, business catalog design, Fiori launchpad hardening, and OData security.',
  },
  {
    icon: 'bi bi-graph-up-arrow',
    title: 'Analytics & SuccessFactors',
    desc: 'SAC row-level security, SAP SuccessFactors RBP design, GDPR-compliant HR data governance.',
  },
  {
    icon: 'bi bi-cpu-fill',
    title: 'Cybersecurity & CIS',
    desc: 'Infrastructure hardening, CIS benchmark implementation, Security Audit Log, and SIEM/SOAR integration.',
  },
];

const VALUES = [
  {
    title: 'Practitioner-First',
    desc: 'Every article is written by professionals actively working in SAP security — not marketers. If it is not useful in a real project, it does not get published.',
  },
  {
    title: 'Accuracy Over Volume',
    desc: 'We would rather publish one well-researched, technically correct guide than ten shallow posts. Our editorial review holds contributors to real-world standards.',
  },
  {
    title: 'Open Knowledge Sharing',
    desc: 'SAP security expertise has traditionally been siloed. We believe the whole community benefits when professionals share what they have learned through hard experience.',
  },
  {
    title: 'Continuous Improvement',
    desc: 'SAP landscapes evolve with every release cycle. We maintain and update content to reflect the latest version guidance, security notes, and industry best practice.',
  },
];

export default function About() {
  const [contributors, setContributors] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    getApprovedContributors()
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : res.data?.contributors || [];
        setContributors(list.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoadingTeam(false));
  }, []);

  return (
    <div className="about-wrapper">
      <Helmet>
        <title>About Us | SAP Security Expert</title>
        <meta
          name="description"
          content="SAP Security Expert is the leading practitioner community for SAP Security, GRC, BTP, and Identity professionals. Learn about our mission, contributors, and editorial standards."
        />
        <link rel="canonical" href="http://dev.sapsecurityexpert.com/about" />
      </Helmet>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <span className="about-hero-eyebrow">About SAP Security Expert</span>
          <h1>The Community Built by SAP Security Practitioners</h1>
          <p className="about-hero-lead">
            SAP Security Expert is an independent knowledge hub created by and for the professionals
            who design, audit, and protect SAP landscapes every day. We publish in-depth tutorials,
            step-by-step implementation guides, and best-practice frameworks across SAP Security,
            GRC, BTP, S/4HANA, and Identity — with no vendor bias and no fluff.
          </p>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <div className="about-stats-bar">
        <div className="container">
          <div className="about-stats-grid">
            <div className="about-stat-item">
              <span className="about-stat-number">14+</span>
              <span className="about-stat-label">Topic Categories</span>
            </div>
            <div className="about-stat-item">
              <span className="about-stat-number">100+</span>
              <span className="about-stat-label">Expert Articles</span>
            </div>
            <div className="about-stat-item">
              <span className="about-stat-number">10k+</span>
              <span className="about-stat-label">Monthly Readers</span>
            </div>
            <div className="about-stat-item">
              <span className="about-stat-number">50+</span>
              <span className="about-stat-label">Countries Reached</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mission ───────────────────────────────────────────────────────── */}
      <section className="about-section">
        <div className="container">
          <div className="about-mission-grid">
            <div className="about-mission-text">
              <div className="about-section-header">
                <span className="about-section-label">Our Mission</span>
                <h2>Making Expert SAP Security Knowledge Accessible</h2>
              </div>
              <p>
                SAP systems underpin the financial, HR, procurement, and logistics operations of
                thousands of enterprises worldwide. Securing them correctly is complex — yet
                high-quality, practical guidance has historically been hard to find outside of
                expensive training courses or locked vendor documentation.
              </p>
              <p>
                SAP Security Expert was founded to change that. We partner with experienced SAP
                security architects, GRC consultants, and cloud specialists to produce content
                that a practitioner can open in the morning and apply in the afternoon. No generic
                advice, no padded word counts — just the knowledge that helps real projects succeed.
              </p>
              <p>
                We are independent. We do not accept sponsored content that compromises editorial
                integrity, and our contributors are selected for their hands-on expertise, not
                their follower count.
              </p>
            </div>

            <div className="about-mission-pillars">
              <div className="about-pillar-card">
                <div className="about-pillar-icon">
                  <i className="bi bi-pencil-square" />
                </div>
                <div>
                  <h3>Editorial Standards</h3>
                  <p>All articles are reviewed for technical accuracy before publication and updated when SAP releases significant changes.</p>
                </div>
              </div>
              <div className="about-pillar-card">
                <div className="about-pillar-icon">
                  <i className="bi bi-people-fill" />
                </div>
                <div>
                  <h3>Practitioner Authors</h3>
                  <p>Contributors are verified SAP security professionals with proven project experience, not generalist writers.</p>
                </div>
              </div>
              <div className="about-pillar-card">
                <div className="about-pillar-icon">
                  <i className="bi bi-arrow-repeat" />
                </div>
                <div>
                  <h3>Evergreen Content</h3>
                  <p>We maintain existing guides rather than letting them go stale — SAP release notes and security advisories are tracked continuously.</p>
                </div>
              </div>
              <div className="about-pillar-card">
                <div className="about-pillar-icon">
                  <i className="bi bi-globe2" />
                </div>
                <div>
                  <h3>Open Community</h3>
                  <p>Free to read, open to contribute. If you have real-world SAP security experience you want to share, we want to hear from you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What we cover ─────────────────────────────────────────────────── */}
      <section className="about-section bg-light">
        <div className="container">
          <div className="about-section-header">
            <span className="about-section-label">Coverage</span>
            <h2>What We Cover</h2>
            <p className="about-section-intro">
              We publish across the full breadth of SAP security — from foundational authorisation
              design through modern cloud-native identity governance.
            </p>
          </div>
          <div className="about-topics-grid">
            {TOPICS.map((t) => (
              <div className="about-topic-card" key={t.title}>
                <div className="about-topic-icon">
                  <i className={t.icon} />
                </div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────────────── */}
      <section className="about-section">
        <div className="container">
          <div className="about-section-header">
            <span className="about-section-label">Our Values</span>
            <h2>What We Stand For</h2>
          </div>
          <div className="about-values-grid">
            {VALUES.map((v) => (
              <div className="about-value-card" key={v.title}>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contributors / Team ───────────────────────────────────────────── */}
      <section className="about-section bg-light">
        <div className="container">
          <div className="about-section-header">
            <span className="about-section-label">Our Contributors</span>
            <h2>The Experts Behind the Content</h2>
            <p className="about-section-intro">
              Every article on SAP Security Expert is written by a verified practitioner. Our
              contributors are SAP security architects, GRC consultants, BTP specialists, and
              enterprise identity engineers working in the field today.
            </p>
          </div>

          {loadingTeam ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p>Loading contributors…</p>
            </div>
          ) : contributors.length > 0 ? (
            <div className="about-team-grid">
              {contributors.map((c) => {
                const initials = (c.name || 'S')
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();

                let expertise = c.expertise || {};
                if (typeof expertise === 'string') {
                  try { expertise = JSON.parse(expertise); } catch { expertise = {}; }
                }
                const tags = Object.entries(expertise)
                  .filter(([, v]) => v)
                  .map(([k]) => k.replace(/_/g, ' '))
                  .slice(0, 3);

                return (
                  <div className="about-team-card" key={c.id || c.username}>
                    {c.profile_photo ? (
                      <img
                        className="about-team-avatar"
                        src={c.profile_photo}
                        alt={c.name}
                        loading="lazy"
                        width={80}
                        height={80}
                      />
                    ) : (
                      <div className="about-team-avatar-placeholder">{initials}</div>
                    )}
                    <div className="about-team-name">{c.name}</div>
                    {c.designation && (
                      <div className="about-team-role">{c.designation}</div>
                    )}
                    {c.bio && (
                      <p className="about-team-bio">
                        {c.bio.length > 120 ? c.bio.substring(0, 117) + '…' : c.bio}
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className="about-team-expertise">
                        {tags.map((tag) => (
                          <span className="about-team-tag" key={tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                    <Link
                      to={`/contributor/${c.id || c.username}`}
                      className="about-team-link"
                    >
                      View profile →
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
              Meet our contributors on the{' '}
              <Link to="/become-a-contributor" style={{ color: '#1e40af' }}>
                contributor page
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* ── E-E-A-T statement ─────────────────────────────────────────────── */}
      <section className="about-section">
        <div className="container" style={{ maxWidth: '760px' }}>
          <div className="about-section-header">
            <span className="about-section-label">Editorial Process</span>
            <h2>How We Ensure Quality</h2>
          </div>
          <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.8, marginBottom: 20 }}>
            Before any article is published on SAP Security Expert, it goes through a two-stage
            review. First, a technical review by a subject-matter expert who validates that the
            steps, configuration examples, and security recommendations are accurate for the
            stated SAP version. Second, an editorial check for clarity, structure, and completeness.
          </p>
          <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.8, marginBottom: 20 }}>
            We date-stamp every article and mark it when it has been updated to reflect SAP note
            changes, new release functionality, or community-identified corrections. If you spot
            an inaccuracy, you can report it directly via our{' '}
            <Link to="/contact-us" style={{ color: '#1e40af' }}>contact page</Link> and we will
            investigate within 48 hours.
          </p>
          <p style={{ fontSize: '1.05rem', color: '#334155', lineHeight: 1.8 }}>
            SAP Security Expert has no affiliation with SAP SE. All product names, trademarks,
            and registered trademarks are property of their respective owners. Our content
            represents the independent views of our contributors based on their professional
            experience.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="about-section bg-light">
        <div className="container">
          <div className="about-cta-banner">
            <h2>Share Your SAP Security Expertise</h2>
            <p>
              Are you an SAP security practitioner with knowledge worth sharing? We are always
              looking for new contributors. Write for an audience of peers who will genuinely
              benefit from what you have learned.
            </p>
            <div className="about-cta-actions">
              <Link to="/become-a-contributor" className="about-cta-btn-primary">
                Become a Contributor
              </Link>
              <Link to="/contact-us" className="about-cta-btn-secondary">
                Get in Touch
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
