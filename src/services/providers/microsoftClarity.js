import { loadScript } from "../../utils/loadScript";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "";
const SCRIPT_ID = "consent-clarity-script";

/** Microsoft Clarity. No-ops if NEXT_PUBLIC_CLARITY_PROJECT_ID isn't set. */
export async function loadMicrosoftClarity() {
  if (!CLARITY_PROJECT_ID) return false;

  return loadScript({
    id: SCRIPT_ID,
    innerHTML: `
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
    `,
  });
}

/** Clarity's documented consent API — stops future session recording/collection. */
export function disableMicrosoftClarity() {
  if (typeof window !== "undefined" && window.clarity) {
    window.clarity("consent", false);
  }
}
