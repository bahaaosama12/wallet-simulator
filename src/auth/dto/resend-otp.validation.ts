import Joi from 'joi';

export const resendOtpValidation = Joi.object({
  email: Joi.string().email().required(),
});
