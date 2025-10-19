import express from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authenticateWithSession } from '../middleware/sessionAuth.js';
import { 
  validate,
  registerSchema,
  sendRegistrationOTPSchema,
  registerWithOTPSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  verifyEmailOTPSchema,
  resendVerificationSchema,
  sendOTPSchema,
  verifyOTPSchema
} from '../validators/authValidator.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/send-registration-otp
 * @desc    Send OTP for registration verification
 * @access  Public
 */
router.post('/send-registration-otp', validate(sendRegistrationOTPSchema), authController.sendRegistrationOTP);

/**
 * @route   POST /api/v1/auth/register
 * @desc    Complete registration after OTP verification
 * @access  Public
 */
router.post('/register', validate(registerWithOTPSchema), authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    User login
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    User logout
 * @access  Private
 */
router.post('/logout', authenticateWithSession, authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

/**
 * @route   POST /api/v1/auth/verify-email-otp
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post('/verify-email-otp', validate(verifyEmailOTPSchema), authController.verifyEmailOTP);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
router.post('/resend-verification', validate(resendVerificationSchema), authController.resendVerificationEmail);

/**
 * @route   POST /api/v1/auth/send-reset-otp
 * @desc    Send password reset OTP
 * @access  Public
 */
router.post('/send-reset-otp', validate(sendOTPSchema), authController.sendPasswordResetOTP);

/**
 * @route   POST /api/v1/auth/verify-otp-reset
 * @desc    Verify OTP and reset password
 * @access  Public
 */
router.post('/verify-otp-reset', validate(verifyOTPSchema), authController.verifyOTPAndResetPassword);

/**
 * @route   POST /api/v1/auth/force-login
 * @desc    Force login by terminating oldest session
 * @access  Public
 */
router.post('/force-login', validate(loginSchema), authController.forceLogin);

// Protected routes (require authentication with session validation)

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticateWithSession, authController.getMe);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', 
  authenticateWithSession, 
  validate(updateProfileSchema), 
  authController.updateProfile
);

/**
 * @route   PUT /api/v1/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password', 
  authenticateWithSession, 
  validate(changePasswordSchema), 
  authController.changePassword
);

// Session management routes

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions', authenticateWithSession, authController.getActiveSessions);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Terminate a specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId', authenticateWithSession, authController.terminateSession);

/**
 * @route   DELETE /api/v1/auth/sessions/others
 * @desc    Terminate all other sessions (except current)
 * @access  Private
 */
router.delete('/sessions/others', authenticateWithSession, authController.terminateAllOtherSessions);

export default router;