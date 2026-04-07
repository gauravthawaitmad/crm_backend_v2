'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePermission, requireViewPermission } = require('../middlewares/rbac.middleware');
const pocController = require('../controllers/poc.controller');

const router = Router();

// All POC routes require authentication
router.use(authMiddleware);

// GET /api/pocs/all              — list all POCs across all partners (global POC page)
router.get('/all', requireViewPermission('poc'), pocController.listAll);

// GET /api/pocs?partner_id=:id   — list POCs for a partner
router.get('/', requireViewPermission('poc'), pocController.listByPartner);

// GET /api/pocs/:id              — single POC detail
router.get('/:id', requireViewPermission('poc'), pocController.detail);

// POST /api/pocs                 — create new POC
router.post('/', requirePermission('poc', 'create'), pocController.create);

// PATCH /api/pocs/:id            — update POC fields
router.patch('/:id', requirePermission('poc', 'edit'), pocController.update);

// DELETE /api/pocs/:id           — soft delete POC
router.delete('/:id', requirePermission('poc', 'delete'), pocController.remove);

// POST /api/pocs/:id/meetings?partner_id=:id  — add a follow-up meeting
router.post('/:id/meetings', requirePermission('poc', 'edit'), pocController.addMeeting);

module.exports = router;
