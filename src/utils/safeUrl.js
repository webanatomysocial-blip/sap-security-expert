// Allow only web, mail, phone and in-site URLs for user-supplied links.
// Anything else (javascript:, data:, vbscript:, ...) becomes "#".
export function safeUrl(value) {
  if (typeof value !== "string") return "#";
  const v = value.trim();
  if (!v) return "#";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(v)) return v;
  if (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) return v;
  // A bare domain typed into a profile field (e.g. "linkedin.com/in/x").
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v) && !v.startsWith("/") && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(v)) return `https://${v}`;
  return "#";
}

// In-site path only (e.g. a post-login redirect). Never an external or script URL.
export function safeInternalPath(value, fallback = "/") {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") && ![...v].some((c) => c.charCodeAt(0) < 32)) return v;
  return fallback;
}
