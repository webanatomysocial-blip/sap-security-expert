import React from "react";
import { Helmet } from "react-helmet-async";

const SEO = ({
  title,
  description,
  image,
  url,
  type = "website",
  keywords,
  author,
  schemaData,
}) => {
  const siteTitle = "SAP Security Expert";
  const fullTitle = title || siteTitle;
  const domain =
    import.meta.env.VITE_SITE_URL || "https://sapsecurityexpert.com";

  const getAbsoluteUrl = (path) => {
    if (!path) return `${domain}/assets/fav.png`;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${domain}${path}`;
    return `${domain}/${path}`;
  };

  const defaults = {
    title: "SAP Security Expert",
    description:
      "The leading community for SAP Security, GRC, and BTP professionals.",
    image: `${domain}/assets/fav.png`,
    url: domain,
    author: "SAP Security Expert",
  };

  const meta = {
    title: fullTitle,
    description: description || defaults.description,
    image: getAbsoluteUrl(image),
    url: url || defaults.url,
    type: type,
    keywords:
      keywords ||
      "SAP Security, SAP GRC, SAP BTP, SAP Licensing, SAP Cybersecurity",
    author: author || defaults.author,
  };

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="author" content={meta.author} />
      <link rel="canonical" href={meta.url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={meta.type} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:image" content={meta.image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={meta.url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={meta.image} />

      {/* JSON-LD Structured Data */}
      {schemaData && (
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      )}
    </Helmet>
  );
};

export default SEO;
