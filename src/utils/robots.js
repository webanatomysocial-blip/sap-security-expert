// Robots directives for page metadata. ROBOTS_NOINDEX=true (DEV only) keeps the site out of
// search results. It matches the X-Robots-Tag header in next.config.js. Production leaves it unset.
export function robotsDirectives() {
  return process.env.ROBOTS_NOINDEX === 'true'
    ? { index: false, follow: false, noarchive: true }
    : { index: true, follow: true };
}
