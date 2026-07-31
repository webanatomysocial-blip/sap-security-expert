import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClientApp from './ClientApp';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');
const SSR_SECRET = process.env.REVALIDATE_SECRET || '';

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
  'sap-licensing': 'SAP Licensing',
  'news': 'News & Updates',
};

export async function generateMetadata({ params }) {
  const slug = (await params)?.slug || [];
  if (SKIP_SEO.has(slug[0])) return { title: 'SAP Security Expert', robots: { index: false, follow: false } };

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
  const firstSegment = slug[0] || '';
  const isCategory = Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, firstSegment) && slug.length === 1;

  // Admin/member routes: no SSR content needed
  if (SKIP_SEO.has(firstSegment)) {
    return <ClientApp />;
  }

  // Non-homepage, non-category pages: fetch data and inject descriptive block
  if (!isHomepage && !isCategory) {
    let article = null;
    let is404 = false;
    if (slug.length >= 2) {
      const detailSlug = slug[slug.length - 1];
      const fetchUrl = (firstSegment === 'news')
        ? `${INTERNAL_API}/api/news/${encodeURIComponent(detailSlug)}`
        : `${INTERNAL_API}/api/posts/${encodeURIComponent(detailSlug)}`;
      try {
        const res = await fetch(fetchUrl, {
          next: { revalidate: 3600 },
          headers: SSR_SECRET ? { 'X-SSR-Internal': SSR_SECRET } : {},
        });
        if (res.status === 404) {
          is404 = true;
        } else if (res.ok) {
          const rawArticle = await res.json();
          if (rawArticle) {
            if (Array.isArray(rawArticle)) {
              article = rawArticle[0];
            } else if (rawArticle.data) {
              article = Array.isArray(rawArticle.data) ? rawArticle.data[0] : rawArticle.data;
            } else {
              article = rawArticle;
            }
          }
        }
      } catch (_) {}
    }

    if ((is404 || !article?.id) && (CATEGORY_LABELS[firstSegment] || firstSegment === 'news' || firstSegment === 'downloads')) {
      notFound();
    }

    return (
      <>
        <div id="ssr-blog-content" suppressHydrationWarning>
          {article ? (
            <article style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
              <header style={{ padding: '40px 0 30px' }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
                  {article.title}
                </h1>
                <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '680px', margin: '0 auto' }}>
                  {article.meta_description || article.excerpt || ''}
                </p>
                <div style={{ color: '#64748b', fontSize: '0.88rem', marginTop: '12px' }}>
                  {article.author_name || 'SAP Security Expert'}
                  {article.date || article.published_at || article.created_at ? ` · ${new Date(article.date || article.published_at || article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                </div>
              </header>
              <div dangerouslySetInnerHTML={{ __html: article.content || '' }} />
            </article>
          ) : (
            <p>SAP Security Expert — expert knowledge for SAP Security, GRC, and BTP professionals.</p>
          )}
        </div>
        <ClientApp />
      </>
    );
  }

  // Homepage or category page: fetch articles for SSR
  let recentArticles = [];
  try {
    const apiUrl = isCategory
      ? `${INTERNAL_API}/api/posts?category=${encodeURIComponent(firstSegment)}&limit=20`
      : `${INTERNAL_API}/api/posts`;
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const posts = Array.isArray(data) ? data : (data.posts || data.blogs || []);
      recentArticles = posts.slice(0, isCategory ? 20 : 10);
    }
  } catch (_) {}

  const pageTitle = isCategory
    ? `${CATEGORY_LABELS[firstSegment]} — Articles & Guides`
    : 'SAP Security, GRC & Cybersecurity Community';
  const pageSubtitle = isCategory
    ? `Expert articles, tutorials, and best practices for ${CATEGORY_LABELS[firstSegment]}.`
    : 'Expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.';
  const listHeading = isCategory
    ? `${CATEGORY_LABELS[firstSegment]} Articles`
    : 'Latest Security Guides & Tutorials';

  return (
    <>
      <div id="ssr-blog-content" suppressHydrationWarning>
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          <header style={{ textAlign: 'center', padding: '40px 0 30px' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>
              {pageTitle}
            </h1>
            <p style={{ fontSize: '1.1rem', color: '#475569', maxWidth: '680px', margin: '0 auto' }}>
              {pageSubtitle}
            </p>
          </header>

          {recentArticles.length > 0 && (
            <main style={{ marginTop: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px' }}>
                {listHeading}
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

const DEFAULT_IMAGE = `${SITE_URL}/assets/sapsecurityexpert-black.png`;

function buildMeta(d) {
  const image = d.image
    ? (d.image.startsWith('http') ? d.image : `${SITE_URL}${d.image}`)
    : DEFAULT_IMAGE;
  return {
    title: d.title,
    description: d.description,
    robots: {
      index: true,
      follow: true,
    },
    ...(d.keywords ? { keywords: d.keywords } : {}),
    alternates: { canonical: d.url },
    openGraph: {
      title: d.title,
      description: d.description,
      url: d.url,
      siteName: 'SAP Security Expert',
      images: [{ url: image }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: d.title,
      description: d.description,
      images: [image],
    },
  };
}

function defaultMeta(path) {
  const url = `${SITE_URL}${path}`;
  const title = 'SAP Security, GRC & Cybersecurity Community - Tutorials & Best Practices | SAP Security Expert';
  const description = 'Join 10,000+ SAP Security, GRC, and BTP professionals. Access expert tutorials, best practices, and guides to protect your SAP landscape and advance your career.';
  const image = `${SITE_URL}/assets/sapsecurityexpert-black.png`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
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
