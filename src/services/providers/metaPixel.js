import { loadScript } from "../../utils/loadScript";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const SCRIPT_ID = "consent-meta-pixel-script";

/** Meta (Facebook) Pixel. No-ops if NEXT_PUBLIC_META_PIXEL_ID isn't set. */
export async function loadMetaPixel() {
  if (!PIXEL_ID) return false;

  // Bootstrap fbq() programmatically — avoids an inline <script> tag which
  // would be blocked by the nonce-based CSP. The fbevents.js external script
  // detects window.fbq already set and skips re-initialising.
  if (!window.fbq) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
  }

  const loaded = await loadScript({
    id: SCRIPT_ID,
    src: 'https://connect.facebook.net/en_US/fbevents.js',
  });
  if (!loaded) return false;

  window.fbq('init', PIXEL_ID);
  window.fbq('track', 'PageView');
  return true;
}

/** Meta Pixel's documented consent API. */
export function disableMetaPixel() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("consent", "revoke");
  }
}
