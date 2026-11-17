const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sapsecurityexpert.com').replace(/^http:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/))/, 'https://').replace(/\/$/, '');

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        // Public read-only endpoints the pages fetch while rendering; Googlebot must reach
        // them or it sees empty pages (soft 404). Longest match wins over '/api/'.
        allow: ['/', ...['announcements', 'announcements-public', 'ads', 'posts', 'stats', 'version', 'homepage', 'news', 'learnings', 'contributors', 'ambassadors', 'seo-meta'].map((e) => `/api/${e}`)],
        disallow: [
          '/admin/',
          '/member/',
          '/api/',
          '/forgot-password',
          '/reset-password',
          '/member/login',
          '/member/signup',
          '/member/settings',
          '/member/achievements',
          '/member/credits',
          '/member/invoice/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
