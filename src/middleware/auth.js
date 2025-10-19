import jwtHelper from '../utils/jwt.js';
import User from '../models/User.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Extract token from request
 * @param {Object} req - Express request object
 * @returns {string|null} Token or null
 */
const extractToken = (req) => {
  let token = null;
  
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Check cookies as fallback
  if (!token && req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }
  
  return token;
};

/**
 * Middleware to authenticate user
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      throw new AuthenticationError('Access token is required');
    }

    // Verify token
    const decoded = await jwtHelper.verifyToken(token);
    
    if (!decoded || !decoded.id) {
      throw new AuthenticationError('Invalid token payload');
    }

    // Get user from database
    const user = await User.findById(decoded.id).select('+password');
    
    if (!user) {
      throw new AuthenticationError('User no longer exists');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account has been deactivated');
    }

    // Check if user is locked
    if (user.isLocked) {
      throw new AuthenticationError('Account is temporarily locked');
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new AuthenticationError('Password was changed recently. Please log in again');
    }

    // Update last activity
    user.lastActivity = new Date();
    user.ipAddress = req.ip;
    user.userAgent = req.get('User-Agent');
    await user.save({ validateBeforeSave: false });

    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    next(error);
  }
};


/**
 * Middleware to authorize user roles
 * @param {...string} roles - Required roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Middleware to check premium subscription
 */
export const requirePremium = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('User not authenticated'));
  }

  if (!req.user.isPremium || !req.user.isSubscriptionActive) {
    return next(new AuthorizationError('Premium subscription required'));
  }

  next();
};

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = await jwtHelper.verifyToken(token);
    
    if (decoded && decoded.id) {
      const user = await User.findById(decoded.id);
      
      if (user && user.isActive && !user.isLocked) {
        req.user = user;
        req.token = token;
      }
    }
    
    next();
  } catch (error) {
    // Silently fail for optional auth
    logger.warn('Optional authentication warning:', error.message);
    next();
  }
};

/**
 * Middleware to refresh user data
 */
export const refreshUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    // Refresh user data from database
    const user = await User.findById(req.user._id);
    
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    logger.error('User refresh error:', error.message);
    next(error);
  }
};