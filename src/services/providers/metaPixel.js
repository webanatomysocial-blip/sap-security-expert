import { loadScript } from "../../utils/loadScript";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";
const SCRIPT_ID = "consent-meta-pixel-script";

/** Meta (Facebook) Pixel. No-ops if NEXT_PUBLIC_META_PIXEL_ID isn't set. */
export async function loadMetaPixel() {
  if (!PIXEL_ID) return false;

  return loadScript({
    id: SCRIPT_ID,
    innerHTML: `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${PIXEL_ID}');
      fbq('track', 'PageView');
    `,
  });
}

/** Meta Pixel's documented consent API. */
export function disableMetaPixel() {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq("consent", "revoke");
  }
}
