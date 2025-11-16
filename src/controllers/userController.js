import User from '../models/User.js';
import PayInfo from '../models/PayInfo.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import logger from '../utils/logger.js';

/**
 * Get current user (uses JWT authentication)
 */
export const getUser = async (req, res, next) => {
  try {
    // User comes from authentication middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null
      });
    }

    // Remove password from response
    const userResponse = req.user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: userResponse
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user subscription status (for admin)
 */
export const updateSubscription = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { 
      isPremium, 
      status, 
      premiumStartDate, 
      premiumEndDate, 
      subscriptionMonths,
      paymentType,
      paymentAmount,
      transactionId,
      utrNo
    } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update subscription fields
    if (typeof isPremium !== 'undefined') user.isPremium = isPremium;
    if (status) user.status = status;
    if (premiumStartDate) user.premiumStartDate = new Date(premiumStartDate);
    if (premiumEndDate) user.premiumEndDate = new Date(premiumEndDate);
    if (subscriptionMonths) user.subscriptionMonths = subscriptionMonths;
    if (paymentType) user.paymentType = paymentType;
    if (paymentAmount) user.paymentAmount = paymentAmount;
    if (transactionId) user.transactionId = transactionId;
    if (utrNo) user.utrNo = utrNo;

    await user.save();

    logger.info(`User subscription updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    const query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add status filter
    if (status) {
      query.status = status;
    }
    
    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        users,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByIdAndDelete(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    logger.info(`User deleted: ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: null
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Submit payment (compatible with old backend)
 */
export const payment = async (req, res, next) => {
  try {
    const { utrNo, Months, price, type, paymentPlanId } = req.body;
    
    // Validation
    if (!utrNo) {
      throw new ValidationError('UTR number is required');
    }

    if (!Months || Months <= 0) {
      throw new ValidationError('Valid subscription months is required');
    }

    if (!type) {
      throw new ValidationError('Payment type is required');
    }

    if (!price || price <= 0) {
      throw new ValidationError('Valid payment amount is required');
    }

    // Validate payment type
    if (!['crypto', 'regular'].includes(type)) {
      throw new ValidationError('Invalid payment type. Must be crypto or regular');
    }

    // Verify payment plan exists if paymentPlanId is provided
    if (paymentPlanId) {
      const paymentPlan = await PayInfo.findById(paymentPlanId);
      if (!paymentPlan || !paymentPlan.isActive) {
        throw new ValidationError('Invalid payment plan selected');
      }
      
      // Validate that the provided details match the plan
      if (paymentPlan.type !== type || paymentPlan.month !== Months || paymentPlan.price !== price) {
        throw new ValidationError('Payment details do not match selected plan');
      }
    }

    // Get user from token (assuming authentication middleware sets req.user)
    const userId = req.user?._id;
    if (!userId) {
      throw new ValidationError('User authentication required');
    }

    // Update user with payment information
    const updateData = {
      utrNo: utrNo.trim(),
      status: 'pending',
      subscriptionMonths: parseInt(Months),
      paymentType: type,
      paymentAmount: Number(price),
      paymentPlanId: paymentPlanId || null,
      // Reset premium status while payment is pending
      isPremium: false,
      isSubscriptionActive: false
    };

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, select: '-password' }
    );

    if (!user) {
      throw new NotFoundError('User not found');
    }

    logger.info(`Payment submitted: ${user.email} - UTR: ${utrNo} - Amount: ${price} - Type: ${type}`);

    res.status(200).json({
      success: true,
      message: 'Payment request submitted successfully',
      data: {
        utrNo: user.utrNo,
        subscriptionMonths: user.subscriptionMonths,
        paymentType: user.paymentType,
        paymentAmount: user.paymentAmount,
        paymentPlanId: user.paymentPlanId,
        status: user.status
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get last 5 chart history entries for current user
 */
export const getChartHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
    }

    const user = await User.findById(req.user._id).select('recentCharts');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const history = (user.recentCharts || []).slice(0, 5);

    res.status(200).json({
      success: true,
      message: 'Chart history retrieved successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add or update a chart history entry for current user
 */
export const addChartHistoryEntry = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
    }

    const { symbol, title, path } = req.body;

    if (!symbol || !title || !path) {
      throw new ValidationError('symbol, title and path are required');
    }

    const user = await User.findById(req.user._id).select('recentCharts');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const existing = Array.isArray(user.recentCharts) ? user.recentCharts : [];

    // Remove any existing entry for this path or symbol
    const filtered = existing.filter((entry) => entry.path !== path && entry.symbol !== symbol);

    const newEntry = {
      symbol,
      title,
      path,
      openedAt: new Date(),
    };

    const updated = [newEntry, ...filtered].slice(0, 5);

    user.recentCharts = updated;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: 'Chart history updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
