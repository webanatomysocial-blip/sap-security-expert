import { loadScript } from "../../utils/loadScript";

const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "";
const SCRIPT_ID = "consent-clarity-script";

/** Microsoft Clarity. No-ops if NEXT_PUBLIC_CLARITY_PROJECT_ID isn't set. */
export async function loadMicrosoftClarity() {
  if (!CLARITY_PROJECT_ID) return false;

  // Set up the clarity queue programmatically — no inline <script> needed,
  // which avoids CSP nonce violations. The external script below initialises
  // itself when it loads and drains this queue.
  window.clarity = window.clarity || function () {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };

  return loadScript({
    id: SCRIPT_ID,
    src: `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`,
  });
}

/** Clarity's documented consent API — stops future session recording/collection. */
export function disableMicrosoftClarity() {
  if (typeof window !== "undefined" && window.clarity) {
    window.clarity("consent", false);
  }
}
