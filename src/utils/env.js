// Environment variable resolver compatible with both Vite and Next.js

const getEnv = (key, fallback = "") => {
  if (typeof process !== "undefined" && process.env) {
    if (process.env[key]) return process.env[key];
    if (process.env[`NEXT_PUBLIC_${key}`]) return process.env[`NEXT_PUBLIC_${key}`];
  }

  try {
    // Dynamic property access to prevent compilation crashes on missing import.meta
    const metaEnv = (import.meta).env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch (e) {
    // Fail silently
  }

  return fallback;
};

export const VITE_API_URL = getEnv("VITE_API_URL", "/api");
// Referenced by literal name so Next.js inlines NEXT_PUBLIC_SITE_URL into the
// client bundle. getEnv()'s dynamic process.env[key] lookup is NOT inlined in
// the browser, which left client-side SEO (SEO.jsx) rewriting every page's
// canonical to the http:// fallback after hydration.
export const VITE_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  getEnv("VITE_SITE_URL", "https://sapsecurityexpert.com")
).replace(/^http:\/\/(?!localhost(?::|\/)|127\.0\.0\.1(?::|\/))/, "https://").replace(/\/$/, "");
export const DEV = typeof process !== "undefined" 
  ? process.env.NODE_ENV === "development" 
  : getEnv("DEV", false);
