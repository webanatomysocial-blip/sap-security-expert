import Image from 'next/image';
import Link from 'next/link';
import ClientApp from '../../[[...slug]]/ClientApp';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

const SKIP_CATEGORIES = new Set(['admin', 'member', 'api', 'uploads', 'assets', '_next']);

const CATEGORY_LABELS = {
  'sap-security': 'SAP Security',
  'sap-s4hana-security': 'SAP S/4HANA Security',
  'sap-fiori-security': 'SAP Fiori Security',
  'sap-btp-security': 'SAP BTP Security',
  'sap-public-cloud': 'SAP Public Cloud',
  'sap-sac-security': 'SAP SAC Security',
  'sap-cis': 'SAP CIS',
  'sap-successfactors-security': 'SuccessFactors Security',
  'sap-security-other': 'SAP Security',
  'sap-access-control': 'Access Control',
  'sap-process-control': 'Process Control',
  'sap-iag': 'SAP IAG',
  'sap-grc': 'SAP GRC',
  'sap-cybersecurity': 'Cybersecurity',
  'product-reviews': 'Product Reviews',
  'podcasts': 'Expert Voices & Podcasts',
  'videos': 'Videos',
  'expert-recommendations': 'Expert Recommendations',
  'news': 'News & Updates',
  'security-fundamentals': 'Security Fundamentals',
  'user-management': 'User Management',
  'role-management': 'Role Management',
  'authorization-concepts': 'Authorization Concepts',
  'audit-compliance': 'Audit & Compliance',
  'grc-advanced': 'GRC & Advanced Topics',
};

// ── Data fetching ────────────────────────────────────────────────────────────

async function fetchBlog(slug) {
  try {
    const res = await fetch(`${INTERNAL_API}/api/posts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ? data : null;
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

// Add loading="lazy" to <img> tags that don't already have a loading attribute
function addLazyLoading(html) {
  return html.replace(/<img(?![^>]*\bloading=)/gi, '<img loading="lazy"');
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { category, slug } = await params;
  if (SKIP_CATEGORIES.has(category)) return { title: 'SAP Security Expert' };

  const path = `/${category}/${slug}`;
  const d = await fetchSeoMeta(path);

  if (!d) return { title: 'SAP Security Expert' };

  const image = d.image
    ? (d.image.startsWith('http') ? d.image : `${SITE_URL}${d.image}`)
    : `${SITE_URL}/assets/sapsecurityexpert-black.png`;

  return {
    title: d.title,
    description: d.description,
    alternates: { canonical: d.url || `${SITE_URL}${path}` },
    openGraph: {
      title: d.title,
      description: d.description,
      url: d.url || `${SITE_URL}${path}`,
      siteName: 'SAP Security Expert',
      images: [{ url: image }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: d.title,
      description: d.description,
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

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function buildSchemas(blog, category, url) {
  const authorName = blog.author_name || 'SAP Security Expert';
  const schemaType = blog.schema_type || 'BlogPosting';
  const articleSection = blog.article_section || CATEGORY_LABELS[category] || category;
  const wordCount = stripHtml(blog.content || '').split(/\s+/).filter(Boolean).length;

  // Author — include profile URL when a contributor ID is known
  const authorObj = {
    '@type': 'Person',
    name: authorName,
    ...(blog.author_id ? { url: `${SITE_URL}/contributor/${blog.author_id}` } : {}),
    ...(blog.author_image ? { image: blog.author_image.startsWith('http') ? blog.author_image : `${SITE_URL}${blog.author_image}` } : {}),
  };

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': schemaType,
      headline: blog.meta_title || blog.title,
      description: blog.meta_description || blog.excerpt || blog.title,
      image: blog.image ? (blog.image.startsWith('http') ? blog.image : `${SITE_URL}${blog.image}`) : `${SITE_URL}/assets/sapsecurityexpert-black.png`,
      datePublished: blog.date || blog.published_at || blog.created_at,
      dateModified: blog.updated_at || blog.date || blog.created_at,
      author: authorObj,
      publisher: {
        '@type': 'Organization',
        name: 'SAP Security Expert',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/sapsecurityexpert-black.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      articleSection,
      inLanguage: 'en',
      isAccessibleForFree: !blog.is_members_only,
      ...(wordCount > 0 ? { wordCount } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: CATEGORY_LABELS[category] || category, item: `${SITE_URL}/${category}` },
        { '@type': 'ListItem', position: 3, name: blog.title, item: url },
      ],
    },
  ];

  if (blog.faqs) {
    try {
      const faqs = typeof blog.faqs === 'string' ? JSON.parse(blog.faqs) : blog.faqs;
      const validFaqs = Array.isArray(faqs) ? faqs.filter(f => f.question && f.answer) : [];
      if (validFaqs.length) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: validFaqs.map(f => ({
            '@type': 'Question',
            name: stripHtml(f.question),
            acceptedAnswer: {
              '@type': 'Answer',
              // Strip HTML — schema.org FAQ text must be plain text for Google Rich Results
              text: stripHtml(f.answer),
            },
          })),
        });
      }
    } catch {}
  }

  return schemas;
}

// ── Page (Server Component) ───────────────────────────────────────────────────

export default async function BlogPostPage({ params }) {
  const { category, slug } = await params;

  // Let the SPA catch-all handle non-blog routes
  if (SKIP_CATEGORIES.has(category)) {
    return <ClientApp />;
  }

  const blog = await fetchBlog(slug);

  // If not found or wrong category, hand off to the SPA
  if (!blog || (blog.status && blog.status === 'draft')) {
    return <ClientApp />;
  }

  const authorName = blog.author_name || 'SAP Security Expert';
  const featuredImage = blog.image || blog.featured_image;
  const pageUrl = `${SITE_URL}/${category}/${slug}`;
  const schemas = buildSchemas(blog, category, pageUrl);

  let faqs = [];
  try {
    const raw = blog.faqs;
    faqs = raw ? (Array.isArray(raw) ? raw : JSON.parse(raw)) : [];
  } catch {}

  const hasCta = blog.cta_title;
  const isMembersOnly = parseInt(blog.is_members_only || 0) === 1;
  const isPremium = parseInt(blog.is_premium || 0) === 1;
  const isPremiumLocked = !!blog.premium_locked;

  return (
    <>
      {/* JSON-LD — always in head, not removed with SSR content */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
      />

      {/*
        #ssr-blog-content — server-rendered article HTML.
        Googlebot indexes this immediately without waiting for JS.
        AppWrapper removes this div the moment the React SPA mounts,
        so real users only ever see the interactive SPA version.
      */}
      <div id="ssr-blog-content" aria-hidden="false">
      <div className="blog-post-wrapper">
        <div className="container blog-container">
          <main className="blog-main-column">

            {/* Featured image — priority + no lazy so LCP is as fast as possible */}
            {featuredImage && (
              <div className="blog-featured-image">
                <Image
                  src={featuredImage}
                  alt={blog.image_alt || blog.title}
                  width={1200}
                  height={675}
                  priority
                  style={{ display: 'block', width: '100%', height: 'auto', objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Breadcrumbs */}
            <nav className="blog-breadcrumb" aria-label="Breadcrumb">
              <Link href="/" className="breadcrumb-link">Home</Link>
              <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
              <Link href={`/${category}`} className="breadcrumb-link">
                {CATEGORY_LABELS[category] || category}
              </Link>
              <span className="breadcrumb-sep"><i className="bi bi-chevron-right" /></span>
              <span className="breadcrumb-current">{blog.title}</span>
            </nav>

            {/* Meta row */}
            <div className="blog-meta-row">
              <div className="meta-left">
                <span className="meta-author">{authorName},</span>
                <span className="meta-date" style={{ marginLeft: '5px' }}>{formatDate(blog.date || blog.published_at)}</span>
                <span className="meta-dot">•</span>
                <span className="meta-views"><i className="bi bi-eye" /> {blog.view_count || 0}</span>
              </div>
            </div>

            {/* Members-only badge */}
            {isMembersOnly && (
              <div className="exclusive-badge-full">
                <i className="bi bi-lock-fill" /> Exclusive Members-Only Content
              </div>
            )}

            {/* Premium badge */}
            {isPremium && (
              <div className="exclusive-badge-full" style={{ background: 'linear-gradient(135deg,#92400e,#d97706)', borderColor: '#d97706' }}>
                <i className="bi bi-star-fill" /> Premium Article — Paid Members Only
              </div>
            )}

            {/* Title */}
            <h1 className="blog-title">{blog.title}</h1>

            {/* Article content */}
            <article
              className="blog-content-body"
              dangerouslySetInnerHTML={{ __html: addLazyLoading(isMembersOnly ? (blog.content || '').substring(0, 600) + '...' : (blog.content || '')) }}
            />

            {/* FAQs — never shown for premium-locked or members-only */}
            {faqs.length > 0 && !isPremiumLocked && !isMembersOnly && (
              <section className="blog-faqs-section" style={{ marginTop: '40px' }}>
                <h2>Frequently Asked Questions</h2>
                {faqs.map((faq, i) => (
                  <details key={i} style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                    <summary style={{ fontWeight: '700', cursor: 'pointer', fontSize: '1.05rem', color: '#1e293b' }}>
                      {faq.question}
                    </summary>
                    <p style={{ marginTop: '10px', color: '#475569', lineHeight: '1.7' }}>{faq.answer}</p>
                  </details>
                ))}
              </section>
            )}

            {/* CTA block — not shown for locked content */}
            {hasCta && !isPremiumLocked && !isMembersOnly && (
              <div className="blog-cta-section" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', margin: '40px 0' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', color: '#fff' }}>{blog.cta_title}</h2>
                {blog.cta_description && <p style={{ opacity: 0.9, marginBottom: '24px' }}>{blog.cta_description}</p>}
                {blog.cta_button_text && blog.cta_button_link && (
                  <Link href={blog.cta_button_link} style={{ display: 'inline-block', background: '#fff', color: '#1e40af', padding: '12px 32px', borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none' }}>
                    {blog.cta_button_text}
                  </Link>
                )}
              </div>
            )}

            {/* Author card — not shown for locked content */}
            {authorName && !isPremiumLocked && (
              <div className="author-profile-card" style={{ display: 'flex', gap: '20px', padding: '30px', background: '#f8fafc', borderRadius: '16px', marginTop: '40px', border: '1px solid #e2e8f0' }}>
                {blog.author_image && (
                  <Image
                    src={blog.author_image.startsWith('http') ? blog.author_image : blog.author_image}
                    alt={authorName}
                    width={80}
                    height={80}
                    loading="lazy"
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>{authorName}</h3>
                  {blog.author_designation && (
                    <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>{blog.author_designation}</p>
                  )}
                  <p style={{ margin: 0, color: '#475569', lineHeight: '1.6' }}>{blog.author_bio || 'Expert SAP Security contributor.'}</p>
                </div>
              </div>
            )}

          </main>

          {/* Sidebar placeholder for crawlers */}
          <div className="blog-sidebar-column" />
        </div>
      </div>
      </div>{/* end #ssr-blog-content */}

      {/* Full interactive SPA — AppWrapper removes #ssr-blog-content on mount */}
      <ClientApp />
    </>
  );
}
