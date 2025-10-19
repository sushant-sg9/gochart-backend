import User from '../models/User.js';
import jwtHelper from '../utils/jwt.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';
import sessionService from '../services/sessionService.js';
import { 
  AuthenticationError, 
  ValidationError, 
  ConflictError,
  NotFoundError 
} from '../utils/errors.js';

/**
 * Send OTP for registration verification
 */
export const sendRegistrationOTP = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new ConflictError('Email is already registered');
    }

    // Create a temporary user record with OTP (not fully registered)
    let tempUser = await User.findOne({ email, isEmailVerified: false });
    
    if (!tempUser) {
      tempUser = new User({
        name,
        email,
        phone: 'temp', // Will be updated during actual registration
        password: 'temp', // Will be updated during actual registration
        isActive: false, // Mark as inactive until full registration
        isEmailVerified: false
      });
    }

    // Generate and save OTP
    const verificationOTP = tempUser.createEmailOTP();
    await tempUser.save({ validateBeforeSave: false });

    // Send OTP email
    try {
      await emailService.sendVerificationOTP(email, name, verificationOTP);
      logger.info(`Registration OTP sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send registration OTP to ${email}:`, emailError);
      throw new Error('Failed to send verification OTP. Please try again later.');
    }

    res.status(200).json({
      success: true,
      message: 'Verification OTP sent to your email.',
      data: {
        email,
        name
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Register new user (after OTP verification)
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, otp } = req.body;

    // Find the temp user and verify OTP
    const tempUser = await User.findOne({ email, isEmailVerified: false, isActive: false });

    if (!tempUser) {
      throw new AuthenticationError('Please verify your email first by sending an OTP.');
    }

    // Verify OTP
    if (!tempUser.verifyOTP(otp)) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    // Check if phone number is already taken
    const existingPhone = await User.findOne({ 
      phone, 
      _id: { $ne: tempUser._id },
      isActive: true 
    });

    if (existingPhone) {
      throw new ConflictError('Phone number is already registered');
    }

    // Complete registration by updating temp user
    tempUser.name = name;
    tempUser.phone = phone;
    tempUser.password = password;
    tempUser.isEmailVerified = true;
    tempUser.isActive = true;
    tempUser.emailOTP = undefined;
    tempUser.emailOTPExpires = undefined;
    tempUser.ipAddress = req.ip;
    tempUser.userAgent = req.get('User-Agent');

    await tempUser.save();

    // Generate JWT token for immediate login
    const token = jwtHelper.generateToken({
      id: tempUser._id,
      email: tempUser.email,
      role: tempUser.role
    });

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res.cookie('access_token', token, cookieOptions);

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(tempUser.email, tempUser.name);
    } catch (emailError) {
      logger.error(`Failed to send welcome email to ${tempUser.email}:`, emailError);
    }

    // Remove password from response
    tempUser.password = undefined;

    logger.info(`User registration completed: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully! Welcome to GoChart.',
      data: {
        user: tempUser,
        token
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify email with OTP
 */
export const verifyEmailOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      throw new ValidationError('Email and OTP are required');
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      throw new AuthenticationError('Invalid email or OTP');
    }

    if (user.isEmailVerified) {
      throw new ValidationError('Email is already verified');
    }

    // Verify OTP
    if (!user.verifyOTP(otp)) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    // Mark email as verified and clear OTP fields
    user.isEmailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name);
    } catch (emailError) {
      logger.error(`Failed to send welcome email to ${user.email}:`, emailError);
    }

    // Generate JWT token for automatic login
    const jwtToken = jwtHelper.generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res.cookie('access_token', jwtToken, cookieOptions);

    logger.info(`Email verified successfully for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! Welcome to GoChart.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        },
        token: jwtToken
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not
      return res.status(200).json({
        success: true,
        message: 'If the email exists and is not verified, a new verification email has been sent.',
        data: null
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: 'Email is already verified.',
        data: null
      });
    }

    // Generate new verification OTP
    const verificationOTP = user.createEmailOTP();
    await user.save({ validateBeforeSave: false });

    // Send verification OTP email
    try {
      await emailService.sendVerificationOTP(email, user.name, verificationOTP);
      logger.info(`Verification OTP resent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to resend verification OTP to ${email}:`, emailError);
      throw new Error('Failed to send verification OTP. Please try again later.');
    }

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully.',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Send password reset OTP
 */
export const sendPasswordResetOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal that user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset OTP has been sent.',
        data: null
      });
    }

    if (!user.isEmailVerified) {
      throw new AuthenticationError('Please verify your email first before resetting password.');
    }

    // Generate OTP
    const otp = user.createEmailOTP();
    await user.save({ validateBeforeSave: false });

    // Send OTP email
    try {
      await emailService.sendPasswordResetOTP(email, user.name, otp);
      logger.info(`Password reset OTP sent to: ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send password reset OTP to ${email}:`, emailError);
      throw new Error('Failed to send password reset OTP. Please try again later.');
    }

    res.status(200).json({
      success: true,
      message: 'Password reset OTP sent to your email.',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP and reset password
 */
export const verifyOTPAndResetPassword = async (req, res, next) => {
  try {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
      throw new ValidationError('Email, OTP, and new password are required');
    }

    const user = await User.findOne({ email });

    if (!user) {
      throw new AuthenticationError('Invalid email or OTP');
    }

    // Verify OTP
    if (!user.verifyOTP(otp)) {
      throw new AuthenticationError('Invalid or expired OTP');
    }

    // Update password and clear OTP fields
    user.password = password;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    // Send password change notification
    try {
      await emailService.sendPasswordChangeNotification(user.email, user.name);
    } catch (emailError) {
      logger.error(`Failed to send password change notification to ${user.email}:`, emailError);
    }

    logger.info(`Password reset successful via OTP for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please log in with your new password.',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * User login with session management
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, forceLogin = false } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and account is not locked
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account has been deactivated');
    }

    if (!user.isEmailVerified) {
      throw new AuthenticationError('Please verify your email before logging in. Check your inbox for verification link.');
    }

    if (user.isLocked) {
      throw new AuthenticationError(
        `Account is locked until ${user.lockUntil.toLocaleString()}`
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      throw new AuthenticationError('Invalid email or password');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Check session limits if not force login
    if (!forceLogin) {
      const validationResult = await sessionService.validateLoginAttempt(
        user._id, 
        email, 
        ipAddress, 
        userAgent
      );

      if (!validationResult.canLogin) {
        return res.status(409).json({
          success: false,
          message: validationResult.message,
          code: 'SESSION_LIMIT_EXCEEDED',
          data: {
            maxSessions: 2,
            activeSessions: validationResult.activeSessions
          }
        });
      }
    }

    // Create or update session
    const session = forceLogin ? 
      await sessionService.forceLogin(user._id, email, ipAddress, userAgent) :
      await sessionService.createSession(user._id, email, ipAddress, userAgent);

    // Update user login info
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.ipAddress = ipAddress;
    user.userAgent = userAgent;
    await user.save({ validateBeforeSave: false });

    // Generate JWT token with session ID
    const token = jwtHelper.generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId
    });

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res.cookie('access_token', token, cookieOptions);

    // Remove password from response
    user.password = undefined;

    logger.info(`User logged in: ${email} (Session: ${session.sessionId})`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          deviceInfo: session.deviceInfo
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * User logout with session termination
 */
export const logout = async (req, res, next) => {
  try {
    const sessionId = req.user?.sessionId;
    const email = req.user?.email;
    const userId = req.user?._id;

    // Terminate session if sessionId is available
    if (sessionId && userId) {
      try {
        await sessionService.terminateSession(sessionId, userId);
        logger.info(`Session terminated during logout: ${email} (Session: ${sessionId})`);
      } catch (sessionError) {
        // Log the error but don't fail the logout process
        logger.warn(`Failed to terminate session during logout: ${email} (Session: ${sessionId}) - ${sessionError.message}`);
      }
    }

    // Clear cookie
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0)
    });

    logger.info(`User logged out: ${email || 'Unknown'} (Session: ${sessionId || 'Unknown'})`);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, timezone, language } = req.body;

    // Check if phone number is already taken by another user
    if (phone) {
      const existingUser = await User.findOne({
        phone,
        _id: { $ne: req.user._id }
      });

      if (existingUser) {
        throw new ConflictError('Phone number is already registered');
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(timezone && { timezone }),
        ...(language && { language }),
        lastActivity: new Date()
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`User profile updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Password changed successfully - user should log in again with new password

    logger.info(`Password changed for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal that user doesn't exist
      return res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
        data: null
      });
    }

    // Generate reset token
    const { resetToken, hashedToken, expires } = jwtHelper.createPasswordResetToken();

    // Save reset token to user
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expires;
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with reset token
    // For now, we'll just log it (remove in production)
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Hash the received token
    const hashedToken = jwtHelper.hashToken(token);

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    // Update password and clear reset token
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();
    await user.save();

    // Password reset - user will need to login again

    logger.info(`Password reset successful for user: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user's active sessions
 */
export const getActiveSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const currentSessionId = req.user.sessionId;

    const sessions = await sessionService.getUserSessions(userId);
    
    // Mark current session
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.sessionId === currentSessionId
    }));

    res.status(200).json({
      success: true,
      message: 'Active sessions retrieved successfully',
      data: {
        sessions: sessionsWithCurrent,
        maxSessions: 2
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Terminate a specific session
 */
export const terminateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const result = await sessionService.terminateSession(sessionId, userId);

    if (!result.success) {
      throw new NotFoundError(result.message);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Terminate all other sessions (except current)
 */
export const terminateAllOtherSessions = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const currentSessionId = req.user.sessionId;

    const result = await sessionService.terminateAllOtherSessions(userId, currentSessionId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Force login by terminating oldest session
 */
export const forceLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    // Check if user exists and account is not locked
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account has been deactivated');
    }

    if (!user.isEmailVerified) {
      throw new AuthenticationError('Please verify your email before logging in. Check your inbox for verification link.');
    }

    if (user.isLocked) {
      throw new AuthenticationError(
        `Account is locked until ${user.lockUntil.toLocaleString()}`
      );
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await user.incLoginAttempts();
      throw new AuthenticationError('Invalid email or password');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Force login (terminate oldest session)
    const session = await sessionService.forceLogin(user._id, email, ipAddress, userAgent);

    // Update user login info
    user.lastLogin = new Date();
    user.lastActivity = new Date();
    user.ipAddress = ipAddress;
    user.userAgent = userAgent;
    await user.save({ validateBeforeSave: false });

    // Generate JWT token with session ID
    const token = jwtHelper.generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId
    });

    // Set cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    };

    res.cookie('access_token', token, cookieOptions);

    // Remove password from response
    user.password = undefined;

    logger.info(`User force logged in: ${email} (Session: ${session.sessionId})`);

    res.status(200).json({
      success: true,
      message: 'Force login successful. Previous session has been terminated.',
      data: {
        user,
        token,
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          deviceInfo: session.deviceInfo
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
