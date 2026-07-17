import { loadGoogleAnalytics, disableGoogleAnalytics } from "./googleAnalytics";
import { loadMicrosoftClarity, disableMicrosoftClarity } from "./microsoftClarity";
import { loadMetaPixel, disableMetaPixel } from "./metaPixel";
import { loadLinkedInInsightTag, disableLinkedInInsightTag } from "./linkedInInsightTag";

export {
  loadGoogleAnalytics, disableGoogleAnalytics,
  loadMicrosoftClarity, disableMicrosoftClarity,
  loadMetaPixel, disableMetaPixel,
  loadLinkedInInsightTag, disableLinkedInInsightTag,
};

/**
 * Registry mapping each consent category to its providers. To add a new
 * provider: write a `services/providers/<name>.js` exporting `load<Name>()`
 * (and optionally `disable<Name>()`), then add it to the matching array
 * below — nothing else needs to change, ConsentScriptLoader picks it up
 * automatically.
 *
 * Note: GTM (GTM-W8C8PFTK) is loaded directly in layout.jsx <head> so it
 * fires on every page without waiting for consent — per Google's recommended
 * implementation. Remove it from this registry to avoid double-loading.
 */
export const ANALYTICS_PROVIDERS = [
  { load: loadGoogleAnalytics, disable: disableGoogleAnalytics },
  { load: loadMicrosoftClarity, disable: disableMicrosoftClarity },
];

export const MARKETING_PROVIDERS = [
  { load: loadMetaPixel, disable: disableMetaPixel },
  { load: loadLinkedInInsightTag, disable: disableLinkedInInsightTag },
];
