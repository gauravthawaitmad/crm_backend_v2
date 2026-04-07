'use strict';

const Joi = require('joi');

const FUNDER_TYPES = ['corporate', 'individual', 'grant', 'group'];
const COMMITMENT_TYPES = ['one_time', 'monthly', 'quarterly', 'annual', 'program_based'];
const INSTALLMENT_FREQS = ['monthly', 'quarterly', 'annual'];
const DELIVERABLE_TYPES = ['impact_report', 'outcome_data', 'site_visit', 'branding', 'other'];
const STAGES = ['prospect', 'in_discussion', 'agreed', 'active', 'completed', 'dropped'];
const DELIVERABLE_STATUSES = ['pending', 'submitted', 'accepted', 'overdue'];
const COMMITMENT_STATUSES = ['pending', 'active', 'completed', 'cancelled'];

const createFunderSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  funder_type: Joi.string().valid(...FUNDER_TYPES).required(),
  state_id: Joi.number().integer().positive().required(),
  city_id: Joi.number().integer().positive().required(),
  co_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  website: Joi.string().uri().allow('', null).optional(),
});

const updateDetailsSchema = Joi.object({
  name: Joi.string().trim().min(1).optional(),
  funder_type: Joi.string().valid(...FUNDER_TYPES).optional(),
  state_id: Joi.number().integer().positive().optional(),
  city_id: Joi.number().integer().positive().optional(),
  website: Joi.string().uri().allow('', null).optional(),
  notes: Joi.string().allow('', null).optional(),
}).min(1);

const updateStageSchema = Joi.object({
  stage: Joi.string().valid(...STAGES).required(),
  notes: Joi.string().allow('', null).optional(),
  drop_reason: Joi.when('stage', {
    is: 'dropped',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('', null).optional(),
  }),
});

const addCommitmentSchema = Joi.object({
  cycle_label: Joi.string().trim().min(1).required(),
  commitment_type: Joi.string().valid(...COMMITMENT_TYPES).required(),
  amount_description: Joi.string().trim().min(1).required(),
  amount: Joi.number().min(0).allow(null).optional(),
  amount_per_installment: Joi.number().min(0).allow(null).optional(),
  installment_frequency: Joi.string().valid(...INSTALLMENT_FREQS).allow(null).optional(),
  total_installments: Joi.number().integer().min(1).allow(null).optional(),
  program_name: Joi.string().allow('', null).optional(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
  commitment_notes: Joi.string().allow('', null).optional(),
  status: Joi.string().valid(...COMMITMENT_STATUSES).default('pending'),
});

const updateCommitmentSchema = Joi.object({
  cycle_label: Joi.string().trim().min(1).optional(),
  commitment_type: Joi.string().valid(...COMMITMENT_TYPES).optional(),
  amount_description: Joi.string().trim().allow('', null).optional(),
  amount: Joi.number().min(0).allow(null).optional(),
  amount_per_installment: Joi.number().min(0).allow(null).optional(),
  installment_frequency: Joi.string().valid(...INSTALLMENT_FREQS).allow(null).optional(),
  total_installments: Joi.number().integer().min(1).allow(null).optional(),
  received_installments: Joi.number().integer().min(0).optional(),
  program_name: Joi.string().allow('', null).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  commitment_notes: Joi.string().allow('', null).optional(),
  status: Joi.string().valid(...COMMITMENT_STATUSES).optional(),
  document_url: Joi.string().allow('', null).optional(),
}).min(1);

const addDeliverableSchema = Joi.object({
  commitment_id: Joi.number().integer().positive().required(),
  deliverable_type: Joi.string().valid(...DELIVERABLE_TYPES).required(),
  description: Joi.string().trim().min(1).required(),
  due_date: Joi.date().iso().required(),
  notes: Joi.string().allow('', null).optional(),
});

const updateDeliverableSchema = Joi.object({
  deliverable_type: Joi.string().valid(...DELIVERABLE_TYPES).optional(),
  description: Joi.string().trim().min(1).optional(),
  due_date: Joi.date().iso().optional(),
  delivered_date: Joi.date().iso().allow(null).optional(),
  status: Joi.string().valid(...DELIVERABLE_STATUSES).optional(),
  notes: Joi.string().allow('', null).optional(),
  document_url: Joi.string().allow('', null).optional(),
}).min(1);

module.exports = {
  createFunderSchema,
  updateDetailsSchema,
  updateStageSchema,
  addCommitmentSchema,
  updateCommitmentSchema,
  addDeliverableSchema,
  updateDeliverableSchema,
};
