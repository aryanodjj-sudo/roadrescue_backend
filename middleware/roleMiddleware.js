// Usage: router.get("/admin/users", protect, authorize("admin"), handler)
// Must run AFTER authMiddleware's `protect`, since it relies on req.user.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized, no user on request");
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Role '${req.user.role}' is not permitted to access this resource`
      );
    }

    next();
  };
}

export default authorize;
