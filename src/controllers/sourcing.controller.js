'use strict';

const ResponseHandler = require('../handlers/response.handler');
const sourcingSvc = require('../services/sourcing.service');
const {
  createSourcingSchema,
  updateDetailsSchema,
  updateStageSchema,
  addNewCommitmentSchema,
  updateCommitmentSchema,
  listQuerySchema,
} = require('../validators/sourcing.validator');

function validate(schema, data, res) {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    ResponseHandler.error(res, error.details.map((d) => d.message).join(', '), 422);
    return null;
  }
  return value;
}

async function list(req, res) {
  try {
    const query = validate(listQuerySchema, req.query, res);
    if (!query) return;
    const result = await sourcingSvc.getSourcingList(
      req.user.user_id, req.user.user_role, query
    );
    const totalPages = Math.ceil(result.count / query.limit);
    return ResponseHandler.paginated(res, result.rows, {
      page: query.page, limit: query.limit,
      total: result.count, totalPages,
    });
  } catch (err) {
    console.error('[sourcing.list]', err);
    return ResponseHandler.error(res, 'Failed to fetch sourcing partners');
  }
}

async function detail(req, res) {
  try {
    const partner = await sourcingSvc.getSourcingById(parseInt(req.params.id));
    if (!partner) return ResponseHandler.error(res, 'Sourcing partner not found', 404);
    return ResponseHandler.success(res, partner);
  } catch (err) {
    console.error('[sourcing.detail]', err);
    return ResponseHandler.error(res, 'Failed to fetch sourcing partner');
  }
}

async function create(req, res) {
  try {
    const body = validate(createSourcingSchema, req.body, res);
    if (!body) return;
    const partner = await sourcingSvc.createSourcing(body, req.user.user_id);
    return res.status(201).json({ success: true, result: { id: partner.id, name: partner.partner_name } });
  } catch (err) {
    console.error('[sourcing.create]', err);
    return ResponseHandler.error(res, err.message || 'Failed to create sourcing partner');
  }
}

async function updateDetails(req, res) {
  try {
    const body = validate(updateDetailsSchema, req.body, res);
    if (!body) return;
    const updated = await sourcingSvc.updateSourcingDetails(
      parseInt(req.params.id), body, req.user.user_id
    );
    return ResponseHandler.success(res, updated);
  } catch (err) {
    console.error('[sourcing.updateDetails]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to update details', status);
  }
}

async function updateStage(req, res) {
  try {
    const body = validate(updateStageSchema, req.body, res);
    if (!body) return;
    const result = await sourcingSvc.updateStage(
      req.params.id, body.stage, body, req.user.user_id
    );
    return ResponseHandler.success(res, result);
  } catch (err) {
    console.error('[sourcing.updateStage]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to update stage', status);
  }
}

async function addCommitment(req, res) {
  try {
    const body = validate(addNewCommitmentSchema, req.body, res);
    if (!body) return;
    const commitment = await sourcingSvc.addCommitment(
      req.params.id, body, req.user.user_id
    );
    return res.status(201).json({ success: true, result: commitment });
  } catch (err) {
    console.error('[sourcing.addCommitment]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to add commitment', status);
  }
}

async function listCommitments(req, res) {
  try {
    const rows = await sourcingSvc.listCommitments(req.params.id);
    return ResponseHandler.success(res, rows);
  } catch (err) {
    console.error('[sourcing.listCommitments]', err);
    return ResponseHandler.error(res, 'Failed to fetch commitments');
  }
}

async function tagSchool(req, res) {
  try {
    const { school_partner_id } = req.body;
    if (!school_partner_id) return ResponseHandler.error(res, 'school_partner_id is required', 400);
    const tag = await sourcingSvc.tagSchool(
      req.params.id, school_partner_id, req.user.user_id
    );
    return res.status(201).json({ success: true, result: tag });
  } catch (err) {
    console.error('[sourcing.tagSchool]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to tag school', status);
  }
}

async function removeSchoolTag(req, res) {
  try {
    await sourcingSvc.removeSchoolTag(req.params.id, req.params.schoolId);
    return ResponseHandler.success(res, { removed: true });
  } catch (err) {
    console.error('[sourcing.removeSchoolTag]', err);
    return ResponseHandler.error(res, 'Failed to remove school tag');
  }
}

async function listTaggedSchools(req, res) {
  try {
    const rows = await sourcingSvc.getTaggedSchools(req.params.id);
    return ResponseHandler.success(res, rows);
  } catch (err) {
    console.error('[sourcing.listTaggedSchools]', err);
    return ResponseHandler.error(res, 'Failed to fetch tagged schools');
  }
}

async function getAvailableSchools(req, res) {
  try {
    const rows = await sourcingSvc.getAvailableSchools(req.query.search);
    return ResponseHandler.success(res, rows);
  } catch (err) {
    console.error('[sourcing.getAvailableSchools]', err);
    return ResponseHandler.error(res, 'Failed to fetch available schools');
  }
}

async function remove(req, res) {
  try {
    await sourcingSvc.deleteSourcing(parseInt(req.params.id), req.user.user_role);
    return ResponseHandler.success(res, { deleted: true });
  } catch (err) {
    console.error('[sourcing.remove]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to delete', status);
  }
}

async function updateCommitment(req, res) {
  try {
    const body = validate(updateCommitmentSchema, req.body, res);
    if (!body) return;
    const updated = await sourcingSvc.updateCommitment(
      req.params.id, req.params.commitmentId, body
    );
    return ResponseHandler.success(res, updated);
  } catch (err) {
    console.error('[sourcing.updateCommitment]', err);
    const status = err.statusCode || 500;
    return ResponseHandler.error(res, err.message || 'Failed to update commitment', status);
  }
}

module.exports = {
  list, detail, create, updateDetails, updateStage,
  addCommitment, listCommitments, updateCommitment,
  tagSchool, removeSchoolTag, listTaggedSchools, getAvailableSchools,
  remove,
};
