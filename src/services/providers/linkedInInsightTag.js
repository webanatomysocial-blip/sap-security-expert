import { loadScript } from "../../utils/loadScript";

const PARTNER_ID = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID || "";
const SCRIPT_ID = "consent-linkedin-insight-script";

/** LinkedIn Insight Tag. No-ops if NEXT_PUBLIC_LINKEDIN_PARTNER_ID isn't set. */
export async function loadLinkedInInsightTag() {
  if (!PARTNER_ID) return false;

  window._linkedin_partner_id = PARTNER_ID;
  window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
  window._linkedin_data_partner_ids.push(PARTNER_ID);

  return loadScript({
    id: SCRIPT_ID,
    src: "https://snap.licdn.com/li.lms-analytics/insight.min.js",
  });
}

/**
 * LinkedIn's Insight Tag has no documented public "revoke" call — once
 * loaded it can't be cleanly un-fired. The practical mitigation is simply
 * never calling loadLinkedInInsightTag() again and not pushing further
 * conversion events; this is a known platform limitation, not an oversight.
 */
export function disableLinkedInInsightTag() {
  // No-op — see comment above.
}
