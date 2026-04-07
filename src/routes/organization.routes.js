/**
 * organization.routes.js
 *
 * All routes are auth-protected.
 * POST /:id/renew-mou uses multer for file upload.
 * POST /reallocate sends JSON body.
 */

const { Router } = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermission, requireViewPermission } = require('../middlewares/rbac.middleware');
const orgController = require('../controllers/organization.controller');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

// GET  /api/organizations          — paginated list (role-filtered)
router.get('/', requireViewPermission('organization'), orgController.list);

// GET /api/organizations/export — CSV download (MUST be before /:id)
router.get('/export', requireViewPermission('organization'), orgController.exportOrganizations);

// GET  /api/organizations/:id      — full detail with MOU history
router.get('/:id', requireViewPermission('organization'), orgController.detail);

// POST /api/organizations/:id/renew-mou — MOU renewal (file upload required)
router.post(
  '/:id/renew-mou',
  requirePermission('organization', 'renew_mou'),
  upload.single('mou_document'),
  orgController.renewMou
);

// POST /api/organizations/reallocate — reassign CO (JSON body)
router.post(
  '/reallocate',
  requirePermission('organization', 'reallocate'),
  orgController.reallocateCo
);

// DELETE /api/organizations/:id    — soft-delete
router.delete('/:id', requirePermission('organization', 'delete'), orgController.remove);

module.exports = router;
