/**
 * Dynamically injects a <script> tag, de-duplicated by id — calling this
 * twice with the same id (e.g. on SPA route changes) is a safe no-op the
 * second time, it just resolves immediately against the existing script.
 *
 * @param {Object} opts
 * @param {string} opts.id - unique id for the <script> tag (dedup key)
 * @param {string} [opts.src] - external script URL
 * @param {string} [opts.innerHTML] - inline script body (used instead of src)
 * @param {boolean} [opts.async=true]
 * @param {Object} [opts.attrs] - extra attributes to set on the tag
 * @returns {Promise<boolean>} resolves true on load, false on error
 */
export function loadScript({ id, src, innerHTML, async = true, attrs = {} }) {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(false); // SSR guard

    const existing = document.getElementById(id);
    if (existing) {
      // Already injected (e.g. a previous SPA navigation) — nothing to do.
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));

    if (innerHTML) {
      script.innerHTML = innerHTML;
      document.head.appendChild(script);
      resolve(true);
      return;
    }

    script.src = src;
    script.async = async;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/** Removes a previously injected script by id, if present. */
export function removeScript(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
}
