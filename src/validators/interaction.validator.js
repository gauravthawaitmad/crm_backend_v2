'use strict';

const Joi = require('joi');

const VALID_TYPES = [
  'Call',
  'In-Person Meeting',
  'Site Visit',
  'Online Meeting',
  'Email',
  'WhatsApp',
  'Internal',
];

const VALID_OUTCOMES = [
  'Positive',
  'Neutral',
  'Needs Follow-up',
  'No Response',
];

const logInteractionSchema = Joi.object({
  poc_id:                Joi.number().integer().optional().allow(null),
  interaction_type:      Joi.string().valid(...VALID_TYPES).required(),
  interaction_date:      Joi.date().iso().required(),
  duration_mins:         Joi.number().integer().min(1).optional().allow(null),
  location:              Joi.string().trim().max(500).optional().allow('', null),
  summary:               Joi.string().trim().min(10).max(5000).required(),
  outcome:               Joi.string().valid(...VALID_OUTCOMES).required(),
  attendees_notes:       Joi.string().trim().max(2000).optional().allow('', null),
  next_steps:            Joi.string().trim().max(2000).optional().allow('', null),
  follow_up_date:        Joi.date().iso().optional().allow(null),
  follow_up_assigned_to: Joi.string().optional().allow('', null),
});

const updateInteractionSchema = Joi.object({
  summary:               Joi.string().trim().min(10).max(5000).optional(),
  outcome:               Joi.string().valid(...VALID_OUTCOMES).optional(),
  next_steps:            Joi.string().trim().max(2000).optional().allow('', null),
  follow_up_date:        Joi.date().iso().optional().allow(null),
  follow_up_assigned_to: Joi.string().optional().allow('', null),
}).min(1);

module.exports = { logInteractionSchema, updateInteractionSchema };
