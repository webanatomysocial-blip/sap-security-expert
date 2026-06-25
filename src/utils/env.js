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
export const VITE_SITE_URL = getEnv("VITE_SITE_URL", "http://dev.sapsecurityexpert.com");
export const DEV = typeof process !== "undefined" 
  ? process.env.NODE_ENV === "development" 
  : getEnv("DEV", false);
