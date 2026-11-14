import Joi from 'joi';

export const transferValidation = Joi.object({
  receiverPhoneNumber: Joi.string()
    .pattern(/^01[0125][0-9]{8}$/)
    .required(),

  amount: Joi.number().positive().max(60000).required(),
});
