'use strict';

const interactionSvc    = require('../services/interaction.service');
const followupSvc       = require('../services/followup.service');
const ResponseHandler   = require('../handlers/response.handler');
const { logInteractionSchema, updateInteractionSchema } = require('../validators/interaction.validator');

function handleError(res, err) {
  console.error('[interaction.controller]', err.message);
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message || 'An error occurred' });
}

async function list(req, res) {
  try {
    const partnerId = parseInt(req.params.partnerId);
    if (!partnerId) return ResponseHandler.validationError(res, 'Invalid partner ID');

    const options = {
      limit:   parseInt(req.query.limit)  || 50,
      offset:  parseInt(req.query.offset) || 0,
      outcome: req.query.outcome || undefined,
    };

    const interactions = await interactionSvc.getInteractions(partnerId, options);
    return ResponseHandler.success(res, interactions);
  } catch (err) {
    return handleError(res, err);
  }
}

async function create(req, res) {
  try {
    const partnerId = parseInt(req.params.partnerId);
    if (!partnerId) return ResponseHandler.validationError(res, 'Invalid partner ID');

    const { error, value } = logInteractionSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const interaction = await interactionSvc.logInteraction(partnerId, value, req.user.user_id);
    return ResponseHandler.created(res, interaction);
  } catch (err) {
    return handleError(res, err);
  }
}

async function update(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return ResponseHandler.validationError(res, 'Invalid interaction ID');

    const { error, value } = updateInteractionSchema.validate(req.body, { abortEarly: false });
    if (error) return ResponseHandler.validationError(res, error.details.map((d) => d.message));

    const interaction = await interactionSvc.updateInteraction(id, req.user.user_id, value);
    return ResponseHandler.success(res, interaction);
  } catch (err) {
    return handleError(res, err);
  }
}

async function remove(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return ResponseHandler.validationError(res, 'Invalid interaction ID');

    await interactionSvc.deleteInteraction(id, req.user.user_id);
    return ResponseHandler.success(res, null, 'Interaction deleted');
  } catch (err) {
    return handleError(res, err);
  }
}

async function markFollowUpDone(req, res) {
  try {
    const id = parseInt(req.params.id);
    if (!id) return ResponseHandler.validationError(res, 'Invalid interaction ID');

    const interaction = await interactionSvc.markFollowUpDone(id, req.user.user_id);
    return ResponseHandler.success(res, interaction, 'Follow-up marked as done');
  } catch (err) {
    return handleError(res, err);
  }
}

async function getFollowUps(req, res) {
  try {
    const result = await followupSvc.getFollowUpsDue(req.user.user_id, req.user.user_role);
    return ResponseHandler.success(res, result);
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = { list, create, update, remove, markFollowUpDone, getFollowUps };
