import Link from 'next/link';
import { notFound } from 'next/navigation';
import ClientApp from '../../[[...slug]]/ClientApp';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

async function fetchAnnouncement(slug) {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/announcements-public/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id ? data : null;
  } catch {
    return null;
  }
}

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return isNaN(d) ? str : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const item = await fetchAnnouncement(slug);
  if (!item) return { title: 'SAP Security Expert', robots: { index: false, follow: false } };

  const title = `${item.title} | SAP Security Expert`;
  const description = item.excerpt || item.title;
  const url = `${SITE_URL}/announcements/${slug}`;
  const image = item.image?.startsWith('http') ? item.image : item.image ? `${SITE_URL}${item.image}` : `${SITE_URL}/assets/sapsecurityexpert-black.png`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'SAP Security Expert', images: [{ url: image }], type: 'article' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function AnnouncementPage({ params }) {
  const { slug } = await params;
  const item = await fetchAnnouncement(slug);

  if (!item) notFound();

  const url = `${SITE_URL}/announcements/${slug}`;
  const image = item.image?.startsWith('http') ? item.image : item.image ? `${SITE_URL}${item.image}` : null;

  return (
    <>
      <div id="ssr-blog-content" suppressHydrationWarning>
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '24px' }}>
            <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Home</Link>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&rsaquo;</span>
            <Link href="/announcements" style={{ color: '#3b82f6', textDecoration: 'none' }}>Announcements</Link>
            <span style={{ margin: '0 8px', color: '#cbd5e1' }}>&rsaquo;</span>
            <span style={{ color: '#1e293b', fontWeight: 600 }}>{item.title}</span>
          </nav>

          {image && (
            <img
              src={image}
              alt={item.image_alt || item.title}
              loading="eager"
              style={{ width: '100%', height: 'auto', borderRadius: '12px', marginBottom: '24px', objectFit: 'cover', maxHeight: '400px' }}
            />
          )}

          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>{item.title}</h1>
          <div style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '28px' }}>
            {formatDate(item.date || item.created_at)}
          </div>

          {item.excerpt && (
            <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: 1.7, marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
              {item.excerpt}
            </p>
          )}

          <article
            suppressHydrationWarning
            style={{ lineHeight: 1.75, color: '#334155', fontSize: '1rem' }}
            dangerouslySetInnerHTML={{ __html: item.content || '' }}
          />

          {item.link && (
            <div style={{ marginTop: '32px' }}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#1e40af', color: '#fff', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}
              >
                Read More &rarr;
              </a>
            </div>
          )}
        </div>
      </div>

      <ClientApp />
    </>
  );
}
