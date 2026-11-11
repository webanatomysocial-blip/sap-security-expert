import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClientApp from '../[[...slug]]/ClientApp';

// These pages obtain public content from the local API. Serve current SSR
// content and metadata rather than retaining a stale full-route response.
export const dynamic = 'force-dynamic';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sapsecurityexpert.com').replace(/^http:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/))/, 'https://').replace(/\/$/, '');

const SKIP_CATEGORIES = new Set(['admin', 'member', 'api', 'uploads', 'assets', '_next', 'experts', 'contributor', 'ambassador', 'become-a-country-ambassador', 'apply-ambassador', 'apply-contributor', 'forgot-password', 'reset-password']);

// Public pages rendered by the client app (src/App.jsx). Without this list they fell
// through to notFound() and were served with an HTTP 404 status even though the page
// displayed, which stops search engines indexing them.
const SPA_PAGES = new Set([
  'accessibility-statement', 'ambassadors', 'announcements', 'blog', 'blogs', 'community', 'downloads',
  'leaderboard', 'learning-hub', 'learnings', 'membership', 'news', 'paid-articles', 'privacy-policy',
  'responsible-ai-automation-statement', 'safety-movement', 'sap-security-fundamentals',
  'security-compliance-overview', 'sitemap', 'terms-conditions', 'expert-papers', 'sap-licensing',
]);

// These routes are interactive client pages. Keep a concise, meaningful
// server-rendered introduction so crawlers and LLMs receive an H1 and context
// before JavaScript starts.
const SPA_PAGE_SUMMARIES = {
  'expert-papers': {
    title: 'Expert Papers',
    description: 'Explore expert SAP Security papers, practical research, and implementation guidance from SAP Security Expert.',
  },
  downloads: {
    title: 'Downloads',
    description: 'Browse SAP Security Expert downloads, templates, guides, and practical resources for SAP security professionals.',
  },
  'learning-hub': {
    title: 'SAP Security Learning Hub',
    description: 'Build practical SAP security knowledge with structured learning modules, guides, and expert-led resources.',
  },
};

const CATEGORY_LABELS = {
  'sap-security': 'SAP Security',
  'sap-s4hana-security': 'SAP S/4HANA Security',
  'sap-fiori-security': 'SAP Fiori Security',
  'sap-btp-security': 'SAP BTP Security',
  'sap-public-cloud': 'SAP Public Cloud',
  'sap-sac-security': 'SAP Analytics Cloud Security',
  'sap-cis': 'SAP Cloud Identity Services',
  'sap-successfactors-security': 'SuccessFactors Security',
  'sap-security-other': 'Advanced SAP Security',
  'sap-access-control': 'SAP Access Control',
  'sap-process-control': 'SAP Process Control',
  'sap-iag': 'SAP IAG',
  'sap-grc': 'SAP GRC',
  'sap-cybersecurity': 'Cybersecurity',
  'product-reviews': 'Product Reviews',
  'podcasts': 'Expert Voices & Podcasts',
  'videos': 'Videos',
  'expert-recommendations': 'Expert Articles',
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
  'sap-iag': 'SAP Identity Access Governance (IAG) is a cloud-native SaaS solution for governing identities across hybrid environments. This hub covers intelligent access analysis, SoD checks, automated provisioning, and machine-learning-powered risk analysis, both as a GRC complement and as a standalone cloud governance platform.',
  'sap-s4hana-security': 'SAP S/4HANA introduces HANA database security, Fiori UX authorizations, and a modern role design model. This pillar covers HANA user permission design, business catalog and spaces mapping, role migration from ECC, and securing S/4HANA in private and public cloud deployments.',
  'sap-fiori-security': 'SAP Fiori is the web-based UX gateway to SAP applications. Securing it requires tight alignment between launchpad catalogs, OData service authorizations, and back-end role design. This hub covers catalog and spaces design, Web Dispatcher security, SSO configuration, and UI5 app hardening.',
  'sap-access-control': 'SAP GRC Access Control prevents, detects, and mitigates authorization risks across enterprise landscapes. This hub provides practical tutorials on ARA ruleset maintenance, ARM workflow design, EAM firefighter monitoring, and BRM role governance, from initial setup to continuous compliance operations.',
  'sap-process-control': 'SAP GRC Process Control automates internal control design, testing, and continuous monitoring. This hub covers CCM script configuration, manual control assessments, risk frameworks, and audit-readiness strategies to reduce manual compliance effort.',
  'sap-sac-security': 'SAP Analytics Cloud (SAC) holds sensitive financial and operational data. This pillar covers folder-level permission architecture, row-level security, SSO via SAML 2.0, team and role governance, and secure live data connections to HANA, BW, and S/4HANA.',
  'sap-successfactors-security': 'SAP SuccessFactors contains confidential HR and compensation data. This hub covers Role-Based Permissions (RBP) design, target population rules, SSO via IAS/IPS, and GDPR-compliant data privacy configurations for global workforce management.',
  'sap-cis': 'SAP Cloud Identity Services (IAS/IPS) acts as the central identity provider and provisioning engine for SAP cloud architectures. This hub covers Identity Authentication Services (IAS), Identity Provisioning Services (IPS), Single Sign-On (SSO) configurations, and user life cycle management across hybrid SAP environments.',
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

// Anonymous server-side listing: no cookies are forwarded, so the API applies
// the same publication and paywall rules a logged-out visitor gets. The
// internal SSR-bypass header is never sent here.
async function fetchPublicListing({ category, limit, offset = 0 }) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (offset > 0) q.set('offset', String(offset));
  if (category) q.set('category', category);
  try {
    const res = await fetch(`${INTERNAL_API}/api/posts?${q.toString()}`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.posts || data.blogs || []);
  } catch {
    return [];
  }
}

// Public learning feed and per-module counts. Same anonymous rules as the posts list.
async function fetchPublicJson(pathWithQuery) {
  try {
    const res = await fetch(`${INTERNAL_API}${pathWithQuery}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
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

const DEFAULT_IMAGE = `${SITE_URL}/assets/sapsecurityexpert-black.png`;

export async function generateMetadata({ params, searchParams }) {
  const { category } = await params;
  const pageNo = pageFrom(await searchParams);
  if (SKIP_CATEGORIES.has(category)) return { title: 'SAP Security Expert', robots: { index: false, follow: false } };

  const path = `/${category}`;
  const d = await fetchSeoMeta(path);

  const title = d?.title || `${CATEGORY_LABELS[category] || 'SAP Security Expert'} | SAP Security Expert`;
  const description = d?.description || 'Expert SAP Security, GRC, and BTP guides, tutorials, and best practices.';
  // Each page of a listing points its canonical at itself.
  const canonical = pageNo > 1 ? `${SITE_URL}${path}?page=${pageNo}` : (d?.url || `${SITE_URL}${path}`);
  const image = d?.image || DEFAULT_IMAGE;

  return {
    title,
    description,
    ...(d?.keywords ? { keywords: d.keywords } : {}),
    robots: {
      index: true,
      follow: true,
    },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'SAP Security Expert',
      images: [{ url: image }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Server-rendered first page of a listing. AppWrapper removes #ssr-blog-content
// on mount, after which the interactive client list takes over.
function plainExcerpt(b) {
  const raw = (b.excerpt || b.meta_description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return raw.length > 160 ? raw.slice(0, 157).trimEnd() + '...' : raw;
}

const PAGE_SIZE = 12;
function pageFrom(sp) { const n = parseInt(sp?.page, 10); return Number.isInteger(n) && n > 0 && n < 10000 ? n : 1; }
// Plain links with real URLs, so crawlers can reach every page of a listing.
function PageNav({ base, page, hasNext }) {
  if (page === 1 && !hasNext) return null;
  const link = (p) => (p === 1 ? base : `${base}?page=${p}`);
  return (
    <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '32px 0 0', fontSize: '0.95rem' }}>
      {page > 1 ? <a rel="prev" href={link(page - 1)} style={{ color: '#0f172a' }}>← Previous</a> : <span />}
      <span style={{ color: '#64748b' }}>Page {page}</span>
      {hasNext ? <a rel="next" href={link(page + 1)} style={{ color: '#0f172a' }}>Next →</a> : <span />}
    </nav>
  );
}

function ListingFallback({ title, intro, items, pagination }) {
  return (
    <article id="ssr-blog-content" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>{title}</h1>
      <p style={{ fontSize: '1.1rem', color: '#334155', lineHeight: 1.7, margin: '0 0 32px' }}>{intro}</p>
      {items.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((b) => (
            <li key={b.slug} style={{ margin: '0 0 28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 }}>
                <a href={`/${b.category}/${b.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>{b.title}</a>
              </h2>
              {plainExcerpt(b) && <p style={{ margin: '0 0 8px', color: '#475569', lineHeight: 1.6 }}>{plainExcerpt(b)}</p>}
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                {formatDate(b.date || b.created_at)}{b.author_name ? ` · ${b.author_name}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
      {pagination && <PageNav {...pagination} />}
    </article>
  );
}

const LEARNING_MODULE_KEYS = ['security-fundamentals', 'user-management', 'role-management', 'authorization-concepts', 'audit-compliance', 'grc-advanced'];

function LearningHubFallback({ title, intro, counts, items, pagination }) {
  const modules = LEARNING_MODULE_KEYS.map((k) => ({ slug: k, label: CATEGORY_LABELS[k] || k, count: Number(counts?.[k] || 0) }));
  return (
    <article id="ssr-blog-content" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>{title}</h1>
      <p style={{ fontSize: '1.1rem', color: '#334155', lineHeight: 1.7, margin: '0 0 32px' }}>{intro}</p>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px' }}>Learning modules</h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px' }}>
        {modules.map((m) => (
          <li key={m.slug} style={{ margin: '0 0 10px' }}>
            {/* Same rule as the client (LearningHub.jsx): a module is browsable only
                when it has published articles; otherwise it is "Coming soon". */}
            {m.count > 0 ? (
              <>
                <a href={`/learning/${m.slug}`} style={{ color: '#0f172a', fontWeight: 600 }}>{m.label}</a>
                <span style={{ color: '#64748b' }}> · Available · {m.count} article{m.count !== 1 ? 's' : ''}</span>
              </>
            ) : (
              <>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{m.label}</span>
                <span style={{ color: '#64748b' }}> · Coming soon</span>
              </>
            )}
          </li>
        ))}
      </ul>
      {items.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px' }}>Latest learning articles</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((b) => (
              <li key={b.slug} style={{ margin: '0 0 24px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>
                  <a href={`/learning/${b.category}/${b.slug}`} style={{ color: '#0f172a', textDecoration: 'none' }}>{b.title}</a>
                </h3>
                {plainExcerpt(b) && <p style={{ margin: '0 0 6px', color: '#475569', lineHeight: 1.6 }}>{plainExcerpt(b)}</p>}
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{formatDate(b.date || b.created_at)}{b.author ? ` · ${b.author}` : ''}</p>
              </li>
            ))}
          </ul>
        </>
      )}
      {pagination && <PageNav {...pagination} />}
    </article>
  );
}

// ── Page (Server Component) ───────────────────────────────────────────────────

export default async function CategoryPage({ params, searchParams }) {
  const page = pageFrom(await searchParams);
  const { category } = await params;

  if (category === 'about') {
    return (
      <>
        <div id="ssr-blog-content">
          <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>About SAP Security Expert</h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.7 }}>
              SAP Security Expert is the leading practitioner community for SAP Security, GRC, BTP, and Identity professionals.
              We publish in-depth tutorials, step-by-step implementation guides, and best-practice frameworks.
            </p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '20px 0 10px' }}>Our Values</h2>
            <ul>
              <li><strong>Practitioner-First:</strong> Every article is written by professionals actively working in the field.</li>
              <li><strong>Accuracy Over Volume:</strong> We hold contributors to rigorous technical review standards.</li>
              <li><strong>Open Knowledge Sharing:</strong> We believe the entire community benefits when professionals share their expertise.</li>
            </ul>
          </div>
        </div>
        <ClientApp />
      </>
    );
  }

  if (category === 'contact-us') {
    return (
      <>
        <div id="ssr-blog-content">
          <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Contact SAP Security Expert</h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.7 }}>
              Have questions, feedback, or interest in collaborating? We'd love to hear from you.
            </p>
            <p style={{ fontSize: '1rem', color: '#1e293b' }}>Email us at: <strong>info@sapsecurityexpert.com</strong></p>
          </div>
        </div>
        <ClientApp />
      </>
    );
  }

  if (category === 'become-a-contributor') {
    return (
      <>
        <div id="ssr-blog-content">
          <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>Become a Contributor</h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.7 }}>
              Share your SAP GRC, Cybersecurity, or Cloud Security expertise. Join our contributor programme
              and publish guides, tutorials, and best practices to the SAP security community.
            </p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '20px 0 10px' }}>Why Contribute?</h2>
            <ul>
              <li>Build your professional brand.</li>
              <li>Share knowledge with a global audience of SAP professionals.</li>
              <li>Get recognized by peers.</li>
            </ul>
          </div>
        </div>
        <ClientApp />
      </>
    );
  }

  if (SKIP_CATEGORIES.has(category)) {
    return <ClientApp />;
  }

  if (category === 'blogs') {
    const rows = await fetchPublicListing({ limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
    const hasNext = rows.length > PAGE_SIZE;
    const items = rows.filter((b) => !b.status || ['approved', 'published'].includes(b.status)).slice(0, PAGE_SIZE);
    return (
      <>
        <ListingFallback
          title="All Blogs & Articles"
          intro="Browse all SAP Security, GRC, BTP, and cybersecurity articles written by practitioners. Filter by category, search by topic, and find the expert knowledge you need."
          items={items}
          pagination={{ base: '/blogs', page, hasNext }}
        />
        <ClientApp />
      </>
    );
  }

  if (category === 'downloads') {
    const rows = await fetchPublicListing({ category: 'downloads', limit: 12 });
    const items = rows.filter((b) => !b.status || ['approved', 'published'].includes(b.status)).slice(0, 12);
    const summary = SPA_PAGE_SUMMARIES.downloads;
    return (
      <>
        <ListingFallback title={summary.title.toUpperCase()} intro={summary.description} items={items} />
        <ClientApp />
      </>
    );
  }

  if (category === 'learning-hub') {
    const [items, counts] = await Promise.all([
      fetchPublicJson(`/api/learnings?limit=${PAGE_SIZE + 1}&offset=${(page - 1) * PAGE_SIZE}`),
      fetchPublicJson('/api/learnings/counts'),
    ]);
    const all = Array.isArray(items) ? items : [];
    const hasNext = all.length > PAGE_SIZE;
    const latest = all.slice(0, PAGE_SIZE);
    const summary = SPA_PAGE_SUMMARIES['learning-hub'];
    return (
      <>
        <LearningHubFallback title="Learn SAP Security. The way practitioners do." intro={summary.description} counts={counts || {}} items={latest} pagination={{ base: '/learning-hub', page, hasNext }} />
        <ClientApp />
      </>
    );
  }

  if (category === 'expert-papers') {
    const rows = await fetchPublicListing({ category: 'expert-papers', limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE });
    const hasNext = rows.length > PAGE_SIZE;
    const items = rows.filter((b) => !b.status || ['approved', 'published'].includes(b.status)).slice(0, PAGE_SIZE);
    const summary = SPA_PAGE_SUMMARIES['expert-papers'];
    return (
      <>
        <ListingFallback title={summary.title} intro={summary.description} items={items} pagination={{ base: '/expert-papers', page, hasNext }} />
        <ClientApp />
      </>
    );
  }

  if (SPA_PAGES.has(category) && !CATEGORY_LABELS[category]) {
    const summary = SPA_PAGE_SUMMARIES[category];
    if (summary) {
      return (
        <>
          <article id="ssr-blog-content" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>{summary.title}</h1>
            <p style={{ fontSize: '1.1rem', color: '#334155', lineHeight: 1.7, margin: 0 }}>{summary.description}</p>
          </article>
          <ClientApp />
        </>
      );
    }
    return <ClientApp />;
  }

  if (!CATEGORY_LABELS[category]) {
    notFound();
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
