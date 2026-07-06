// Wraps an async route/controller handler so a rejected promise reaches
// Express's error-handling middleware via next(err), instead of needing a
// try/catch block in every single route.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
