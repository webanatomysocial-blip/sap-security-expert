// Rotate the session ID on login so a pre-login (possibly planted) session
// cookie can't become an authenticated one (session fixation).
function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

module.exports = { regenerateSession };
