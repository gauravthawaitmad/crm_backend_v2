'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/sourcing.controller');

const router = Router();
router.use(authMiddleware);

// List + Create
router.get('/',  ctrl.list);
router.post('/', ctrl.create);

// Single partner
router.get('/:id',           ctrl.detail);
router.patch('/:id/details', ctrl.updateDetails);
router.patch('/:id/stage',   ctrl.updateStage);
router.delete('/:id',        ctrl.remove);

// Commitments
router.get('/:id/commitments',  ctrl.listCommitments);
router.post('/:id/commitments', ctrl.addCommitment);
router.patch('/:id/commitments/:commitmentId', ctrl.updateCommitment);

// School tags — available MUST come before :schoolId param route
router.get('/:id/schools/available', ctrl.getAvailableSchools);
router.get('/:id/schools',           ctrl.listTaggedSchools);
router.post('/:id/schools',          ctrl.tagSchool);
router.delete('/:id/schools/:schoolId', ctrl.removeSchoolTag);

module.exports = router;
