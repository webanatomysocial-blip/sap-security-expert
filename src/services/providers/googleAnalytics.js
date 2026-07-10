import { loadScript } from "../../utils/loadScript";

// Next.js inlines NEXT_PUBLIC_ env vars at build time only via this exact
// literal `process.env.NEXT_PUBLIC_X` form — not through a dynamic/bracket
// lookup — so each provider file reads its own env var directly like this.
const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

const SCRIPT_ID = "consent-ga4-script";

/** Google Analytics 4 (gtag.js). No-ops if NEXT_PUBLIC_GA_MEASUREMENT_ID isn't set. */
export async function loadGoogleAnalytics() {
  if (!MEASUREMENT_ID) return false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

  const loaded = await loadScript({
    id: SCRIPT_ID,
    src: `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
  });
  if (!loaded) return false;

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, { anonymize_ip: true });
  return true;
}

/**
 * GA supports Consent Mode — rather than trying to physically remove the
 * script (not possible once it's set cookies/timers), tell it to stop
 * collecting. This is the documented, correct way to "revoke" GA consent.
 */
export function disableGoogleAnalytics() {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("consent", "update", { analytics_storage: "denied" });
  }
}
