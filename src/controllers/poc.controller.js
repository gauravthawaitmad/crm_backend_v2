'use strict';

const pocService = require('../services/poc.service');
const { createPocSchema, updatePocSchema, addMeetingSchema } = require('../validators/poc.validator');
const ResponseHandler = require('../handlers/response.handler');

function handleError(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message || 'An error occurred' });
}

async function listAll(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const result = await pocService.listAll({
      page: Number(page),
      limit: Number(limit),
      search: search || undefined,
    });
    return ResponseHandler.paginated(res, result.pocs, {
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      limit: Number(limit),
    });
  } catch (err) {
    next(err);
  }
}

async function listByPartner(req, res) {
  try {
    const partnerId = parseInt(req.query.partner_id);
    if (!partnerId) return ResponseHandler.validationError(res, 'partner_id query param is required');
    const pocs = await pocService.getPocsByPartner(partnerId);
    return ResponseHandler.success(res, pocs);
  } catch (err) {
    return handleError(res, err);
  }
}

async function detail(req, res) {
  try {
    const poc = await pocService.getPocById(parseInt(req.params.id));
    return ResponseHandler.success(res, poc);
  } catch (err) {
    return handleError(res, err);
  }
}

async function create(req, res) {
  try {
    const { error, value } = createPocSchema.validate(req.body);
    if (error) return ResponseHandler.validationError(res, error.details[0].message);

    const userId = req.user.user_id;
    const poc = await pocService.createPoc(value.partner_id, value, userId);
    return ResponseHandler.created(res, poc);
  } catch (err) {
    if (err.statusCode === 409) {
      return res.status(409).json({ success: false, message: err.message, duplicate: err.duplicate });
    }
    return handleError(res, err);
  }
}

async function update(req, res) {
  try {
    const { error, value } = updatePocSchema.validate(req.body);
    if (error) return ResponseHandler.validationError(res, error.details[0].message);

    const poc = await pocService.updatePoc(parseInt(req.params.id), value);
    return ResponseHandler.success(res, poc);
  } catch (err) {
    return handleError(res, err);
  }
}

async function remove(req, res) {
  try {
    await pocService.deletePoc(parseInt(req.params.id));
    return ResponseHandler.success(res, { message: 'POC deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

async function addMeeting(req, res) {
  try {
    const { error, value } = addMeetingSchema.validate(req.body);
    if (error) return ResponseHandler.validationError(res, error.details[0].message);

    const pocId = parseInt(req.params.id);
    const partnerId = parseInt(req.query.partner_id);
    if (!partnerId) return ResponseHandler.validationError(res, 'partner_id query param is required');

    const userId = req.user.user_id;
    const meeting = await pocService.addMeeting(partnerId, pocId, value, userId);
    return ResponseHandler.created(res, meeting);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { listAll, listByPartner, detail, create, update, remove, addMeeting };
