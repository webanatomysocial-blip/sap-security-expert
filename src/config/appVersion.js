/**
 * Application version — MAJOR.MINOR.PATCH (semantic versioning)
 *
 * Bump rules:
 *   PATCH (x.y.Z): bug fixes, copy changes, minor tweaks
 *   MINOR (x.Y.0): new features, 10%+ UI/design changes, new sections
 *   MAJOR (X.0.0): full redesigns, platform-level architectural changes
 *
 * Current platform is v3 (third full generation of the product).
 */
export const APP_VERSION = '3.0.0';

export const VERSION_RULES = {
  blog: {
    patch: 'No change — < 10% content update',
    minor: '10–49% content change → e.g. 1.0 → 1.1',
    major: '50%+ content change → e.g. 1.3 → 2.0',
  },
  app: {
    patch: 'Bug fix / copy / minor tweak → x.y.Z',
    minor: 'New feature / 10%+ UI change → x.Y.0',
    major: 'Full redesign / platform change → X.0.0',
  },
};
