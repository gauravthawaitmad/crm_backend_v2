const Joi = require('joi');

/**
 * organization.validator.js
 *
 * Joi schemas for Organization endpoints.
 * mou_document file is validated in the controller (via multer).
 */

// ── MOU Renewal ───────────────────────────────────────────────────────────────

const renewMouSchema = Joi.object({
  mou_sign_date: Joi.date().iso().required()
    .messages({ 'any.required': 'MOU sign date is required', 'date.base': 'MOU sign date must be a valid date' }),
  mou_start_date: Joi.date().iso().required()
    .messages({ 'any.required': 'MOU start date is required', 'date.base': 'MOU start date must be a valid date' }),
  mou_end_date: Joi.date().iso().greater(Joi.ref('mou_start_date')).required()
    .messages({
      'any.required': 'MOU end date is required',
      'date.base': 'MOU end date must be a valid date',
      'date.greater': 'MOU end date must be after start date',
    }),
  confirmed_child_count: Joi.number().integer().min(1).required()
    .messages({
      'any.required': 'Confirmed child count is required',
      'number.min': 'Child count must be at least 1',
    }),
});

// ── CO Reallocation ───────────────────────────────────────────────────────────

const reallocateSchema = Joi.object({
  partner_id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
    .messages({ 'any.required': 'Partner ID is required' }),
  new_co_id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
    .messages({ 'any.required': 'New CO ID is required' }),
});

// ── List Query ────────────────────────────────────────────────────────────────

const listQuerySchema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('').optional(),
});

module.exports = { renewMouSchema, reallocateSchema, listQuerySchema };
