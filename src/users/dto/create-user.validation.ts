import Joi from 'joi';

export const createUserValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),

  phoneNumber: Joi.string()
    .pattern(/^01[0125][0-9]{8}$/)
    .required(),

  SSN: Joi.string()
    .pattern(/^[0-9]{14}$/)
    .required(),

  email: Joi.string().email().required(),

  password: Joi.string().min(8).required(),
});
