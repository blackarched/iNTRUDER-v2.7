const Joi = require('joi');

exports.authSchema = {
  // Schema for user registration
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character.',
      }),
  }),

  // Schema for user login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};