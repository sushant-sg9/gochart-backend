import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import User from '../models/User.js';
import sessionService from '../services/sessionService.js';
import logger from '../utils/logger.js';
import { AuthenticationError } from '../utils/errors.js';

/**
 * Enhanced authentication middleware with session validation
 */
export const authenticateWithSession = async (req, res, next) => {
  try {
    let token;

    // Get token from cookie or authorization header
    if (req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AuthenticationError('Access denied. No token provided.');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.sessionId) {
      throw new AuthenticationError('Invalid token format. Please login again.');
    }

    // Validate session exists and is active
    const session = await Session.findOne({
      sessionId: decoded.sessionId,
      userId: decoded.id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      // Clear invalid cookie
      res.cookie('access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0)
      });
      
      throw new AuthenticationError('Session expired or invalid. Please login again.');
    }

    // Get user details
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      // Invalidate session if user is inactive
      await session.invalidate();
      throw new AuthenticationError('User account not found or inactive.');
    }

    // Update session activity
    await sessionService.updateSessionActivity(session.sessionId);

    // Add user and session info to request
    req.user = {
      _id: user._id,
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionId: session.sessionId,
      sessionData: {
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        deviceInfo: session.deviceInfo,
        ipAddress: session.deviceInfo.ipAddress
      }
    };

    next();

  } catch (error) {
    // Handle JWT specific errors
    if (error.name === 'JsonWebTokenError') {
      error = new AuthenticationError('Invalid token. Please login again.');
    } else if (error.name === 'TokenExpiredError') {
      error = new AuthenticationError('Token expired. Please login again.');
    }

    // Clear cookie on any auth error
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0)
    });

    logger.warn(`Authentication failed: ${error.message}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });

    next(error);
  }
};

/**
 * Middleware to require admin role with session validation
 */
export const requireAdminWithSession = async (req, res, next) => {
  try {
    // First authenticate with session
    await authenticateWithSession(req, res, (error) => {
      if (error) return next(error);
      
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return next(new AuthenticationError('Access denied. Admin rights required.'));
      }
      
      next();
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware (doesn't throw error if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    await authenticateWithSession(req, res, (error) => {
      // If authentication fails, continue without user data
      if (error) {
        req.user = null;
      }
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Middleware to validate session without full authentication
 * Useful for checking if a session is still valid
 */
export const validateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      throw new AuthenticationError('Session ID is required');
    }

    const session = await Session.findOne({
      sessionId,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      throw new AuthenticationError('Session not found or expired');
    }

    req.session = session;
    next();

  } catch (error) {
    next(error);
  }
};

export default {
  authenticateWithSession,
  requireAdminWithSession,
  optionalAuth,
  validateSession
};