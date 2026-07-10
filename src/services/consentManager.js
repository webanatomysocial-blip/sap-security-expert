/**
 * Centralized consent manager.
 *
 * Single source of truth for the `cookie_consent` localStorage record the
 * CookieConsent banner already writes. Everything that needs to know
 * "is analytics/marketing allowed" — now or reactively when the user changes
 * their choice later — should go through this module, not read
 * localStorage directly.
 *
 * @typedef {Object} ConsentRecord
 * @property {boolean} essential - always true, cannot be disabled
 * @property {boolean} analytics
 * @property {boolean} marketing
 * @property {number} [timestamp]
 */

const STORAGE_KEY = "cookie_consent";
const CHANGE_EVENT = "consentchange";

const DEFAULT_CONSENT = { essential: true, analytics: false, marketing: false };

/** @returns {ConsentRecord} */
export function getConsent() {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONSENT;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONSENT, ...parsed, essential: true };
  } catch {
    return DEFAULT_CONSENT;
  }
}

/** Whether the user has an actual saved choice yet (banner dismissed). */
export function hasConsentDecision() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function hasAnalyticsConsent() {
  return getConsent().analytics === true;
}

export function hasMarketingConsent() {
  return getConsent().marketing === true;
}

/**
 * Persists a consent choice and notifies every subscriber (this tab included —
 * the native `storage` event only fires in *other* tabs, so this dispatches
 * its own event to make same-tab reactivity work, which is what lets
 * Accept/Reject apply instantly without a page refresh).
 * @param {Partial<ConsentRecord>} partial
 */
export function setConsent(partial) {
  const next = {
    ...DEFAULT_CONSENT,
    ...partial,
    essential: true,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  }
  return next;
}

/**
 * Subscribes to consent changes (same-tab custom event + cross-tab storage
 * event). Returns an unsubscribe function.
 * @param {(consent: ConsentRecord) => void} callback
 */
export function subscribeToConsent(callback) {
  if (typeof window === "undefined") return () => {};

  const handleCustom = (e) => callback(e.detail || getConsent());
  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY) callback(getConsent());
  };

  window.addEventListener(CHANGE_EVENT, handleCustom);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleCustom);
    window.removeEventListener("storage", handleStorage);
  };
}

export { STORAGE_KEY as CONSENT_STORAGE_KEY };
