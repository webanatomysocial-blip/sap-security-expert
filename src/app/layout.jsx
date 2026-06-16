import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://sap.webanatomy.in').replace(/\/$/, '');

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SAP Security Expert',
  url: SITE_URL,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/assets/sapsecurityexpert-black.png` },
  description: 'The leading practitioner community for SAP Security, GRC, BTP, and Identity professionals.',
  sameAs: [
    'https://www.linkedin.com/company/sap-security-expert',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SAP Security Expert',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/blogs?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

export const metadata = {
  title: "SAP Security Expert",
  description: "The leading community for SAP Security, GRC, and BTP professionals.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/fav.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-adsense-account" content="ca-pub-5501267075758433" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />
        <meta name="google-site-verification" content="4HfxE-z5fk8PHUMJPDFDuOPPm73HtE8zpQZ_MHpfL5o" />
        {/* Site-wide structured data — Organization + WebSite (SearchAction) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([orgSchema, websiteSchema]) }}
        />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
