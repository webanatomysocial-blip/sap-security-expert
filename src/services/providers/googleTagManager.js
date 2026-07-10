import { loadScript } from "../../utils/loadScript";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
const SCRIPT_ID = "consent-gtm-script";

/** Google Tag Manager. No-ops if NEXT_PUBLIC_GTM_ID isn't set. */
export async function loadGoogleTagManager() {
  if (!GTM_ID) return false;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  return loadScript({
    id: SCRIPT_ID,
    src: `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`,
  });
}

/**
 * GTM has no built-in "unload" — the recommended pattern is pushing a
 * dataLayer event your GTM container's tags/triggers are configured to
 * respect (e.g. a trigger that blocks firing when this flag is true).
 */
export function disableGoogleTagManager() {
  if (typeof window !== "undefined" && window.dataLayer) {
    window.dataLayer.push({ event: "consent_marketing_denied" });
  }
}
