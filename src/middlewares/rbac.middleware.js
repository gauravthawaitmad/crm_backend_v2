const { can, canView } = require('../utils/permissions');

/**
 * Middleware factory: checks if user has permission to perform action on resource.
 * Must be used AFTER authMiddleware (requires req.user).
 *
 * Usage:
 *   router.patch('/:id', authMiddleware, requirePermission('lead', 'edit'), controller.update);
 *
 * @param {string} resource - e.g. 'lead', 'organization', 'poc'
 * @param {string} action   - e.g. 'create', 'edit', 'delete', 'view_own'
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    const userRole = req.user?.user_role;

    if (!userRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!can(userRole, resource, action)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to ${action} ${resource}`,
      });
    }

    next();
  };
}

/**
 * Gate for list/read endpoints — passes if user can view any scope (own/team/all).
 * The service layer then applies the correct scope filter.
 */
function requireViewPermission(resource) {
  return (req, res, next) => {
    const userRole = req.user?.user_role;

    if (!userRole) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    if (!canView(userRole, resource)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to view ${resource}`,
      });
    }

    next();
  };
}

module.exports = { requirePermission, requireViewPermission };
