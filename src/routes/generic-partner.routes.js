'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const partnerController = require('../controllers/partner.controller');

const router = Router();
router.use(authMiddleware);

// NOTE: Route order matters — specific string routes before :id param routes

// GET /api/partners/:entityType/list
router.get('/:entityType/list', partnerController.list);

// GET /api/partners/:entityType/:id
router.get('/:entityType/:id', partnerController.detail);

// POST /api/partners/:entityType/create
router.post('/:entityType/create', partnerController.create);

// PATCH /api/partners/:id/stage
router.patch('/:id/stage', partnerController.updateStage);

// PATCH /api/partners/:id/reactivate
router.patch('/:id/reactivate', partnerController.reactivate);

// PATCH /api/partners/:id/detail (update type-specific detail fields)
router.patch('/:id/detail', partnerController.updateDetail);

module.exports = router;
