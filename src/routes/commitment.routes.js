'use strict';

const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const commitmentRepo = require('../repositories/commitment.repository');
const schoolTagRepo = require('../repositories/school-tag.repository');
const ResponseHandler = require('../handlers/response.handler');
const { addCommitmentSchema, addSchoolTagSchema } = require('../validators/sourcing.validator');

// ── Partner Commitments Router ─────────────────────────────────────────────────
const partnerCommitmentRouter = Router({ mergeParams: true });
partnerCommitmentRouter.use(authMiddleware);

// GET /api/partners/:partnerId/commitments
partnerCommitmentRouter.get('/:partnerId/commitments', async (req, res) => {
  try {
    const rows = await commitmentRepo.findByPartnerId(parseInt(req.params.partnerId));
    return ResponseHandler.success(res, rows);
  } catch (err) {
    console.error('[commitments.list]', err);
    return ResponseHandler.error(res, 'Failed to fetch commitments');
  }
});

// POST /api/partners/:partnerId/commitments
partnerCommitmentRouter.post('/:partnerId/commitments', async (req, res) => {
  try {
    const { error, value } = addCommitmentSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.error(res, error.details.map((d) => d.message).join(', '), 422);

    const commitment = await commitmentRepo.create({
      ...value,
      partner_id: parseInt(req.params.partnerId),
    });
    return ResponseHandler.success(res, commitment, 'Created successfully', 201);
  } catch (err) {
    console.error('[commitments.create]', err);
    return ResponseHandler.error(res, 'Failed to create commitment');
  }
});

// ── Commitment Router (by commitment ID) ──────────────────────────────────────
const commitmentRouter = Router();
commitmentRouter.use(authMiddleware);

// PATCH /api/commitments/:id
commitmentRouter.patch('/:id', async (req, res) => {
  try {
    const updated = await commitmentRepo.update(parseInt(req.params.id), req.body);
    return ResponseHandler.success(res, updated);
  } catch (err) {
    console.error('[commitments.update]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to update commitment', status);
  }
});

// DELETE /api/commitments/:id
commitmentRouter.delete('/:id', async (req, res) => {
  try {
    await commitmentRepo.softDelete(parseInt(req.params.id));
    return ResponseHandler.success(res, { deleted: true });
  } catch (err) {
    console.error('[commitments.delete]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to delete commitment', status);
  }
});

// ── School Tags Router ─────────────────────────────────────────────────────────
const partnerSchoolTagRouter = Router({ mergeParams: true });
partnerSchoolTagRouter.use(authMiddleware);

// GET /api/partners/:partnerId/school-tags
partnerSchoolTagRouter.get('/:partnerId/school-tags', async (req, res) => {
  try {
    const rows = await schoolTagRepo.findByPartnerId(parseInt(req.params.partnerId));
    return ResponseHandler.success(res, rows);
  } catch (err) {
    console.error('[school-tags.list]', err);
    return ResponseHandler.error(res, 'Failed to fetch school tags');
  }
});

// POST /api/partners/:partnerId/school-tags
partnerSchoolTagRouter.post('/:partnerId/school-tags', async (req, res) => {
  try {
    const { error, value } = addSchoolTagSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.error(res, error.details.map((d) => d.message).join(', '), 422);

    const tag = await schoolTagRepo.create({
      ...value,
      partner_id: parseInt(req.params.partnerId),
      tagged_by: String(req.user.user_id),
    });
    return ResponseHandler.success(res, tag, 'Created successfully', 201);
  } catch (err) {
    console.error('[school-tags.create]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to add school tag', status);
  }
});

// ── School Tag by ID Router ────────────────────────────────────────────────────
const schoolTagRouter = Router();
schoolTagRouter.use(authMiddleware);

// DELETE /api/school-tags/:id
schoolTagRouter.delete('/:id', async (req, res) => {
  try {
    await schoolTagRepo.softDelete(parseInt(req.params.id), req.user.user_id);
    return ResponseHandler.success(res, { deleted: true });
  } catch (err) {
    console.error('[school-tags.delete]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to delete school tag', status);
  }
});

module.exports = { partnerCommitmentRouter, commitmentRouter, partnerSchoolTagRouter, schoolTagRouter };
