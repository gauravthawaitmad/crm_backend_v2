'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/funder.controller');

const router = Router();
router.use(authMiddleware);

// List + Create
router.get('/',  ctrl.list);
router.post('/', ctrl.create);

// Single funder
router.get('/:id',           ctrl.detail);
router.patch('/:id/details', ctrl.updateDetails);
router.patch('/:id/stage',   ctrl.updateStage);
router.delete('/:id',        ctrl.remove);

// Commitments
router.get('/:id/commitments',                        ctrl.listCommitments);
router.post('/:id/commitments',                       ctrl.addCommitment);
router.patch('/:id/commitments/:commitmentId',        ctrl.updateCommitment);

// Deliverables — specific routes BEFORE /:id param routes
router.delete('/deliverables/:deliverableId',         ctrl.deleteDeliverable);
router.patch('/deliverables/:deliverableId',          ctrl.updateDeliverable);
router.post('/deliverables/:deliverableId/upload',    ctrl.uploadMiddleware, ctrl.uploadDeliverableDoc);
router.post('/:id/deliverables',                      ctrl.addDeliverable);

module.exports = router;
