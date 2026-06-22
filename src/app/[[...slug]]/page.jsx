import Link from 'next/link';
import ClientApp from './ClientApp';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

// Skip SSR meta for admin/member routes — no public SEO value
const SKIP_SEO = new Set(['admin', 'member']);

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
};

export async function generateMetadata({ params }) {
  const slug = (await params)?.slug || [];
  if (SKIP_SEO.has(slug[0])) return { title: 'SAP Security Expert' };

  const path = slug.length ? '/' + slug.join('/') : '/';

  try {
    const res = await fetch(
      `${INTERNAL_API}/api/seo-meta?path=${encodeURIComponent(path)}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const d = await res.json();
      return buildMeta(d);
    }
  } catch (_) {}

  return defaultMeta(path);
}

export default async function CatchAll({ params }) {
  const slug = (await params)?.slug || [];
  const isHomepage = slug.length === 0;

  if (!isHomepage) {
    return <ClientApp />;
  }

  // Homepage: fetch recent articles for SSR
  let recentArticles = [];
  try {
    const res = await fetch(`${INTERNAL_API}/api/posts`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const posts = Array.isArray(data) ? data : (data.posts || data.blogs || []);
      recentArticles = posts.slice(0, 10);
    }
  } catch (_) {}

  return (
    <>
      <div id="ssr-blog-content" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          <header style={{ textAlign: 'center', padding: '40px 0 30px' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
              SAP Security, GRC &amp; Cybersecurity Community
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '680px', margin: '0 auto' }}>
              Expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.
            </p>
          </header>

          {recentArticles.length > 0 && (
            <main style={{ marginTop: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
                Latest Security Guides &amp; Tutorials
              </h2>
              {recentArticles.map((article) => (
                <div
                  key={article.id || article.slug}
                  style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #e2e8f0' }}
                >
                  <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', fontWeight: 700 }}>
                    <Link
                      href={`/${article.category}/${article.slug}`}
                      style={{ color: '#1e293b', textDecoration: 'none' }}
                    >
                      {article.title}
                    </Link>
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 6px' }}>
                    <Link
                      href={`/${article.category}`}
                      style={{ color: '#3b82f6', textDecoration: 'none' }}
                    >
                      {CATEGORY_LABELS[article.category] || article.category}
                    </Link>
                    {' · '}
                    {article.author_name || article.author || 'SAP Security Expert'}
                    {article.date ? ` · ${new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                  </p>
                  {(article.excerpt || article.meta_description) && (
                    <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {(article.excerpt || article.meta_description || '').substring(0, 160)}
                    </p>
                  )}
                </div>
              ))}
            </main>
          )}
        </div>
      </div>

      {/* Full interactive SPA — AppWrapper removes #ssr-blog-content on mount */}
      <ClientApp />
    </>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function buildMeta(d) {
  return {
    title: d.title,
    description: d.description,
    alternates: { canonical: d.url },
    openGraph: {
      title: d.title,
      description: d.description,
      url: d.url,
      siteName: 'SAP Security Expert',
      ...(d.image ? { images: [{ url: d.image }] } : {}),
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: d.title,
      description: d.description,
      ...(d.image ? { images: [d.image] } : {}),
    },
  };
}

function defaultMeta(path) {
  const url = `${SITE_URL}${path}`;
  return {
    title: 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert',
    description: 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.',
    alternates: { canonical: url },
    openGraph: { title: 'SAP Security Expert', url, siteName: 'SAP Security Expert', type: 'website' },
  };
}
