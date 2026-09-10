// Wraps an async route handler so any thrown/rejected error is forwarded
// to Express's error middleware instead of crashing the process or
// requiring a try/catch in every single controller function.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default asyncHandler;
