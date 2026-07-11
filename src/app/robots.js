const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
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
