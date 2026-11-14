import Joi from 'joi';

export const loginUserValidation = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^01[0125][0-9]{8}$/)
    .required(),

  password: Joi.string().min(8).required(),
});
