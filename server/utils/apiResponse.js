// Thin response helpers matching this codebase's existing conventions
// ({ status: 'success', ...fields } / { status: 'error', message }).
// Not a shape change — every existing route already returns this envelope
// (except a few that return a bare array/object, which don't use this
// helper and are left exactly as they are).
function sendSuccess(res, payload = {}, status = 200) {
  return res.status(status).json({ status: 'success', ...payload });
}

function sendError(res, message, status = 400) {
  return res.status(status).json({ status: 'error', message });
}

module.exports = { sendSuccess, sendError };
