import { useEffect, useRef } from "react";
import { useConsent } from "../hooks/useConsent";
import { ANALYTICS_PROVIDERS, MARKETING_PROVIDERS } from "../services/providers";

/**
 * Mounted once at the app root (see AppWrapper.jsx) — not per-page, so it
 * survives SPA route changes and never re-injects scripts on navigation.
 * Reacts to consent changes (via useConsent) and loads/disables every
 * registered provider for a category the instant the user accepts/rejects,
 * with no page refresh required.
 *
 * Renders nothing — this is a behavior-only component.
 */
export default function ConsentScriptLoader() {
  const { consent } = useConsent();
  const loadedAnalytics = useRef(false);
  const loadedMarketing = useRef(false);

  useEffect(() => {
    if (consent.analytics) {
      if (!loadedAnalytics.current) {
        ANALYTICS_PROVIDERS.forEach((p) => p.load());
        loadedAnalytics.current = true;
      }
    } else if (loadedAnalytics.current) {
      // Downgrade from accepted -> rejected: instruct already-loaded
      // providers to stop collecting (can't un-inject a script, but the
      // real consent APIs — GA's consent mode, Clarity's consent(false),
      // etc. — cover "stop sending new events" going forward).
      ANALYTICS_PROVIDERS.forEach((p) => p.disable?.());
      loadedAnalytics.current = false;
    }
  }, [consent.analytics]);

  useEffect(() => {
    if (consent.marketing) {
      if (!loadedMarketing.current) {
        MARKETING_PROVIDERS.forEach((p) => p.load());
        loadedMarketing.current = true;
      }
    } else if (loadedMarketing.current) {
      MARKETING_PROVIDERS.forEach((p) => p.disable?.());
      loadedMarketing.current = false;
    }
  }, [consent.marketing]);

  return null;
}
