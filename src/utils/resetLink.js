// Reads the password-reset token and email from the page address.
//
// Preferred: the URL fragment (#token=...&email=...). The browser never sends the fragment to
// the server, so it stays out of Nginx and application logs.
// Legacy: ?token=...&email=... from reset emails sent before the fragment change. Still accepted
// so in-flight links keep working; `legacy: true` tells the page to move the values into the
// fragment and drop them from the address bar. Remove this branch once no emails issued before
// the change remain valid (reset links expire after 60 minutes).
export function readResetParams(search, hash) {
  const fromHash = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  if (fromHash.get("token")) {
    return { token: fromHash.get("token"), email: fromHash.get("email") || "", legacy: false };
  }
  const fromQuery = new URLSearchParams(String(search || ""));
  if (fromQuery.get("token")) {
    return { token: fromQuery.get("token"), email: fromQuery.get("email") || "", legacy: true };
  }
  return { token: "", email: "", legacy: false };
}

export function resetFragment(token, email) {
  return `#${new URLSearchParams({ token, email }).toString()}`;
}
