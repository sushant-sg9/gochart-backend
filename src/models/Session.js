import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(32)
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  deviceInfo: {
    userAgent: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    platform: {
      type: String,
      default: null
    },
    browser: {
      type: String,
      default: null
    }
  },
  location: {
    country: {
      type: String,
      default: null
    },
    city: {
      type: String,
      default: null
    },
    timezone: {
      type: String,
      default: null
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  logoutTime: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Sessions expire in 24 hours by default
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    },
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ email: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ isOnline: 1 });
sessionSchema.index({ lastActivity: -1 });

// Virtual for session duration
sessionSchema.virtual('duration').get(function() {
  const endTime = this.logoutTime || new Date();
  return endTime - this.loginTime;
});

// Instance method to update activity
sessionSchema.methods.updateActivity = function() {
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to mark session as offline
sessionSchema.methods.setOffline = function() {
  this.isOnline = false;
  this.logoutTime = new Date();
  return this.save();
};

// Instance method to invalidate session
sessionSchema.methods.invalidate = function() {
  this.isActive = false;
  this.isOnline = false;
  this.logoutTime = new Date();
  return this.save();
};

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false, logoutTime: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    ]
  });
};

// Static method to get active sessions for a user
sessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

// Static method to get online users count
sessionSchema.statics.getOnlineUsersCount = function() {
  return this.countDocuments({
    isOnline: true,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to terminate all sessions for a user
sessionSchema.statics.terminateUserSessions = function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    {
      $set: {
        isActive: false,
        isOnline: false,
        logoutTime: new Date()
      }
    }
  );
};

export default mongoose.model('Session', sessionSchema);