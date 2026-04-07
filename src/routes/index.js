const { Router } = require('express');
const authRoutes = require('./auth.routes');
const { partnerCommentRouter, commentRouter } = require('./comment.routes');
const { partnerInteractionRouter, interactionRouter, followupRouter } = require('./interaction.routes');
const { partnerCommitmentRouter, commitmentRouter, partnerSchoolTagRouter, schoolTagRouter } = require('./commitment.routes');

const router = Router();

router.use('/auth', authRoutes);

// Phase 3+ — school leads + organizations
router.use('/leads',         require('./lead.routes'));
router.use('/organizations', require('./organization.routes'));
router.use('/pocs',          require('./poc.routes'));
router.use('/dashboard',     require('./dashboard.routes'));
router.use('/reference',     require('./reference.routes'));

// Comments (school + all types)
router.use('/partners', partnerCommentRouter);
router.use('/comments', commentRouter);

// Phase B — Interactions + Follow-ups + Notifications
router.use('/partners',      partnerInteractionRouter);
router.use('/interactions',  interactionRouter);
router.use('/dashboard',     followupRouter);          // adds GET /dashboard/followups
router.use('/notifications', require('./notification.routes'));

// Phase D — Commitments + School Tags
router.use('/partners',     partnerCommitmentRouter);
router.use('/commitments',  commitmentRouter);
router.use('/partners',     partnerSchoolTagRouter);
router.use('/school-tags',  schoolTagRouter);

// Phase D — Sourcing Module (dedicated /api/sourcing/* routes)
router.use('/sourcing', require('./sourcing.routes'));

// Phase E — Funder Module (BEFORE generic-partner routes)
router.use('/funders', require('./funder.routes'));

// Phase F — Vendor Module (BEFORE generic-partner routes)
router.use('/vendors', require('./vendor.routes'));

// Generic partner routes (list by entity type, detail, stage update, reactivate)
// NOTE: mounted AFTER all specific /partners/* routes to avoid conflicts
router.use('/partners',      require('./generic-partner.routes'));

module.exports = router;
