const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

const STATIC_PAGES = [
  { url: '/',                          priority: 1.0, changeFrequency: 'daily'   },
  { url: '/blogs',                     priority: 0.9, changeFrequency: 'daily'   },
  { url: '/about',                     priority: 0.7, changeFrequency: 'monthly' },
  { url: '/contact-us',                priority: 0.6, changeFrequency: 'monthly' },
  { url: '/news',                      priority: 0.8, changeFrequency: 'daily'   },
  { url: '/announcements',             priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/podcasts',                  priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/videos',                    priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/product-reviews',           priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/expert-recommendations',    priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/learning-hub',              priority: 0.8, changeFrequency: 'weekly'  },
  { url: '/become-a-contributor',      priority: 0.6, changeFrequency: 'monthly' },
  { url: '/contributors',              priority: 0.6, changeFrequency: 'weekly'  },
  { url: '/leaderboard',               priority: 0.5, changeFrequency: 'weekly'  },
  { url: '/transactions',              priority: 0.6, changeFrequency: 'monthly' },
  { url: '/downloads',                 priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/sap-licensing',             priority: 0.7, changeFrequency: 'weekly'  },
  { url: '/sitemap',                   priority: 0.4, changeFrequency: 'monthly' },
  { url: '/privacy-policy',            priority: 0.3, changeFrequency: 'yearly'  },
  { url: '/terms-conditions',          priority: 0.3, changeFrequency: 'yearly'  },
  { url: '/learning/security-fundamentals', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/learning/user-management',      priority: 0.7, changeFrequency: 'monthly' },
  { url: '/learning/role-management',      priority: 0.7, changeFrequency: 'monthly' },
  { url: '/learning/authorization-concepts', priority: 0.7, changeFrequency: 'monthly' },
  { url: '/learning/audit-compliance',     priority: 0.7, changeFrequency: 'monthly' },
  { url: '/learning/grc-advanced',         priority: 0.7, changeFrequency: 'monthly' },
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
  'sap-licensing',
  'downloads',
];

const toDate = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
    return isNaN(d) ? fallback : d;
  } catch { return fallback; }
};

async function fetchJson(url) {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

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

  // Blog articles
  let articleEntries = [];
  const postsData = await fetchJson(`${INTERNAL_API}/api/posts-sitemap`);
  if (postsData) {
    const posts = Array.isArray(postsData) ? postsData : (postsData.posts || postsData.blogs || []);
    articleEntries = posts
      .filter((p) => p.category && p.slug && p.status !== 'draft')
      .map((p) => ({
        url: `${SITE_URL}/${p.category}/${p.slug}`,
        lastModified: toDate(p.updated_at || p.date, today),
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
  }

  // News articles
  let newsEntries = [];
  const newsData = await fetchJson(`${INTERNAL_API}/api/news`);
  if (newsData) {
    const items = Array.isArray(newsData) ? newsData : (newsData.news || []);
    newsEntries = items
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/news/${p.slug}`,
        lastModified: toDate(p.updated_at || p.date, today),
        changeFrequency: 'weekly',
        priority: 0.65,
      }));
  }

  // Announcements
  let announcementEntries = [];
  const annData = await fetchJson(`${INTERNAL_API}/api/announcements-public`);
  if (annData) {
    const items = Array.isArray(annData) ? annData : (annData.announcements || annData.data || []);
    announcementEntries = items
      .filter((p) => p.slug || p.id)
      .map((p) => ({
        url: `${SITE_URL}/announcements/${p.slug || p.id}`,
        lastModified: toDate(p.updated_at || p.date, today),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
  }

  // Learning articles
  let learningEntries = [];
  const learningsData = await fetchJson(`${INTERNAL_API}/api/learnings`);
  if (learningsData) {
    const items = Array.isArray(learningsData) ? learningsData : (learningsData.learnings || []);
    learningEntries = items
      .filter((p) => p.category && p.slug)
      .map((p) => ({
        url: `${SITE_URL}/learning/${p.category}/${p.slug}`,
        lastModified: toDate(p.updated_at || p.date, today),
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
  }

  return [
    ...staticEntries,
    ...categoryEntries,
    ...articleEntries,
    ...newsEntries,
    ...announcementEntries,
    ...learningEntries,
  ];
}
