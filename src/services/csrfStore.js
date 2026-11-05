// CSRF token kept in memory only. It is re-issued by the server's session check on
// every page load, so it does not need to survive a reload — and nothing that can
// outlive the tab (localStorage) holds it.
let csrfToken = null;

try { window.localStorage.removeItem("csrf_token"); } catch { /* storage unavailable */ }

export const getCsrfToken = () => csrfToken;
export const setCsrfToken = (token) => { csrfToken = token || null; };
export const clearCsrfToken = () => { csrfToken = null; };
