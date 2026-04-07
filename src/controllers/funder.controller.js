'use strict';

const multer = require('multer');
const funderSvc = require('../services/funder.service');
const ResponseHandler = require('../handlers/response.handler');
const {
  createFunderSchema,
  updateDetailsSchema,
  updateStageSchema,
  addCommitmentSchema,
  updateCommitmentSchema,
  addDeliverableSchema,
  updateDeliverableSchema,
} = require('../validators/funder.validator');

const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.single('document');

function _handleError(res, err) {
  const status = err.statusCode || 500;
  return ResponseHandler.error(res, err.message || 'An error occurred', status);
}

// ── List ──────────────────────────────────────────────────────────────────────

exports.list = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, stage } = req.query;
    const p = parseInt(page);
    const l = parseInt(limit);
    const result = await funderSvc.getFunderList(req.user.user_id, req.user.user_role, {
      page: p, limit: l, search, stage,
    });
    const totalPages = Math.ceil(result.count / l);
    return ResponseHandler.paginated(res, result.rows, { page: p, limit: l, total: result.count, totalPages });
  } catch (err) {
    console.error('[funder.list]', err);
    return _handleError(res, err);
  }
};

// ── Detail ────────────────────────────────────────────────────────────────────

exports.detail = async (req, res) => {
  try {
    const funder = await funderSvc.getFunderById(req.params.id);
    if (!funder) return ResponseHandler.notFound(res, 'Funder not found');
    return ResponseHandler.success(res, funder);
  } catch (err) {
    console.error('[funder.detail]', err);
    return _handleError(res, err);
  }
};

// ── Create ────────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const { error, value } = createFunderSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const funder = await funderSvc.createFunder(value, req.user.user_id);
    return ResponseHandler.created(res, funder);
  } catch (err) {
    console.error('[funder.create]', err);
    return _handleError(res, err);
  }
};

// ── Update Details ────────────────────────────────────────────────────────────

exports.updateDetails = async (req, res) => {
  try {
    const { error, value } = updateDetailsSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const funder = await funderSvc.updateFunderDetails(req.params.id, value);
    return ResponseHandler.success(res, funder);
  } catch (err) {
    console.error('[funder.updateDetails]', err);
    return _handleError(res, err);
  }
};

// ── Stage Update ──────────────────────────────────────────────────────────────

exports.updateStage = async (req, res) => {
  try {
    const { error, value } = updateStageSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    await funderSvc.updateStage(req.params.id, value.stage, value, req.user.user_id);
    const funder = await funderSvc.getFunderById(req.params.id);
    return ResponseHandler.success(res, funder);
  } catch (err) {
    console.error('[funder.updateStage]', err);
    return _handleError(res, err);
  }
};

// ── Remove ────────────────────────────────────────────────────────────────────

exports.remove = async (req, res) => {
  try {
    await funderSvc.deleteFunder(req.params.id, req.user.user_role);
    return ResponseHandler.success(res, { message: 'Funder deleted' });
  } catch (err) {
    console.error('[funder.remove]', err);
    return _handleError(res, err);
  }
};

// ── Commitments ───────────────────────────────────────────────────────────────

exports.listCommitments = async (req, res) => {
  try {
    const commitments = await funderSvc.listCommitments(req.params.id);
    return ResponseHandler.success(res, commitments);
  } catch (err) {
    return _handleError(res, err);
  }
};

exports.addCommitment = async (req, res) => {
  try {
    const { error, value } = addCommitmentSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const commitment = await funderSvc.addCommitment(req.params.id, value, req.user.user_id);
    return ResponseHandler.created(res, commitment);
  } catch (err) {
    console.error('[funder.addCommitment]', err);
    return _handleError(res, err);
  }
};

exports.updateCommitment = async (req, res) => {
  try {
    const { error, value } = updateCommitmentSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const commitment = await funderSvc.updateCommitment(req.params.id, req.params.commitmentId, value);
    return ResponseHandler.success(res, commitment);
  } catch (err) {
    return _handleError(res, err);
  }
};

// ── Deliverables ──────────────────────────────────────────────────────────────

exports.addDeliverable = async (req, res) => {
  try {
    const { error, value } = addDeliverableSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const deliverable = await funderSvc.addDeliverable(req.params.id, value.commitment_id, value);
    return ResponseHandler.created(res, deliverable);
  } catch (err) {
    console.error('[funder.addDeliverable]', err);
    return _handleError(res, err);
  }
};

exports.updateDeliverable = async (req, res) => {
  try {
    const { error, value } = updateDeliverableSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details);
    const deliverable = await funderSvc.updateDeliverable(req.params.deliverableId, value);
    return ResponseHandler.success(res, deliverable);
  } catch (err) {
    return _handleError(res, err);
  }
};

exports.deleteDeliverable = async (req, res) => {
  try {
    await funderSvc.deleteDeliverable(req.params.deliverableId);
    return ResponseHandler.success(res, { message: 'Deliverable deleted' });
  } catch (err) {
    return _handleError(res, err);
  }
};

exports.uploadDeliverableDoc = async (req, res) => {
  try {
    if (!req.file) {
      return ResponseHandler.validationError(res, [{ message: 'No file uploaded' }]);
    }
    const deliverable = await funderSvc.updateDeliverable(req.params.deliverableId, {
      document_url: req.file.originalname,
    });
    return ResponseHandler.success(res, deliverable);
  } catch (err) {
    return _handleError(res, err);
  }
};
