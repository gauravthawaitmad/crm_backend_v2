'use strict';

const { Router }       = require('express');
const authMiddleware   = require('../middlewares/auth.middleware');
const interactionCtrl  = require('../controllers/interaction.controller');

// ── Router mounted at /api/partners ───────────────────────────────────────────
// GET  /api/partners/:partnerId/interactions
// POST /api/partners/:partnerId/interactions

const partnerInteractionRouter = Router({ mergeParams: true });
partnerInteractionRouter.use(authMiddleware);
partnerInteractionRouter.get('/:partnerId/interactions',  interactionCtrl.list);
partnerInteractionRouter.post('/:partnerId/interactions', interactionCtrl.create);

// ── Router mounted at /api/interactions ───────────────────────────────────────
// PATCH  /api/interactions/:id
// DELETE /api/interactions/:id
// PATCH  /api/interactions/:id/followup-done

const interactionRouter = Router();
interactionRouter.use(authMiddleware);
interactionRouter.patch('/:id/followup-done', interactionCtrl.markFollowUpDone); // before /:id
interactionRouter.patch('/:id',               interactionCtrl.update);
interactionRouter.delete('/:id',              interactionCtrl.remove);

// ── Router mounted at /api/dashboard ─────────────────────────────────────────
// GET /api/dashboard/followups

const followupRouter = Router();
followupRouter.use(authMiddleware);
followupRouter.get('/followups', interactionCtrl.getFollowUps);

module.exports = { partnerInteractionRouter, interactionRouter, followupRouter };
