import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ClientApp from '../../[[...slug]]/ClientApp';
import { safeUrl } from "../../../utils/safeUrl";

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sapsecurityexpert.com').replace(/^http:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/))/, 'https://').replace(/\/$/, '');

const SKIP_CATEGORIES = new Set(['admin', 'member', 'api', 'uploads', 'assets', '_next', 'experts', 'contributor', 'ambassador']);

// These established public profile URLs must retain meaningful raw HTML even
// when a legacy contributor record is unavailable through the profile API.
const KNOWN_CONTRIBUTORS = {
  raghu: 'Raghu Boddu',
  'inderdeep-singh': 'Inderdeep Singh',
  'sahar-guermah': 'Sahar Guermah',
  'srini-p': 'Srini P',
};

function humanizeSlug(value) {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function fetchContributor(slug) {
  try {
    const res = await fetch(`${INTERNAL_API}/api/contributors/profile/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      headers: SSR_SECRET ? { 'X-SSR-Internal': SSR_SECRET } : {},
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.contributor || null;
  } catch {
    return null;
  }
}

function contributorMeta(slug, contributor) {
  const name = contributor?.full_name || KNOWN_CONTRIBUTORS[slug] || humanizeSlug(slug) || 'SAP Security Contributor';
  const description = contributor?.short_bio || contributor?.bio
    || `${name} is a contributor at SAP Security Expert, sharing practical SAP security expertise.`;
  const canonical = `${SITE_URL}/contributor/${encodeURIComponent(slug)}`;
  return {
    title: `${name} | SAP Security Expert`,
    description: description.slice(0, 160),
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title: `${name} | SAP Security Expert`,
      description: description.slice(0, 160),
      url: canonical,
      siteName: 'SAP Security Expert',
      type: 'profile',
    },
  };
}

function safeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

const CATEGORY_LABELS = {
  'sap-security': 'SAP Security',
  'sap-s4hana-security': 'SAP S/4HANA Security',
  'sap-fiori-security': 'SAP Fiori Security',
  'sap-btp-security': 'SAP BTP Security',
  'sap-public-cloud': 'SAP Public Cloud',
  'sap-sac-security': 'SAP SAC Security',
  'sap-cis': 'SAP Cloud Identity Services',
  'sap-successfactors-security': 'SuccessFactors Security',
  'sap-security-other': 'Advanced SAP Security',
  'sap-access-control': 'Access Control',
  'sap-process-control': 'Process Control',
  'sap-iag': 'SAP IAG',
  'sap-grc': 'SAP GRC',
  'sap-cybersecurity': 'Cybersecurity',
  'product-reviews': 'Product Reviews',
  'podcasts': 'Expert Voices & Podcasts',
  'videos': 'Videos',
  'expert-recommendations': 'Expert Articles',
  'news': 'News & Updates',
  'security-fundamentals': 'Security Fundamentals',
  'user-management': 'User Management',
  'role-management': 'Role Management',
  'authorization-concepts': 'Authorization Concepts',
  'audit-compliance': 'Audit & Compliance',
  'grc-advanced': 'GRC & Advanced Topics',
  'sap-licensing': 'SAP Licensing',
  'downloads': 'Downloads',
};

// ── Data fetching ────────────────────────────────────────────────────────────

async function fetchBlog(slug) {
  try {
    const res = await fetch(`${INTERNAL_API}/api/posts/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
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

// Article HTML is editor-authored. Ensure every content image has an alt
// attribute and lazy loading before it reaches the server-rendered document.
// Existing non-empty author-provided alt text is preserved.
function enhanceArticleImages(html, fallbackAlt) {
  const escapedAlt = String(fallbackAlt || 'SAP Security Expert article image')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    let result = tag;
    if (!/\balt\s*=/i.test(result)) result = result.replace(/<img\b/i, `<img alt="${escapedAlt}"`);
    if (!/\bloading\s*=/i.test(result)) result = result.replace(/<img\b/i, '<img loading="lazy"');
    return result;
  });
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }) {
  const { category, slug } = await params;
  if (category === 'contributor') return contributorMeta(slug, await fetchContributor(slug));
  if (category === 'experts' && slug === 'raghu-boddu') {
    const title = 'Raghu Boddu | SAP Security & GRC Expert | SAP Security Expert';
    const description = 'Raghu Boddu is an SAP Security and GRC expert with 25+ years of experience across SAP security, GRC, audit, access governance, automation, and enterprise cybersecurity. CEO of ToggleNow and founder of SAP Security Expert.';
    const canonical = `${SITE_URL}/experts/raghu-boddu`;
    const image = `${SITE_URL}/assets/raghu_boddu.png`;
    return {
      title,
      description,
      robots: { index: true, follow: true },
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'SAP Security Expert',
        images: [{ url: image }],
        type: 'profile',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [image],
      },
    };
  }
  if (SKIP_CATEGORIES.has(category)) return { title: 'SAP Security Expert', robots: { index: false, follow: false } };

  const path = `/${category}/${slug}`;

  // Try seoMeta first (already resolves meta_title, meta_description, keywords, absolute image)
  const d = await fetchSeoMeta(path);

  // Fall back to direct blog fetch so we always have real title/description
  const fallbackBlog = d ? null : await fetchBlog(slug);

  const rawTitle = d?.title
    || (fallbackBlog ? (fallbackBlog.meta_title || fallbackBlog.title) + ' | SAP Security Expert' : 'SAP Security Expert');
  const title = rawTitle.includes('|') ? rawTitle : `${rawTitle} | SAP Security Expert`;

  const description = d?.description
    || fallbackBlog?.meta_description
    || fallbackBlog?.excerpt
    || 'Expert SAP Security insights and best practices.';

  const keywords = d?.keywords || fallbackBlog?.meta_keywords || null;

  const rawImage = d?.image || fallbackBlog?.image || null;
  const image = rawImage
    ? (rawImage.startsWith('http') ? rawImage : `${SITE_URL}${rawImage}`)
    : `${SITE_URL}/assets/sapsecurityexpert-black.png`;

  const canonical = d?.url || `${SITE_URL}${path}`;

  return {
    title,
    description,
    robots: {
      index: true,
      follow: true,
    },
    ...(keywords ? { keywords } : {}),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'SAP Security Expert',
      images: [{ url: image }],
      type: 'article',
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
    ...(blog.author_contributor_id ? { url: `${SITE_URL}/contributor/${blog.author_contributor_slug || blog.author_contributor_id}` } : {}),
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

  if (category === 'contributor') {
    const contributor = await fetchContributor(slug);
    const name = contributor?.full_name || KNOWN_CONTRIBUTORS[slug];
    if (name) {
      const bio = contributor?.short_bio || contributor?.bio
        || `${name} shares practical SAP security expertise with the SAP Security Expert community.`;
      return (
        <>
          <article id="ssr-blog-content" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>{name}</h1>
            {contributor?.role && <p style={{ color: '#475569', fontWeight: 600, margin: '0 0 12px' }}>{contributor.role}</p>}
            <p style={{ fontSize: '1.1rem', color: '#334155', lineHeight: 1.7, margin: 0 }}>{bio}</p>
          </article>
          <ClientApp />
        </>
      );
    }
    return <ClientApp />;
  }

  // The founder profile is rendered by the client application, but it is an
  // important public author page. Keep its principal content in raw HTML so
  // non-JavaScript crawlers and LLM crawlers receive a descriptive H1.
  if (category === 'experts' && slug === 'raghu-boddu') {
    return (
      <>
        <article id="ssr-blog-content" style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Raghu Boddu</h1>
          <p style={{ fontSize: '1.1rem', color: '#334155', lineHeight: 1.7, margin: 0 }}>
            Raghu Boddu is an SAP Security and GRC expert with more than 25 years of experience in access governance, cybersecurity, SAP automation, and enterprise security architecture.
          </p>
        </article>
        <ClientApp />
      </>
    );
  }

  // Let the SPA catch-all handle non-blog routes
  if (SKIP_CATEGORIES.has(category)) {
    return <ClientApp />;
  }

  const blog = await fetchBlog(slug);

  // Unknown category: never a valid public URL, return 404
  if (!CATEGORY_LABELS[category]) {
    notFound();
  }

  // Known category but article missing or draft: return 404
  if (!blog || (blog.status && blog.status === 'draft')) {
    notFound();
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
  // isPremiumLocked is only used by the client SPA; SSR bypass returns full content for Googlebot
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <>
      {/* JSON-LD — always in head, not removed with SSR content */}
      <script
        type="application/ld+json"
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: safeJsonLd(schemas) }}
      />

      {/*
        #ssr-blog-content — server-rendered article HTML, rendered visibly.
        Real users and Googlebot both see this immediately without waiting on JS.
        AppWrapper removes this div once the React SPA finishes mounting and
        takes over with the interactive version. Must NOT be hidden (opacity/
        1px/off-screen tricks) — a page whose only content is invisible until
        JS runs gets flagged as Soft 404 whenever hydration is slow or fails,
        which happens routinely right after a deploy.
      */}
      <div id="ssr-blog-content" suppressHydrationWarning>
      <div className="blog-post-wrapper" suppressHydrationWarning>
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

            {/* Content-tier badge */}
            {isPremium ? (
              <div className="exclusive-badge-full" style={{ background: 'linear-gradient(135deg,#92400e,#d97706)', borderColor: '#d97706' }}>
                <i className="bi bi-star-fill" /> PREMIUM – Requires credits or subscription
              </div>
            ) : isMembersOnly ? (
              <div className="exclusive-badge-full">
                <i className="bi bi-lock-fill" /> EXCLUSIVE – Registered members only
              </div>
            ) : (
              <div className="exclusive-badge-full" style={{ background: 'linear-gradient(135deg,#15803d,#16a34a)', borderColor: '#16a34a' }}>
                <i className="bi bi-unlock-fill" /> FREE – Anyone can read
              </div>
            )}

            {/* Title */}
            <h1 className="blog-title">{blog.title}</h1>

            {/* Article content */}
            <article
              suppressHydrationWarning
              className="blog-content-body"
              dangerouslySetInnerHTML={{ __html: enhanceArticleImages(blog.content || '', blog.title) }}
            />

            {/* FAQs */}
            {faqs.length > 0 && (
              <section className="blog-faqs-section" style={{ marginTop: '40px' }}>
                <h2>Frequently Asked Questions</h2>
                {faqs.map((faq, i) => (
                  <details key={i} style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                    <summary style={{ fontWeight: '700', cursor: 'pointer', fontSize: '1.05rem', color: '#1e293b' }}>
                      {faq.question}
                    </summary>
                    <div style={{ marginTop: '10px', color: '#475569', lineHeight: '1.7' }} dangerouslySetInnerHTML={{ __html: faq.answer }} />
                  </details>
                ))}
              </section>
            )}

            {/* CTA block */}
            {hasCta && (
              <div className="blog-cta-section" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: '#fff', padding: '40px', borderRadius: '16px', textAlign: 'center', margin: '40px 0' }}>
                <h2 style={{ fontSize: '1.8rem', marginBottom: '16px', color: '#fff' }}>{blog.cta_title}</h2>
                {blog.cta_description && <p style={{ opacity: 0.9, marginBottom: '24px' }}>{blog.cta_description}</p>}
                {blog.cta_button_text && blog.cta_button_link && (
                  <Link href={safeUrl(blog.cta_button_link)} style={{ display: 'inline-block', background: '#fff', color: '#1e40af', padding: '12px 32px', borderRadius: '50px', fontWeight: 'bold', textDecoration: 'none' }}>
                    {blog.cta_button_text}
                  </Link>
                )}
              </div>
            )}

            {/* Author card */}
            {authorName && (
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
                <div suppressHydrationWarning>
                  {blog.author_contributor_id ? (
                    <a href={`/contributor/${blog.author_contributor_slug || blog.author_contributor_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>{authorName}</h3>
                    </a>
                  ) : (
                    <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#0f172a' }}>{authorName}</h3>
                  )}
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
