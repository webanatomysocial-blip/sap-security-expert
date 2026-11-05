// Strips secrets from a URL before it is written to logs. Download links carry a
// one-time token in the query string; that token must never end up in log files.
const SECRET_PARAM = /([?&](?:token|csrf_token|secret|x-csrf-token)=)[^&#]*/gi;
function redactUrl(url) {
  if (typeof url !== 'string') return '';
  return url.replace(SECRET_PARAM, '$1[redacted]');
}
module.exports = { redactUrl };
