import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const Schema = mongoose.Schema;
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "user",
  },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: true,
    select: false
  },
  // Authentication fields
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailOTP: String,
  emailOTPExpires: Date,
  isLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLogin: Date,
  lastActivity: Date,
  ipAddress: String,
  userAgent: String,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Premium fields
  isPremium: { type: Boolean, default: false },
  isSubscriptionActive: {
    type: Boolean,
    default: false
  },
  transactionId: { type: String },
  status: {
    type: String,
    default: "cancel",
    enum: ["pending", "paid", "cancel"],
  },
  premiumStartDate: { type: Date, default: null },
  utrNo: { type: String },
  subscriptionMonths: { type: Number },
  premiumEndDate: { type: Date, default: null },
  
  // Payment information
  paymentType: { 
    type: String, 
    enum: ["crypto", "regular", null], 
    default: null 
  },
  paymentAmount: { 
    type: Number, 
    default: null 
  },
  paymentPlanId: { 
    type: String, 
    default: null 
  },
  // Per-user recent chart history (max 5 entries, managed by controller)
  recentCharts: [
    {
      symbol: { type: String, required: true, trim: true },
      title: { type: String, required: true, trim: true },
      path: { type: String, required: true, trim: true },
      openedAt: { type: Date, default: Date.now },
    },
  ],
}, {
  timestamps: true
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, Number(process.env.BCRYPT_SALT_ROUNDS) || 12);
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: {
        loginAttempts: 1
      },
      $unset: {
        lockUntil: 1
      }
    });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  // If we have max attempts and we're not locked, lock the account
  const maxAttempts = 5; // You can make this configurable
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + lockTime,
      isLocked: true
    };
  }
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    },
    $set: {
      isLocked: false
    }
  });
};

// Virtual for checking if account is locked
userSchema.virtual('isAccountLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Instance method to generate email OTP
userSchema.methods.createEmailOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  
  this.emailOTP = crypto.createHash('sha256').update(otp).digest('hex');
  this.emailOTPExpires = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);
  
  return otp;
};

// Instance method to verify OTP
userSchema.methods.verifyOTP = function(otp) {
  if (!this.emailOTP || !this.emailOTPExpires) {
    return false;
  }
  
  if (this.emailOTPExpires < new Date()) {
    return false;
  }
  
  const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  return hashedOTP === this.emailOTP;
};

export default mongoose.model('User', userSchema);
