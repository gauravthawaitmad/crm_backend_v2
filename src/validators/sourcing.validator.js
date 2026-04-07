'use strict';
const Joi = require('joi');

// ── Used by sourcing.routes.js ─────────────────────────────────────────────────

const createSourcingSchema = Joi.object({
  name: Joi.string().trim().min(2).max(200).required(),
  organization_type: Joi.string()
    .valid('college', 'company', 'youth_club', 'community_group', 'other')
    .required(),
  state_id: Joi.number().integer().required(),
  city_id: Joi.number().integer().required(),
  co_id: Joi.alternatives().try(Joi.number().integer(), Joi.string()).required(),
  address_line_1: Joi.string().trim().optional().allow(''),
  pincode: Joi.number().integer().optional().allow(null),
  lead_source: Joi.string().optional().allow(null, ''),
});

const updateDetailsSchema = Joi.object({
  // Base partners table fields
  name: Joi.string().trim().min(2).max(200).optional(),
  state_id: Joi.number().integer().optional(),
  city_id: Joi.number().integer().optional(),
  // sourcing_partner_details fields
  organization_type: Joi.string()
    .valid('college', 'company', 'youth_club', 'community_group', 'other')
    .optional(),
  volunteers_committed: Joi.number().integer().min(0).optional(),
  volunteers_deployed: Joi.number().integer().min(0).optional(),
  org_type: Joi.string().optional(),
  website: Joi.string().uri().optional().allow(null, ''),
  volunteer_capacity: Joi.number().integer().optional().allow(null),
  notes: Joi.string().optional().allow(null, ''),
}).min(1);

const updateCommitmentSchema = Joi.object({
  cycle_label: Joi.string().trim().optional(),
  committed_count: Joi.number().integer().min(1).optional(),
  delivered_count: Joi.number().integer().min(0).optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  commitment_notes: Joi.string().optional().allow(null, ''),
  status: Joi.string().valid('active', 'completed', 'cancelled').optional(),
}).min(1);

const updateStageSchema = Joi.object({
  stage: Joi.string()
    .valid('identified', 'first_contact', 'in_discussion', 'onboarded', 'paused', 'dropped')
    .required(),
  notes: Joi.string().optional().allow(null, ''),
  drop_reason: Joi.string()
    .valid('no_response', 'program_mismatch', 'capacity_issues', 'relationship_ended', 'other')
    .when('stage', { is: 'dropped', then: Joi.required(), otherwise: Joi.optional() }),
  drop_date: Joi.date().optional(),
});

// New commitment schema (used by sourcing.routes.js)
const addNewCommitmentSchema = Joi.object({
  cycle_label: Joi.string().trim().required(),
  committed_count: Joi.number().integer().min(1).required(),
  delivered_count: Joi.number().integer().min(0).optional().default(0),
  start_date: Joi.date().required(),
  end_date: Joi.date().min(Joi.ref('start_date')).required(),
  commitment_notes: Joi.string().optional().allow(null, ''),
  status: Joi.string().valid('active', 'completed', 'cancelled').optional().default('active'),
});

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  search: Joi.string().optional().allow(''),
  stage: Joi.string().optional().allow(''),
});

// ── Kept for backward compat: used by commitment.routes.js ────────────────────

// Legacy commitment schema (used by /api/partners/:partnerId/commitments)
const addCommitmentSchema = Joi.object({
  cycle_year: Joi.number().integer().min(2020).max(2100).optional().allow(null),
  cycle_label: Joi.string().optional().allow(null, ''),
  committed_count: Joi.number().integer().min(0).optional().allow(null),
  delivered_count: Joi.number().integer().min(0).optional().allow(null),
  actual_count: Joi.number().integer().min(0).optional().allow(null),
  status: Joi.string().valid('pending', 'active', 'completed', 'cancelled').optional(),
  commitment_notes: Joi.string().optional().allow(null, ''),
  start_date: Joi.date().optional().allow(null),
  end_date: Joi.date().optional().allow(null),
});

const addSchoolTagSchema = Joi.object({
  school_partner_id: Joi.number().integer().required(),
  notes: Joi.string().optional().allow(null, ''),
});

// Legacy alias for old createSourcingSchema (used by old service if needed)
const createSourcingLegacySchema = Joi.object({
  partner_name: Joi.string().trim().min(2).max(200).required(),
  org_type: Joi.string().valid('college', 'company', 'youth_club', 'government', 'other').optional(),
  state_id: Joi.number().integer().optional().allow(null),
  city_id: Joi.number().integer().optional().allow(null),
  address_line_1: Joi.string().trim().optional().allow(''),
  address_line_2: Joi.string().trim().optional().allow(null, ''),
  pincode: Joi.number().integer().optional().allow(null),
  lead_source: Joi.string().valid('referral', 'cold_outreach', 'event', 'inbound', 'other').optional(),
  co_id: Joi.number().integer().optional().allow(null),
  volunteer_capacity: Joi.number().integer().optional().allow(null),
  website: Joi.string().uri().optional().allow(null, ''),
  notes: Joi.string().optional().allow(null, ''),
});

const updateSourcingDetailSchema = Joi.object({
  org_type: Joi.string().valid('college', 'company', 'youth_club', 'government', 'other').optional(),
  website: Joi.string().uri().optional().allow(null, ''),
  volunteer_capacity: Joi.number().integer().optional().allow(null),
  notes: Joi.string().optional().allow(null, ''),
});

module.exports = {
  // New (sourcing.routes.js)
  createSourcingSchema,
  updateDetailsSchema,
  updateStageSchema,
  addNewCommitmentSchema,
  updateCommitmentSchema,
  listQuerySchema,
  // Legacy (commitment.routes.js + old references)
  addCommitmentSchema,
  addSchoolTagSchema,
  createSourcingLegacySchema,
  updateSourcingDetailSchema,
};
