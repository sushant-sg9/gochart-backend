import Joi from 'joi';

// Send registration OTP validation
export const sendRegistrationOTPSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters and spaces'
    }),

  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    })
});

// User registration with OTP validation
export const registerWithOTPSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters and spaces'
    }),

  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[1-9][\d]{9,14}$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Please enter a valid phone number'
    }),

  password: Joi.string()
    .min(8)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 50 characters'
    }),

  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.empty': 'OTP is required',
      'string.pattern.base': 'OTP must be a 6-digit number'
    })
});

// User registration validation (keep for backward compatibility)
export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters and spaces'
    }),

  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[1-9][\d]{9,14}$/)
    .required()
    .messages({
      'string.empty': 'Phone number is required',
      'string.pattern.base': 'Please enter a valid phone number'
    }),

  password: Joi.string()
    .min(8)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 50 characters'
    })
});

// User login validation
export const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

// Password reset request validation
export const forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    })
});

// Password reset validation
export const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),

  password: Joi.string()
    .min(8)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 50 characters'
    })
});

// Password change validation
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .max(50)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 50 characters'
    })
});

// Profile update validation
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 50 characters',
      'string.pattern.base': 'Name can only contain letters and spaces'
    }),

  phone: Joi.string()
    .trim()
    .pattern(/^[+]?[1-9][\d]{9,14}$/)
    .messages({
      'string.pattern.base': 'Please enter a valid phone number'
    }),

  timezone: Joi.string()
    .trim()
    .max(50),

  language: Joi.string()
    .trim()
    .valid('en', 'es', 'fr', 'de', 'hi')
    .messages({
      'any.only': 'Language must be one of: en, es, fr, de, hi'
    })
});

// Subscription validation
export const subscriptionSchema = Joi.object({
  plan: Joi.string()
    .valid('basic', 'premium', 'enterprise')
    .required()
    .messages({
      'any.only': 'Plan must be one of: basic, premium, enterprise',
      'string.empty': 'Subscription plan is required'
    }),

  months: Joi.number()
    .integer()
    .min(1)
    .max(12)
    .required()
    .messages({
      'number.min': 'Subscription duration must be at least 1 month',
      'number.max': 'Subscription duration must not exceed 12 months',
      'number.base': 'Subscription duration must be a number'
    }),

  paymentType: Joi.string()
    .valid('crypto', 'regular', 'bank_transfer', 'upi')
    .required()
    .messages({
      'any.only': 'Payment type must be one of: crypto, regular, bank_transfer, upi',
      'string.empty': 'Payment type is required'
    }),

  paymentAmount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Payment amount must be positive',
      'number.base': 'Payment amount must be a number'
    }),

  transactionId: Joi.string()
    .trim()
    .min(5)
    .max(100)
    .messages({
      'string.min': 'Transaction ID must be at least 5 characters long',
      'string.max': 'Transaction ID must not exceed 100 characters'
    }),

  utrNo: Joi.string()
    .trim()
    .min(5)
    .max(50)
    .messages({
      'string.min': 'UTR number must be at least 5 characters long',
      'string.max': 'UTR number must not exceed 50 characters'
    })
});

// Email verification with OTP validation
export const verifyEmailOTPSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),

  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.empty': 'OTP is required',
      'string.pattern.base': 'OTP must be a 6-digit number'
    })
});

// Resend verification email validation
export const resendVerificationSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    })
});

// Send OTP validation
export const sendOTPSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    })
});

// Verify OTP and reset password validation
export const verifyOTPSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email()
    .lowercase()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),

  otp: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.empty': 'OTP is required',
      'string.pattern.base': 'OTP must be a 6-digit number'
    }),

  password: Joi.string()
    .min(8)
    .max(50)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 50 characters'
    })
});

// Middleware to validate request body
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return res.status(400).json({
        success: false,
        message: errorMessage,
        data: null,
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    req.body = value;
    next();
  };
};