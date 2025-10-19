import Session from '../models/Session.js';
import logger from '../utils/logger.js';
import { ConflictError } from '../utils/errors.js';

class SessionService {
  constructor() {
    this.MAX_ACTIVE_SESSIONS = 2;
    this.SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Parse user agent to extract device information
   */
  parseUserAgent(userAgent) {
    const deviceInfo = {
      userAgent,
      platform: 'unknown',
      browser: 'unknown',
      deviceType: 'desktop'
    };

    if (!userAgent) return deviceInfo;

    // Detect mobile devices
    if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent)) {
      deviceInfo.deviceType = 'mobile';
      if (/iPad/i.test(userAgent)) {
        deviceInfo.deviceType = 'tablet';
      }
    }

    // Detect platform
    if (/Windows/i.test(userAgent)) deviceInfo.platform = 'Windows';
    else if (/Mac OS/i.test(userAgent)) deviceInfo.platform = 'macOS';
    else if (/Linux/i.test(userAgent)) deviceInfo.platform = 'Linux';
    else if (/Android/i.test(userAgent)) deviceInfo.platform = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) deviceInfo.platform = 'iOS';

    // Detect browser
    if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) deviceInfo.browser = 'Chrome';
    else if (/Firefox/i.test(userAgent)) deviceInfo.browser = 'Firefox';
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) deviceInfo.browser = 'Safari';
    else if (/Edg/i.test(userAgent)) deviceInfo.browser = 'Edge';
    else if (/Opera/i.test(userAgent)) deviceInfo.browser = 'Opera';

    return deviceInfo;
  }

  /**
   * Create a new session for user login
   */
  async createSession(userId, email, ipAddress, userAgent) {
    try {
      // Parse device information
      const deviceInfo = this.parseUserAgent(userAgent);
      deviceInfo.ipAddress = ipAddress;

      // Check current active sessions
      const activeSessions = await Session.getActiveSessions(userId);
      const activeCount = activeSessions.length;

      logger.info(`User ${email} has ${activeCount} active sessions`);

      // If user has reached the maximum limit
      if (activeCount >= this.MAX_ACTIVE_SESSIONS) {
        // Check if this is the same device (same user agent and IP)
        const sameDevice = activeSessions.find(session => 
          session.deviceInfo.userAgent === userAgent && 
          session.deviceInfo.ipAddress === ipAddress
        );

        if (sameDevice) {
          // Update existing session instead of creating new one
          sameDevice.lastActivity = new Date();
          sameDevice.loginTime = new Date();
          sameDevice.isOnline = true;
          sameDevice.expiresAt = new Date(Date.now() + this.SESSION_DURATION);
          await sameDevice.save();
          
          logger.info(`Updated existing session for user ${email} on same device`);
          return sameDevice;
        } else {
          // Terminate the oldest session to make room for new one
          const oldestSession = activeSessions.sort((a, b) => 
            new Date(a.lastActivity) - new Date(b.lastActivity)
          )[0];

          await oldestSession.invalidate();
          logger.info(`Terminated oldest session for user ${email} due to device limit`);
        }
      }

      // Create new session
      const session = new Session({
        userId,
        email: email.toLowerCase(),
        isActive: true,
        isOnline: true,
        deviceInfo,
        lastActivity: new Date(),
        loginTime: new Date(),
        expiresAt: new Date(Date.now() + this.SESSION_DURATION)
      });

      await session.save();
      logger.info(`Created new session for user ${email}: ${session.sessionId}`);
      
      return session;

    } catch (error) {
      logger.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Validate if user can login (check session limits)
   */
  async validateLoginAttempt(userId, email, ipAddress, userAgent) {
    try {
      const activeSessions = await Session.getActiveSessions(userId);
      const activeCount = activeSessions.length;

      // If under the limit, allow login
      if (activeCount < this.MAX_ACTIVE_SESSIONS) {
        return { canLogin: true, message: 'Login allowed' };
      }

      // Check if this is the same device
      const sameDevice = activeSessions.find(session => 
        session.deviceInfo.userAgent === userAgent && 
        session.deviceInfo.ipAddress === ipAddress
      );

      if (sameDevice) {
        return { canLogin: true, message: 'Same device login' };
      }

      // At the limit and different device
      return {
        canLogin: false,
        message: `Maximum ${this.MAX_ACTIVE_SESSIONS} devices allowed. Please logout from another device first.`,
        activeSessions: activeSessions.map(session => ({
          sessionId: session.sessionId,
          deviceInfo: session.deviceInfo,
          lastActivity: session.lastActivity,
          loginTime: session.loginTime
        }))
      };

    } catch (error) {
      logger.error('Error validating login attempt:', error);
      throw error;
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserSessions(userId) {
    try {
      const sessions = await Session.getActiveSessions(userId);
      return sessions.map(session => ({
        sessionId: session.sessionId,
        deviceInfo: session.deviceInfo,
        location: session.location,
        lastActivity: session.lastActivity,
        loginTime: session.loginTime,
        isOnline: session.isOnline,
        isCurrent: false // Will be set by controller if this is current session
      }));
    } catch (error) {
      logger.error('Error getting user sessions:', error);
      throw error;
    }
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId, userId) {
    try {
      const session = await Session.findOne({
        sessionId,
        userId,
        isActive: true
      });

      if (!session) {
        return { success: false, message: 'Session not found' };
      }

      await session.invalidate();
      logger.info(`Session terminated: ${sessionId} for user: ${userId}`);
      
      return { success: true, message: 'Session terminated successfully' };
    } catch (error) {
      logger.error('Error terminating session:', error);
      throw error;
    }
  }

  /**
   * Terminate all sessions for a user (except current one)
   */
  async terminateAllOtherSessions(userId, currentSessionId) {
    try {
      const result = await Session.updateMany(
        { 
          userId, 
          isActive: true,
          sessionId: { $ne: currentSessionId }
        },
        {
          $set: {
            isActive: false,
            isOnline: false,
            logoutTime: new Date()
          }
        }
      );

      logger.info(`Terminated ${result.modifiedCount} sessions for user: ${userId}`);
      return { success: true, message: `Terminated ${result.modifiedCount} sessions` };
    } catch (error) {
      logger.error('Error terminating all other sessions:', error);
      throw error;
    }
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId) {
    try {
      const session = await Session.findOne({
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (session) {
        await session.updateActivity();
        return session;
      }
      return null;
    } catch (error) {
      logger.error('Error updating session activity:', error);
      return null;
    }
  }

  /**
   * Logout user from specific session
   */
  async logout(sessionId) {
    try {
      const session = await Session.findOne({
        sessionId,
        isActive: true
      });

      if (session) {
        await session.invalidate();
        logger.info(`User logged out from session: ${sessionId}`);
        return { success: true, message: 'Logout successful' };
      }
      
      return { success: false, message: 'Session not found' };
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions() {
    try {
      const result = await Session.cleanupExpired();
      logger.info(`Cleaned up ${result.deletedCount} expired sessions`);
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
      return 0;
    }
  }

  /**
   * Force login by terminating oldest session
   */
  async forceLogin(userId, email, ipAddress, userAgent) {
    try {
      // Get active sessions
      const activeSessions = await Session.getActiveSessions(userId);
      
      if (activeSessions.length >= this.MAX_ACTIVE_SESSIONS) {
        // Terminate oldest session
        const oldestSession = activeSessions.sort((a, b) => 
          new Date(a.lastActivity) - new Date(b.lastActivity)
        )[0];

        await oldestSession.invalidate();
        logger.info(`Force login: Terminated oldest session for user ${email}`);
      }

      // Create new session
      return await this.createSession(userId, email, ipAddress, userAgent);
    } catch (error) {
      logger.error('Error during force login:', error);
      throw error;
    }
  }
}

export default new SessionService();