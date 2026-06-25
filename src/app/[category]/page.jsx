import Link from 'next/link';
import ClientApp from '../[[...slug]]/ClientApp';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://dev.sapsecurityexpert.com').replace(/\/$/, '');

const SKIP_CATEGORIES = new Set(['admin', 'member', 'api', 'uploads', 'assets', '_next']);

const CATEGORY_LABELS = {
  'sap-security': 'SAP Security',
  'sap-s4hana-security': 'SAP S/4HANA Security',
  'sap-fiori-security': 'SAP Fiori Security',
  'sap-btp-security': 'SAP BTP Security',
  'sap-public-cloud': 'SAP Public Cloud',
  'sap-sac-security': 'SAP Analytics Cloud Security',
  'sap-cis': 'SAP CIS',
  'sap-successfactors-security': 'SuccessFactors Security',
  'sap-security-other': 'SAP Security',
  'sap-access-control': 'SAP Access Control',
  'sap-process-control': 'SAP Process Control',
  'sap-iag': 'SAP IAG',
  'sap-grc': 'SAP GRC',
  'sap-cybersecurity': 'Cybersecurity',
  'product-reviews': 'Product Reviews',
  'podcasts': 'Expert Voices & Podcasts',
  'videos': 'Videos',
  'expert-recommendations': 'Expert Recommendations',
  // Learning Hub module categories
  'security-fundamentals': 'Security Fundamentals',
  'user-management': 'User Management',
  'role-management': 'Role Management',
  'authorization-concepts': 'Authorization Concepts',
  'audit-compliance': 'Audit & Compliance',
  'grc-advanced': 'GRC & Advanced Topics',
};

const CATEGORY_INTROS = {
  'sap-security': 'SAP Security is the foundation of enterprise trust, ensuring only authorised users can execute specific business activities. This pillar covers role design (PFCG), authorization objects, Segregation of Duties, system auditing, and secure configuration of RFC and gateway destinations. Whether you are new to SAP authorizations or an experienced security architect, you will find practical guides, checklists, and step-by-step walkthroughs to harden your SAP environment.',
  'sap-grc': 'SAP GRC is the industry-standard suite for managing business risks, ensuring regulatory compliance, and automating control monitoring across SAP landscapes. This hub covers Access Risk Analysis (ARA) ruleset optimization, Access Request Management (ARM) workflows, Emergency Access Management (EAM) firefighter logs, and Business Role Management (BRM). Explore end-to-end guides for transforming GRC from a compliance checkbox into an active cybersecurity asset.',
  'sap-btp-security': 'SAP Business Technology Platform (BTP) is the integration and extension core of modern SAP architectures. Securing BTP demands deep knowledge of Cloud Identity Services (IAS/IPS), Role Collections, API security, and security monitoring. This pillar guides you from initial tenant hardening through advanced extension app isolation and continuous compliance on the cloud.',
  'sap-public-cloud': 'SAP S/4HANA Cloud Public Edition shifts infrastructure responsibility to SAP while customers secure user access, integrations, and configurations. This hub covers IAM with IAS/IPS, business catalog permissions, communication arrangements, and audit strategies specific to the public cloud model.',
  'sap-cybersecurity': 'Modern SAP landscapes face sophisticated, targeted attacks. This pillar covers infrastructure hardening, secure network protocols, vulnerability management, ABAP code security, and SIEM/SOAR integration. From penetration testing guides to patch management frameworks, find everything needed to run a proactive SAP cybersecurity programme.',
  'sap-iag': 'SAP Identity Access Governance (IAG) is a cloud-native SaaS solution for governing identities across hybrid environments. This hub covers intelligent access analysis, SoD checks, automated provisioning, and machine-learning-powered risk analysis — both as a GRC complement and as a standalone cloud governance platform.',
  'sap-s4hana-security': 'SAP S/4HANA introduces HANA database security, Fiori UX authorizations, and a modern role design model. This pillar covers HANA user permission design, business catalog and spaces mapping, role migration from ECC, and securing S/4HANA in private and public cloud deployments.',
  'sap-fiori-security': 'SAP Fiori is the web-based UX gateway to SAP applications. Securing it requires tight alignment between launchpad catalogs, OData service authorizations, and back-end role design. This hub covers catalog and spaces design, Web Dispatcher security, SSO configuration, and UI5 app hardening.',
  'sap-access-control': 'SAP GRC Access Control prevents, detects, and mitigates authorization risks across enterprise landscapes. This hub provides practical tutorials on ARA ruleset maintenance, ARM workflow design, EAM firefighter monitoring, and BRM role governance — from initial setup to continuous compliance operations.',
  'sap-process-control': 'SAP GRC Process Control automates internal control design, testing, and continuous monitoring. This hub covers CCM script configuration, manual control assessments, risk frameworks, and audit-readiness strategies to reduce manual compliance effort.',
  'sap-sac-security': 'SAP Analytics Cloud (SAC) holds sensitive financial and operational data. This pillar covers folder-level permission architecture, row-level security, SSO via SAML 2.0, team and role governance, and secure live data connections to HANA, BW, and S/4HANA.',
  'sap-successfactors-security': 'SAP SuccessFactors contains confidential HR and compensation data. This hub covers Role-Based Permissions (RBP) design, target population rules, SSO via IAS/IPS, and GDPR-compliant data privacy configurations for global workforce management.',
  'sap-cis': 'SAP CIS covers infrastructure-level hardening: HANA and OS security, CIS benchmarks, network layer controls, Security Audit Log configuration, and regular patch management. A strong CIS foundation prevents system-level breaches that role-based controls alone cannot stop.',
  'sap-security-other': 'SAP Security covers a vast landscape of core systems, integration touchpoints, and custom developments. This pillar explores ABAP secure coding standards, interface security (RFC/ALE/IDoc), legacy application hardening, and custom authorization object design for advanced practitioners.',
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchCategoryArticles(category) {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/posts?category=${encodeURIComponent(category)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.posts || data.blogs || []);
  } catch {
    return [];
  }
}

async function fetchSeoMeta(path) {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/seo-meta?path=${encodeURIComponent(path)}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) return res.json();
  } catch {}
  return null;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { category } = await params;
  if (SKIP_CATEGORIES.has(category)) return { title: 'SAP Security Expert' };

  const path = `/${category}`;
  const d = await fetchSeoMeta(path);
  if (!d) return { title: 'SAP Security Expert' };

  return {
    title: d.title,
    description: d.description,
    alternates: { canonical: d.url || `${SITE_URL}${path}` },
    openGraph: {
      title: d.title,
      description: d.description,
      url: d.url || `${SITE_URL}${path}`,
      siteName: 'SAP Security Expert',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: d.title,
      description: d.description,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Page (Server Component) ───────────────────────────────────────────────────

export default async function CategoryPage({ params }) {
  const { category } = await params;

  if (SKIP_CATEGORIES.has(category)) {
    return <ClientApp />;
  }

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const intro = CATEGORY_INTROS[category] || null;
  const articles = await fetchCategoryArticles(category);

  const otherCategories = Object.entries(CATEGORY_LABELS).filter(([key]) => key !== category);

  return (
    <>
      <div id="ssr-blog-content">
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
            <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Home</Link>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&rsaquo;</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>{categoryLabel}</span>
          </nav>

          {/* H1 */}
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 20px' }}>
            {categoryLabel}
          </h1>

          {/* Intro */}
          {intro && (
            <p style={{ fontSize: '1.05rem', lineHeight: 1.75, color: '#334155', marginBottom: '40px', paddingBottom: '30px', borderBottom: '2px solid #f1f5f9' }}>
              {intro}
            </p>
          )}

          {/* Article grid */}
          <section>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
              Articles in {categoryLabel}
            </h2>

            {articles.length > 0 ? articles.map((article) => (
              <div
                key={article.id || article.slug}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                }}
              >
                <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>
                  <Link
                    href={`/${article.category}/${article.slug}`}
                    style={{ color: '#1e293b', textDecoration: 'none' }}
                  >
                    {article.title}
                  </Link>
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 10px' }}>
                  {article.author_name || article.author || 'SAP Security Expert'}
                  {article.date ? ` · ${formatDate(article.date)}` : ''}
                </p>
                {(article.excerpt || article.meta_description) && (
                  <p style={{ margin: '0 0 12px', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {(article.excerpt || article.meta_description || '').substring(0, 160)}
                  </p>
                )}
                <Link
                  href={`/${article.category}/${article.slug}`}
                  style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.92rem', textDecoration: 'none' }}
                >
                  Read article &rarr;
                </Link>
              </div>
            )) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                New articles are scheduled for this category. Check back soon!
              </p>
            )}
          </section>

          {/* Footer links — browse all categories */}
          <footer style={{ marginTop: '50px', paddingTop: '30px', borderTop: '2px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
              Browse all categories
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {otherCategories.map(([key, label]) => (
                <Link
                  key={key}
                  href={`/${key}`}
                  style={{
                    display: 'inline-block',
                    background: '#f1f5f9',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    textDecoration: 'none',
                    color: '#334155',
                    fontWeight: 500,
                    fontSize: '0.88rem',
                  }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </footer>

        </div>
      </div>

      {/* Full interactive SPA — AppWrapper removes #ssr-blog-content on mount */}
      <ClientApp />
    </>
  );
}
