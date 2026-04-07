const Joi = require('joi');

const loginSchema = Joi.object({
  user_login: Joi.string().trim().required().messages({
    'string.base': 'Username must be a string',
    'any.required': 'Username is required',
    'string.empty': 'Username is required',
  }),
  password: Joi.string().required().messages({
    'string.base': 'Password must be a string',
    'any.required': 'Password is required',
    'string.empty': 'Password is required',
  }),
});

module.exports = { loginSchema };
