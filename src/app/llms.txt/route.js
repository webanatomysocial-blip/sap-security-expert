import { NextResponse } from 'next/server';

const INTERNAL_API = process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

async function fetchJson(url) {
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function GET() {
  const [postsData, newsData] = await Promise.all([
    fetchJson(`${INTERNAL_API}/api/posts-sitemap`),
    fetchJson(`${INTERNAL_API}/api/news`),
  ]);

  const posts = postsData
    ? (Array.isArray(postsData) ? postsData : (postsData.posts || postsData.blogs || []))
        .filter((p) => p.category && p.slug && p.status !== 'draft')
    : [];

  const news = newsData
    ? (Array.isArray(newsData) ? newsData : (newsData.news || []))
        .filter((p) => p.slug)
    : [];

  // Group articles by category
  const byCategory = {};
  for (const p of posts) {
    if (!byCategory[p.category]) byCategory[p.category] = [];
    byCategory[p.category].push(p);
  }

  const lines = [
    `# SAP Security Expert`,
    ``,
    `> Expert knowledge hub for SAP Security, GRC, BTP, and cybersecurity professionals. Tutorials, best practices, audit guides, and product reviews written by practitioners.`,
    ``,
    `## Key Pages`,
    ``,
    `- [Home](${SITE_URL}/): SAP Security community homepage with latest articles and guides`,
    `- [All Articles](${SITE_URL}/blogs): Full library of SAP security articles`,
    `- [Learning Hub](${SITE_URL}/learning-hub): Structured learning paths for SAP security topics`,
    `- [Contributors](${SITE_URL}/contributors): Expert contributors and authors`,
    `- [Downloads](${SITE_URL}/downloads): Free SAP security tools and resources`,
    `- [News](${SITE_URL}/news): Latest SAP security news and updates`,
    `- [Podcasts](${SITE_URL}/podcasts): Expert voices and podcast episodes`,
    `- [Videos](${SITE_URL}/videos): SAP security video content`,
    `- [Product Reviews](${SITE_URL}/product-reviews): Independent SAP tool and product reviews`,
    ``,
  ];

  // Articles by category
  for (const [cat, articles] of Object.entries(byCategory)) {
    const label = cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`## ${label}`);
    lines.push('');
    for (const p of articles) {
      const desc = p.meta_description || p.excerpt || '';
      const truncated = desc.length > 120 ? desc.slice(0, 120).trimEnd() + '…' : desc;
      const suffix = truncated ? `: ${truncated}` : '';
      lines.push(`- [${p.title}](${SITE_URL}/${p.category}/${p.slug})${suffix}`);
    }
    lines.push('');
  }

  // News
  if (news.length > 0) {
    lines.push('## News & Updates');
    lines.push('');
    for (const p of news) {
      const desc = p.meta_description || p.excerpt || '';
      const truncated = desc.length > 120 ? desc.slice(0, 120).trimEnd() + '…' : desc;
      const suffix = truncated ? `: ${truncated}` : '';
      lines.push(`- [${p.title}](${SITE_URL}/news/${p.slug})${suffix}`);
    }
    lines.push('');
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
    },
  });
}
