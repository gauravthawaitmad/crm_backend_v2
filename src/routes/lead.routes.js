/**
 * lead.routes.js
 *
 * All routes are protected by authMiddleware.
 * PATCH uses multer (memoryStorage) to support optional MOU file upload
 * on the 'converted' stage — multer populates req.file when present.
 */

const { Router } = require('express');
const multer = require('multer');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermission, requireViewPermission } = require('../middlewares/rbac.middleware');
const leadController = require('../controllers/lead.controller');

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All lead routes require authentication
router.use(authMiddleware);

// GET /api/leads       — paginated list (role-filtered in service)
router.get('/', requireViewPermission('lead'), leadController.list);

// GET /api/leads/export — CSV download (MUST be before /:id to avoid Express treating 'export' as id)
router.get('/export', requireViewPermission('lead'), leadController.exportLeads);

// GET /api/leads/:id   — lead detail with tracking history
router.get('/:id', requireViewPermission('lead'), leadController.detail);

// POST /api/leads      — create new lead
router.post('/', requirePermission('lead', 'create'), leadController.create);

// PATCH /api/leads/:id — update conversion stage
// upload.single('mou_document') is optional: only 'converted' stage sends a file
router.patch(
  '/:id',
  requirePermission('lead', 'edit'),
  upload.single('mou_document'),
  leadController.update
);

// DELETE /api/leads/:id — soft-delete (admin+ only)
router.delete('/:id', requirePermission('lead', 'delete'), leadController.remove);

module.exports = router;
