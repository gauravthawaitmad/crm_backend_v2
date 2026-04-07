'use strict';

const Joi = require('joi');

const VENDOR_TYPES = ['facilitator', 'speaker', 'printer', 'venue_provider', 'event_service', 'other'];
const STAGES = ['identified', 'contacted', 'approved', 'active', 'inactive', 'dropped'];

const createVendorSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  vendor_type: Joi.string().valid(...VENDOR_TYPES).required(),
  state_id: Joi.number().integer().positive().required(),
  city_id: Joi.number().integer().positive().required(),
  co_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  services_description: Joi.string().allow('', null).optional(),
});

const updateDetailsSchema = Joi.object({
  name: Joi.string().trim().min(1).optional(),
  vendor_type: Joi.string().valid(...VENDOR_TYPES).optional(),
  state_id: Joi.number().integer().positive().optional(),
  city_id: Joi.number().integer().positive().optional(),
  services_description: Joi.string().allow('', null).optional(),
  contract_services: Joi.string().allow('', null).optional(),
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

const addEngagementSchema = Joi.object({
  engagement_name: Joi.string().trim().min(1).required(),
  engagement_date: Joi.date().required(),
  service_provided: Joi.string().trim().min(1).required(),
  rating_overall: Joi.number().integer().min(1).max(5).required(),
  rating_quality: Joi.number().integer().min(1).max(5).optional().allow(null),
  rating_timeliness: Joi.number().integer().min(1).max(5).optional().allow(null),
  rating_cost: Joi.number().integer().min(1).max(5).optional().allow(null),
  school_partner_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().allow('', null).optional(),
});

const updateEngagementSchema = Joi.object({
  engagement_name: Joi.string().trim().min(1).optional(),
  engagement_date: Joi.date().optional(),
  service_provided: Joi.string().trim().min(1).optional(),
  rating_overall: Joi.number().integer().min(1).max(5).optional(),
  rating_quality: Joi.number().integer().min(1).max(5).optional().allow(null),
  rating_timeliness: Joi.number().integer().min(1).max(5).optional().allow(null),
  rating_cost: Joi.number().integer().min(1).max(5).optional().allow(null),
  school_partner_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().allow('', null).optional(),
}).min(1);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().positive().optional(),
  limit: Joi.number().integer().positive().optional(),
  search: Joi.string().allow('', null).optional(),
  stage: Joi.string().valid(...STAGES).allow('', null).optional(),
  vendor_type: Joi.string().valid(...VENDOR_TYPES).allow('', null).optional(),
  sort_by: Joi.string().valid('rating', 'name', 'recent').allow('', null).optional(),
});

module.exports = {
  createVendorSchema,
  updateDetailsSchema,
  updateStageSchema,
  addEngagementSchema,
  updateEngagementSchema,
  listQuerySchema,
};
