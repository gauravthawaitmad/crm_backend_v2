'use strict';

const ResponseHandler = require('../handlers/response.handler');
const partnerSvc = require('../services/partner.service');
const sourcingSvc = require('../services/sourcing.service');
const {
  createSourcingSchema,
  updateSourcingDetailSchema,
  updateStageSchema,
} = require('../validators/sourcing.validator');

const VALID_ENTITY_TYPES = ['school', 'sourcing', 'funder', 'vendor'];

// ── List ───────────────────────────────────────────────────────────────────────

async function list(req, res) {
  try {
    const { entityType } = req.params;
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return ResponseHandler.error(res, `Invalid entity type: ${entityType}`, 400);
    }

    const { page = 1, limit = 20, search, stage } = req.query;
    const { user_id: userId, user_role: userRole } = req.user;

    if (entityType === 'sourcing') {
      const result = await sourcingSvc.getSourcingList({
        page: Number(page),
        limit: Number(limit),
        search,
        stage,
        userId,
        userRole,
      });
      const totalPages = Math.ceil(result.count / Number(limit));
      return ResponseHandler.paginated(res, result.rows, {
        page: Number(page),
        limit: Number(limit),
        total: result.count,
        totalPages,
      });
    }

    // Other entity types not yet implemented
    return ResponseHandler.paginated(res, [], { page: Number(page), limit: Number(limit), total: 0, totalPages: 0 });
  } catch (err) {
    console.error('[partner.controller.list]', err);
    return ResponseHandler.error(res, 'Failed to list partners');
  }
}

// ── Detail ─────────────────────────────────────────────────────────────────────

async function detail(req, res) {
  try {
    const { entityType, id } = req.params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return ResponseHandler.error(res, 'Invalid partner ID', 400);
    }

    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return ResponseHandler.error(res, `Invalid entity type: ${entityType}`, 400);
    }

    const { user_id: userId, user_role: userRole } = req.user;

    if (entityType === 'sourcing') {
      const partner = await sourcingSvc.getSourcingById(numericId, userId, userRole);
      if (!partner) return ResponseHandler.error(res, 'Partner not found', 404);
      return ResponseHandler.success(res, partner);
    }

    return ResponseHandler.error(res, `Detail for ${entityType} — not yet implemented`, 501);
  } catch (err) {
    console.error('[partner.controller.detail]', err);
    return ResponseHandler.error(res, 'Failed to fetch partner');
  }
}

// ── Create ─────────────────────────────────────────────────────────────────────

async function create(req, res) {
  try {
    const { entityType } = req.params;
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      return ResponseHandler.error(res, `Invalid entity type: ${entityType}`, 400);
    }

    const { user_id: userId } = req.user;

    if (entityType === 'sourcing') {
      const { error, value } = createSourcingSchema.validate(req.body, { abortEarly: false });
      if (error) return ResponseHandler.error(res, error.details.map((d) => d.message).join(', '), 422);

      const partner = await sourcingSvc.createSourcingPartner(value, userId);
      return ResponseHandler.success(res, { id: partner.id, partner_name: partner.partner_name }, 'Created successfully', 201);
    }

    return ResponseHandler.error(res, `Create ${entityType} — not yet implemented`, 501);
  } catch (err) {
    console.error('[partner.controller.create]', err);
    return ResponseHandler.error(res, 'Failed to create partner');
  }
}

// ── Update Stage ───────────────────────────────────────────────────────────────

async function updateStage(req, res) {
  try {
    const { id } = req.params;
    const { user_id: userId } = req.user;

    const { error, value } = updateStageSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.error(res, error.details.map((d) => d.message).join(', '), 422);

    // Fetch partner to get its entity type
    const existing = await partnerSvc.getPartnerById(parseInt(id));
    if (!existing) return ResponseHandler.error(res, 'Partner not found', 404);

    const extra = {};
    if (value.drop_reason) extra.extra_data = { drop_reason: value.drop_reason };
    if (value.notes) extra.non_conversion_reason = value.notes;

    const agreement = await partnerSvc.updateStage(
      parseInt(id),
      value.stage,
      extra,
      userId,
      existing.entity_type
    );
    return ResponseHandler.success(res, agreement);
  } catch (err) {
    console.error('[partner.controller.updateStage]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to update stage', status);
  }
}

// ── Reactivate ─────────────────────────────────────────────────────────────────

async function reactivate(req, res) {
  try {
    const { id } = req.params;
    const { user_id: userId } = req.user;

    const agreement = await partnerSvc.reactivate(parseInt(id), userId);
    return ResponseHandler.success(res, agreement);
  } catch (err) {
    console.error('[partner.controller.reactivate]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to reactivate partner', status);
  }
}

// ── Update Sourcing Detail ──────────────────────────────────────────────────────

async function updateDetail(req, res) {
  try {
    const { id } = req.params;
    const { user_id: userId } = req.user;

    const { error, value } = updateSourcingDetailSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.error(res, error.details.map((d) => d.message).join(', '), 422);

    const partner = await sourcingSvc.updateSourcingDetail(parseInt(id), value, userId);
    return ResponseHandler.success(res, partner);
  } catch (err) {
    console.error('[partner.controller.updateDetail]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to update partner detail', status);
  }
}

module.exports = { list, detail, create, updateStage, reactivate, updateDetail };
