import Joi from 'joi';

export const registerSchema = Joi.object({
  fullName: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[0-9]{8,15}$/).required(),
  password: Joi.string()
    .pattern(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{8,}$/)
    .required()
    .messages({
      'string.pattern.base': 'Le mot de passe doit contenir au moins 8 caractères, chiffres et caractères spéciaux.'
    }),
  role: Joi.string().valid('owner', 'admin', 'fleet_manager').required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});
