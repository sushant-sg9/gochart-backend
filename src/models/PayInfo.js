import mongoose from 'mongoose';

const payInfoSchema = new mongoose.Schema({
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be positive']
  },
  month: {
    type: Number,
    required: [true, 'Month duration is required'],
    min: [1, 'Month duration must be at least 1']
  },
  qrcodeUrl: {
    type: String,
    required: [true, 'QR code URL is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: {
      values: ['crypto', 'regular'],
      message: 'Payment type must be either crypto or regular'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
payInfoSchema.index({ type: 1, isActive: 1 });
payInfoSchema.index({ month: 1, type: 1 });

// Virtual for monthly rate calculation
payInfoSchema.virtual('monthlyRate').get(function() {
  return this.month > 0 ? this.price / this.month : 0;
});

// Static method to get active plans by type
payInfoSchema.statics.getActiveByType = function(type) {
  return this.find({ type, isActive: true }).sort({ month: 1, price: 1 });
};

// Static method to get all active plans
payInfoSchema.statics.getAllActive = function() {
  return this.find({ isActive: true }).sort({ type: 1, month: 1 });
};

// Instance method to deactivate plan
payInfoSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

export default mongoose.model('PayInfo', payInfoSchema);