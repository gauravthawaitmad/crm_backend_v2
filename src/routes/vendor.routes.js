'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/vendor.controller');

const router = Router();
router.use(authMiddleware);

// Export (BEFORE /:id to avoid conflict)
router.get('/export', ctrl.exportVendors);

// Engagement routes with no vendor ID (BEFORE /:id param)
router.delete('/engagements/:engagementId', ctrl.deleteEngagement);
router.patch('/engagements/:engagementId',  ctrl.updateEngagement);

// List + Create
router.get('/',  ctrl.list);
router.post('/', ctrl.create);

// Single vendor
router.get('/:id',           ctrl.detail);
router.patch('/:id/details', ctrl.updateDetails);
router.patch('/:id/stage',   ctrl.updateStage);
router.delete('/:id',        ctrl.remove);
router.post('/:id/contract', ctrl.uploadMiddleware, ctrl.uploadContract);

// Engagements per vendor
router.get('/:id/engagements',  ctrl.listEngagements);
router.post('/:id/engagements', ctrl.addEngagement);

module.exports = router;
