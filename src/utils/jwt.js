import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { promisify } from 'util';

class JWTHelper {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    
    if (!this.secret) {
      throw new Error('JWT_SECRET is required in environment variables');
    }
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {string} expiresIn - Token expiration time
   * @returns {string} JWT token
   */
  generateToken(payload, expiresIn = this.expiresIn) {
    return jwt.sign(payload, this.secret, {
      expiresIn,
      issuer: 'gochart-backend',
      audience: 'gochart-client'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object>} Decoded token payload
   */
  async verifyToken(token) {
    try {
      return await promisify(jwt.verify)(token, this.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Generate access and refresh token pair
   * @param {Object} payload - Token payload
   * @returns {Object} Token pair
   */
  generateTokenPair(payload) {
    const accessToken = this.generateToken(payload, '15m'); // 15 minutes
    const refreshToken = this.generateToken(
      { ...payload, type: 'refresh' }, 
      '7d' // 7 days
    );
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 // 15 minutes in seconds
    };
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length
   * @returns {string} Random token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash token using crypto
   * @param {string} token - Token to hash
   * @returns {string} Hashed token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Create password reset token
   * @returns {Object} Reset token data
   */
  createPasswordResetToken() {
    const resetToken = this.generateSecureToken();
    const hashedToken = this.hashToken(resetToken);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return {
      resetToken,
      hashedToken,
      expires
    };
  }

  /**
   * Decode token without verification (for extracting payload)
   * @param {string} token - JWT token
   * @returns {Object} Decoded payload
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  isTokenExpired(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date
   */
  getTokenExpiration(token) {
    try {
      const decoded = this.decodeToken(token);
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate session token
   * @param {Object} sessionData - Session data
   * @returns {string} Session token
   */
  generateSessionToken(sessionData) {
    return this.generateToken({
      ...sessionData,
      type: 'session'
    }, '24h');
  }
}

export default new JWTHelper();