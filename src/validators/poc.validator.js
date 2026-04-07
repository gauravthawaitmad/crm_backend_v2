'use strict';

const Joi = require('joi');

// poc_contact is stored as varchar in DB; validate as 10-digit string starting with 6-9
const pocContactRule = Joi.string()
  .pattern(/^[6-9]\d{9}$/)
  .messages({
    'string.pattern.base': 'Contact must be a 10-digit number starting with 6, 7, 8, or 9',
  });

const createPocSchema = Joi.object({
  partner_id: Joi.number().integer().required(),
  poc_name: Joi.string().trim().min(1).max(200).required(),
  poc_designation: Joi.string().trim().max(200).optional().allow('', null),
  poc_contact: pocContactRule.required(),
  poc_email: Joi.string().email().optional().allow('', null),
  date_of_first_contact: Joi.date().iso().optional().allow(null),
});

const updatePocSchema = Joi.object({
  poc_name: Joi.string().trim().min(1).max(200).optional(),
  poc_designation: Joi.string().trim().max(200).optional().allow('', null),
  poc_contact: pocContactRule.optional(),
  poc_email: Joi.string().email().optional().allow('', null),
  date_of_first_contact: Joi.date().iso().optional().allow(null),
}).min(1);

const addMeetingSchema = Joi.object({
  meeting_date: Joi.date().iso().required(),
  meeting_notes: Joi.string().trim().max(2000).optional().allow('', null),
  follow_up_meeting_scheduled: Joi.boolean().optional().default(false),
  follow_up_meeting_date: Joi.date().iso().optional().allow(null).when('follow_up_meeting_scheduled', {
    is: true,
    then: Joi.date().iso().required(),
  }),
});

module.exports = { createPocSchema, updatePocSchema, addMeetingSchema };
