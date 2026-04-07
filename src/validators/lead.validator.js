const Joi = require('joi');

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const pocSchema = Joi.object({
  poc_name: Joi.string().trim().required(),
  poc_designation: Joi.string().trim().optional(),
  poc_contact: Joi.string().trim().pattern(/^[6-9]\d{9}$/).required()
    .messages({ 'string.pattern.base': 'Contact must be a valid 10-digit Indian number' }),
  poc_email: Joi.string().email().optional(),
  date_of_first_contact: Joi.date().iso().optional(),
});

// ── Create Lead ───────────────────────────────────────────────────────────────

const createLeadSchema = Joi.object({
  partner_name: Joi.string().trim().min(2).required(),
  state_id: Joi.number().integer().required(),
  city_id: Joi.number().integer().required(),
  address_line_1: Joi.string().trim().required(),
  address_line_2: Joi.string().trim().allow('', null).optional(),
  pincode: Joi.number().integer().min(100000).max(999999).required()
    .messages({ 'number.min': 'Pincode must be 6 digits', 'number.max': 'Pincode must be 6 digits' }),
  lead_source: Joi.string().trim().required(),
  co_id: Joi.alternatives().try(Joi.string(), Joi.number()).required()
    .messages({ 'any.required': 'Assigned CO is required' }),
});

// ── Update Stage ──────────────────────────────────────────────────────────────

const updateStageSchema = Joi.object({
  conversion_stage: Joi.string()
    .valid(
      'first_conversation',
      'interested',
      'interested_but_facing_delay',
      'not_interested',
      'dropped',
      'converted'
    )
    .required(),

  // ── first_conversation fields ──
  poc_name: Joi.string().trim().when('conversion_stage', {
    is: 'first_conversation',
    then: Joi.optional(),
    otherwise: Joi.optional(),
  }),
  poc_designation: Joi.string().trim().optional(),
  poc_contact: Joi.string().trim().optional(),
  poc_email: Joi.string().email().optional(),
  date_of_first_contact: Joi.date().iso().optional(),

  // ── interested fields ──
  specific_doc_required: Joi.boolean().optional(),
  specific_doc_name: Joi.string().trim().allow('', null).optional(),
  partner_affiliation_type: Joi.string().optional(),
  school_type: Joi.string().optional(),
  total_child_count: Joi.number().integer().min(0).optional(),
  classes: Joi.array().items(Joi.string()).optional(),
  low_income_resource: Joi.boolean().optional(),
  potential_child_count: Joi.number().integer().min(0).optional(),

  // ── interested_but_facing_delay fields ──
  current_status: Joi.string().trim().when('conversion_stage', {
    is: 'interested_but_facing_delay',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  expected_conversion_day: Joi.number().integer().min(1).optional(),

  // ── not_interested / dropped fields ──
  non_conversion_reason: Joi.string().trim().when('conversion_stage', {
    is: Joi.valid('not_interested', 'dropped'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  agreement_drop_date: Joi.date().iso().optional(),

  // ── converted (MOU) fields ──
  mou_sign_date: Joi.date().iso().when('conversion_stage', {
    is: 'converted',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  mou_start_date: Joi.date().iso().when('conversion_stage', {
    is: 'converted',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  mou_end_date: Joi.date().iso().when('conversion_stage', {
    is: 'converted',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  confirmed_child_count: Joi.number().integer().min(0).when('conversion_stage', {
    is: 'converted',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
}).options({ allowUnknown: false, stripUnknown: true });

// ── List Query ────────────────────────────────────────────────────────────────

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(10000).default(20),
  search: Joi.string().trim().allow('').optional(),
  stage: Joi.string()
    .valid(
      'new',
      'first_conversation',
      'interested',
      'interested_but_facing_delay',
      'not_interested',
      'dropped'
    )
    .optional(),
});

module.exports = { createLeadSchema, updateStageSchema, listQuerySchema };
