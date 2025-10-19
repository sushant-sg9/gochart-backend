import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';

/**
 * Generic validation middleware
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(new ValidationError(message));
    }
    next();
  };
};

/**
 * Payment plan creation schema
 */
export const createPaymentPlanSchema = Joi.object({
  price: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'any.required': 'Price is required'
    }),
  
  month: Joi.number()
    .integer()
    .min(1)
    .max(120) // Max 10 years
    .required()
    .messages({
      'number.base': 'Month must be a number',
      'number.integer': 'Month must be an integer',
      'number.min': 'Month must be at least 1',
      'number.max': 'Month cannot exceed 120',
      'any.required': 'Month is required'
    }),
  
  qrcodeUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'QR code URL must be a valid URL',
      'any.required': 'QR code URL is required'
    }),
  
  type: Joi.string()
    .valid('crypto', 'regular')
    .required()
    .messages({
      'any.only': 'Type must be either crypto or regular',
      'any.required': 'Payment type is required'
    })
});

/**
 * Payment plan update schema
 */
export const updatePaymentPlanSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid payment plan ID format',
      'any.required': 'Payment plan ID is required'
    }),
  
  price: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive'
    }),
  
  month: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .optional()
    .messages({
      'number.base': 'Month must be a number',
      'number.integer': 'Month must be an integer',
      'number.min': 'Month must be at least 1',
      'number.max': 'Month cannot exceed 120'
    }),
  
  qrcodeUrl: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'QR code URL must be a valid URL'
    }),
  
  type: Joi.string()
    .valid('crypto', 'regular')
    .optional()
    .messages({
      'any.only': 'Type must be either crypto or regular'
    })
});

/**
 * User payment submission schema
 */
export const userPaymentSchema = Joi.object({
  utrNo: Joi.string()
    .trim()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'UTR number must be at least 3 characters',
      'string.max': 'UTR number cannot exceed 50 characters',
      'any.required': 'UTR number is required'
    }),
  
  Months: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .required()
    .messages({
      'number.base': 'Months must be a number',
      'number.integer': 'Months must be an integer',
      'number.min': 'Months must be at least 1',
      'number.max': 'Months cannot exceed 120',
      'any.required': 'Subscription months is required'
    }),
  
  price: Joi.number()
    .positive()
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'any.required': 'Payment amount is required'
    }),
  
  type: Joi.string()
    .valid('crypto', 'regular')
    .required()
    .messages({
      'any.only': 'Payment type must be either crypto or regular',
      'any.required': 'Payment type is required'
    }),
  
  paymentPlanId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid payment plan ID format'
    })
});

/**
 * User status update schema (admin)
 */
export const userStatusSchema = Joi.object({
  status: Joi.boolean()
    .required()
    .messages({
      'any.required': 'Status is required'
    }),
  
  id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),
  
  premiumEndDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Premium end date must be in ISO format'
    })
});

/**
 * Change subscription months schema (admin)
 */
export const changeSubMonthsSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Valid email is required',
      'any.required': 'Email is required'
    }),
  
  months: Joi.number()
    .integer()
    .min(1)
    .max(120)
    .required()
    .messages({
      'number.base': 'Months must be a number',
      'number.integer': 'Months must be an integer',
      'number.min': 'Months must be at least 1',
      'number.max': 'Months cannot exceed 120',
      'any.required': 'Subscription months is required'
    })
});

/**
 * Payment type parameter validation
 */
export const validatePaymentType = (req, res, next) => {
  const { type } = req.params;
  
  if (!type || !['crypto', 'regular'].includes(type)) {
    return next(new ValidationError('Payment type must be either crypto or regular'));
  }
  
  next();
};