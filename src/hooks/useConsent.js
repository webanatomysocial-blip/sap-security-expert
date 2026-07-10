import { useState, useEffect, useCallback } from "react";
import {
  getConsent,
  setConsent as persistConsent,
  subscribeToConsent,
} from "../services/consentManager";

/**
 * React hook for reading and updating cookie consent. Re-renders reactively
 * whenever consent changes anywhere in the app (same tab or another tab),
 * so any component using this hook stays in sync without a page refresh.
 *
 * @returns {{
 *   consent: import("../services/consentManager").ConsentRecord,
 *   updateConsent: (partial: object) => void,
 *   hasAnalyticsConsent: () => boolean,
 *   hasMarketingConsent: () => boolean,
 * }}
 */
export function useConsent() {
  const [consent, setConsentState] = useState(getConsent);

  useEffect(() => {
    const unsubscribe = subscribeToConsent(setConsentState);
    return unsubscribe;
  }, []);

  const updateConsent = useCallback((partial) => {
    persistConsent(partial);
    // subscribeToConsent's own dispatch will also update state, but setting
    // it here too avoids a one-tick lag for the tab that made the change.
    setConsentState(getConsent());
  }, []);

  return {
    consent,
    updateConsent,
    hasAnalyticsConsent: () => consent.analytics === true,
    hasMarketingConsent: () => consent.marketing === true,
  };
}
