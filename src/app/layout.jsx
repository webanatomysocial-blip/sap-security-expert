import "./globals.css";
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
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" />
        <meta name="google-site-verification" content="4HfxE-z5fk8PHUMJPDFDuOPPm73HtE8zpQZ_MHpfL5o" />
      </head>
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
