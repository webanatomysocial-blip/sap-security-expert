const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

const STATIC_PAGES = [
  { url: '/',                        priority: 1.0, changeFrequency: 'daily'   },
  { url: '/blogs',                   priority: 0.9, changeFrequency: 'daily'   },
  { url: '/about',                   priority: 0.7, changeFrequency: 'monthly' },
  { url: '/contact-us',              priority: 0.6, changeFrequency: 'monthly' },
  { url: '/podcasts',                priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/product-reviews',         priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/expert-recommendations',  priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/become-a-contributor',    priority: 0.6, changeFrequency: 'monthly' },
  { url: '/authors/raghu-boddu',     priority: 0.8, changeFrequency: 'monthly' },
];

const CATEGORY_PAGES = [
  'sap-security',
  'sap-grc',
  'sap-btp-security',
  'sap-public-cloud',
  'sap-cybersecurity',
  'sap-iag',
  'sap-s4hana-security',
  'sap-fiori-security',
  'sap-sac-security',
  'sap-cis',
  'sap-successfactors-security',
  'sap-access-control',
  'sap-process-control',
  'sap-security-other',
];

export default async function sitemap() {
  const today = new Date();

  // Static pages
  const staticEntries = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.url}`,
    lastModified: today,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  // Category pillar pages
  const categoryEntries = CATEGORY_PAGES.map((cat) => ({
    url: `${SITE_URL}/${cat}`,
    lastModified: today,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const toDate = (raw, fallback) => {
    try {
      if (!raw) return fallback;
      const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
      return isNaN(d) ? fallback : d;
    } catch { return fallback; }
  };

  // Blog articles
  let articleEntries = [];
  try {
    const res = await fetch(`${INTERNAL_API}/api/posts`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const posts = await res.json();
      if (Array.isArray(posts)) {
        articleEntries = posts
          .filter((p) => p.category && p.slug && p.status !== 'draft')
          .map((p) => ({
            url: `${SITE_URL}/${p.category}/${p.slug}`,
            lastModified: toDate(p.updated_at || p.date, today),
            changeFrequency: 'monthly',
            priority: 0.7,
          }));
      }
    }
  } catch {}

  // Learning articles — URL pattern /learning/:moduleCategory/:slug
  let learningEntries = [];
  try {
    const res = await fetch(`${INTERNAL_API}/api/learnings`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.learnings || []);
      learningEntries = items
        .filter((p) => p.category && p.slug)
        .map((p) => ({
          url: `${SITE_URL}/learning/${p.category}/${p.slug}`,
          lastModified: toDate(p.updated_at || p.date, today),
          changeFrequency: 'monthly',
          priority: 0.6,
        }));
    }
  } catch {}

  // News articles — URL pattern /news/:slug
  let newsEntries = [];
  try {
    const res = await fetch(`${INTERNAL_API}/api/news`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.news || []);
      newsEntries = items
        .filter((p) => p.slug)
        .map((p) => ({
          url: `${SITE_URL}/news/${p.slug}`,
          lastModified: toDate(p.updated_at || p.date, today),
          changeFrequency: 'weekly',
          priority: 0.65,
        }));
    }
  } catch {}

  return [...staticEntries, ...categoryEntries, ...articleEntries, ...learningEntries, ...newsEntries];
}
