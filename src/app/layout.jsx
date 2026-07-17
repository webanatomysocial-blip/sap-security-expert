import { headers } from "next/headers";
import "./globals.css";
import DeferredStyles from "../components/DeferredStyles";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://sapsecurityexpert.com').replace(/\/$/, '');

// Escape JSON for safe embedding inside a <script> element.
// JSON.stringify escapes quotes/backslashes but NOT < or /, so the sequence
// </script> inside a string value closes the script tag prematurely (raw-text
// element parsing rule — the HTML parser never sees the JSON, just bytes).
// Replacing < → < and / → / (both valid JSON escape sequences)
// makes the string invisible to the HTML parser while remaining valid JSON.
function safeJsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

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
  alternates: { canonical: SITE_URL },
};

export default async function RootLayout({ children }) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-W8C8PFTK');` }} />
        {/* End Google Tag Manager */}
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/fav.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="google-adsense-account" content="ca-pub-5501267075758433" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <meta name="google-site-verification" content="4HfxE-z5fk8PHUMJPDFDuOPPm73HtE8zpQZ_MHpfL5o" />
        {/* Site-wide structured data — Organization + WebSite (SearchAction) */}
        <script
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: safeJsonLd([orgSchema, websiteSchema]) }}
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W8C8PFTK" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        {/* End Google Tag Manager (noscript) */}
        <div id="root">{children}</div>
        <DeferredStyles />
      </body>
    </html>
  );
}
