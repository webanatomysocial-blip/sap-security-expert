import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClientApp from '../../[[...slug]]/ClientApp';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

const LEARNING_MODULES = {
  'security-fundamentals': {
    num: 1,
    title: 'Security Fundamentals',
    subtitle: 'Module 01',
    desc: 'The ground floor of SAP Security. How SAP is structured, where security fits in, and the mental model you need before anything else makes sense.',
    color: '#3b82f6',
    categories: ['sap-security', 'sap-s4hana-security', 'sap-fiori-security', 'sap-cis'],
  },
  'user-management': {
    num: 2,
    title: 'User Management',
    subtitle: 'Module 02',
    desc: 'How SAP users actually work — creation, maintenance, lifecycle, and the transactions you\'ll use every day.',
    color: '#8b5cf6',
    categories: ['sap-security', 'sap-iag', 'sap-access-control'],
  },
  'role-management': {
    num: 3,
    title: 'Role Management',
    subtitle: 'Module 03',
    desc: 'The heart of SAP Security. Build, derive, and maintain the roles that drive every authorization decision.',
    color: '#f59e0b',
    categories: ['sap-security', 'sap-access-control', 'sap-grc'],
  },
  'authorization-concepts': {
    num: 4,
    title: 'Authorization Concepts',
    subtitle: 'Module 04',
    desc: 'The plumbing underneath roles — auth objects, fields, values, and the runtime check engine.',
    color: '#ef4444',
    categories: ['sap-access-control', 'sap-security', 'sap-btp-security'],
  },
  'audit-compliance': {
    num: 5,
    title: 'Audit & Compliance',
    subtitle: 'Module 05',
    desc: 'Tracking who did what, and proving it for auditors. Logs, reports, and the SoD conversation.',
    color: '#10b981',
    categories: ['sap-grc', 'sap-process-control', 'sap-cybersecurity'],
  },
  'grc-advanced': {
    num: 6,
    title: 'GRC & Advanced Topics',
    subtitle: 'Module 06',
    desc: 'Beyond the basics: GRC Access Control, IAG, and the enterprise governance layer.',
    color: '#e84a3d',
    categories: ['sap-grc', 'sap-iag', 'sap-process-control', 'sap-access-control'],
  },
};

const SEO_META = {
  'security-fundamentals': {
    title: 'SAP Security Fundamentals | SAP Security Learning Hub',
    description: 'Start learning SAP Security. Discover foundational concepts, architecture, and threat vectors in SAP environments.',
  },
  'user-management': {
    title: 'SAP User Management & SU01 | SAP Security Learning Hub',
    description: 'Master SAP user administration: SU01 user maintenance, user types, security parameters, and validity periods.',
  },
  'role-management': {
    title: 'SAP Role Design & PFCG | SAP Security Learning Hub',
    description: 'Learn SAP PFCG role maintenance: single roles, composite roles, derived roles, and role transport strategies.',
  },
  'authorization-concepts': {
    title: 'SAP Authorization Concepts & Fields | SAP Security Learning Hub',
    description: 'Understand SAP authorization objects, fields, profiles, and user buffers for granular access control.',
  },
  'audit-compliance': {
    title: 'SAP Security Audit & Compliance Checklist | SAP Security Learning Hub',
    description: 'Prepare for SAP audits. Learn Security Audit Log (SAL), system profiling, and vulnerability scans.',
  },
  'grc-advanced': {
    title: 'SAP GRC & Advanced Topics | SAP Security Learning Hub',
    description: 'Explore advanced SAP security topics: Access Control, Process Control, IAG, BTP Cloud security, and identity integration.',
  },
};

async function fetchLearnings(moduleSlug) {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/learnings?category=${encodeURIComponent(moduleSlug)}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function generateMetadata({ params }) {
  const { module: moduleSlug } = await params;
  const meta = SEO_META[moduleSlug];
  if (!meta) return { title: 'SAP Security Learning Hub | SAP Security Expert', robots: { index: false } };

  const canonical = `${SITE_URL}/learning/${moduleSlug}`;
  return {
    title: meta.title,
    description: meta.description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: canonical,
      siteName: 'SAP Security Expert',
      images: [{ url: `${SITE_URL}/assets/sapsecurityexpert-black.png` }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [`${SITE_URL}/assets/sapsecurityexpert-black.png`],
    },
  };
}

export default async function LearningModuleSsrPage({ params }) {
  const { module: moduleSlug } = await params;
  const mod = LEARNING_MODULES[moduleSlug];

  // Unknown module slug — return proper 404
  if (!mod) notFound();

  const articles = await fetchLearnings(moduleSlug);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Learning Hub', item: `${SITE_URL}/learning-hub` },
      { '@type': 'ListItem', position: 3, name: mod.title, item: `${SITE_URL}/learning/${moduleSlug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c').replace(/>/g, '\\u003e') }}
      />

      <div id="ssr-blog-content" suppressHydrationWarning>
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>

          <nav style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
            <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Home</Link>
            {' › '}
            <Link href="/learning-hub" style={{ color: '#3b82f6', textDecoration: 'none' }}>Learning Hub</Link>
            {' › '}
            <span>{mod.title}</span>
          </nav>

          <header style={{ padding: '20px 0 30px', borderBottom: `3px solid ${mod.color}`, marginBottom: '32px' }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: mod.color, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>
              {mod.subtitle} · SAP Security Learning Hub
            </p>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
              {mod.title}
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '680px', margin: 0, lineHeight: 1.6 }}>
              {mod.desc}
            </p>
          </header>

          {articles.length > 0 ? (
            <main>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
                Lessons in this module
              </h2>
              {articles.map((article, i) => (
                <div
                  key={article.id || article.slug || i}
                  style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}
                >
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
                    <Link
                      href={`/learning/${moduleSlug}/${article.slug}`}
                      style={{ color: '#1e293b', textDecoration: 'none' }}
                    >
                      {article.title}
                    </Link>
                  </h3>
                  {(article.excerpt || article.meta_description) && (
                    <p style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {(article.excerpt || article.meta_description || '').substring(0, 160)}
                    </p>
                  )}
                  <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                    {article.author_name || 'SAP Security Expert'}
                    {article.date || article.published_at ? ` · ${formatDate(article.date || article.published_at)}` : ''}
                  </span>
                </div>
              ))}
            </main>
          ) : (
            <main>
              <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.7 }}>
                {mod.title} covers essential SAP Security topics including {mod.categories.join(', ')} — expert tutorials, step-by-step guides, and best practices for SAP Security, GRC, and BTP professionals.
              </p>
              <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.7 }}>
                <Link href="/learning-hub" style={{ color: '#3b82f6' }}>Browse the full Learning Hub</Link> to explore all available modules and lessons.
              </p>
            </main>
          )}
        </div>
      </div>

      <ClientApp />
    </>
  );
}
