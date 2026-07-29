'use client';
import { useEffect } from "react";
import { VITE_SITE_URL } from "../utils/env";

// Updates existing <head> meta tags that Next.js generateMetadata placed during
// SSR. Never renders <title>/<meta> as JSX — in Next.js 15 + React 19, JSX
// metadata rendered inside a Client Component stays in <body>, not <head>.
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
  const domain = VITE_SITE_URL;

  const getAbsoluteUrl = (path) => {
    if (!path) return `${domain}/assets/fav.png`;
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return `${domain}${path}`;
    return `${domain}/${path}`;
  };

  const metaTitle       = title || "SAP Security Expert";
  const metaDescription = description || "The leading community for SAP Security, GRC, and BTP professionals.";
  const metaImage       = getAbsoluteUrl(image);
  const metaUrl         = url || domain;
  const metaKeywords    = keywords || "SAP Security, SAP GRC, SAP BTP, SAP Licensing, SAP Cybersecurity";
  const metaAuthor      = author || "SAP Security Expert";

  useEffect(() => {
    function setMeta(selector, attrKey, attrVal, content) {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attrKey, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    }
    function setLink(rel, href) {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
      el.setAttribute("href", href);
    }

    document.title = metaTitle;
    setMeta('meta[name="description"]',        "name",     "description",    metaDescription);
    setMeta('meta[name="keywords"]',           "name",     "keywords",       metaKeywords);
    setMeta('meta[name="author"]',             "name",     "author",         metaAuthor);
    setLink("canonical", metaUrl);

    setMeta('meta[property="og:site_name"]',   "property", "og:site_name",   "SAP Security Expert");
    setMeta('meta[property="og:type"]',        "property", "og:type",        type);
    setMeta('meta[property="og:url"]',         "property", "og:url",         metaUrl);
    setMeta('meta[property="og:title"]',       "property", "og:title",       metaTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", metaDescription);
    setMeta('meta[property="og:image"]',       "property", "og:image",       metaImage);

    setMeta('meta[name="twitter:card"]',        "name", "twitter:card",        "summary_large_image");
    setMeta('meta[name="twitter:url"]',         "name", "twitter:url",         metaUrl);
    setMeta('meta[name="twitter:title"]',       "name", "twitter:title",       metaTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", metaDescription);
    setMeta('meta[name="twitter:image"]',       "name", "twitter:image",       metaImage);
  }, [metaTitle, metaDescription, metaImage, metaUrl, type, metaKeywords, metaAuthor]);

  useEffect(() => {
    if (!schemaData) return;
    const id = "spa-page-schema";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schemaData);
    return () => { document.getElementById(id)?.remove(); };
  }, [schemaData]);

  return null;
};

export default SEO;
