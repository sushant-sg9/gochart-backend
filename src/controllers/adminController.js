import User from '../models/User.js';
import Session from '../models/Session.js';
import PayInfo from '../models/PayInfo.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors.js';

/**
 * Check and update premium status (cron job endpoint)
 */
export const checkPremiumStatus = async (req, res, next) => {
  try {
    const currentDate = new Date();
    
    // Find expired premium users
    const expiredUsers = await User.find({
      isPremium: true,
      premiumEndDate: { $lt: currentDate },
      status: { $ne: 'cancel' }
    });

    let updatedCount = 0;

    // Update expired users
    for (const user of expiredUsers) {
      user.isPremium = false;
      user.status = 'cancel';
      await user.save();
      updatedCount++;
      
      logger.info(`Premium expired for user: ${user.email}`);
    }

    res.status(200).json({
      success: true,
      message: `Premium status check completed. ${updatedCount} users updated`,
      data: {
        updatedCount,
        checkedAt: currentDate
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    // Get user statistics
    const totalUsers = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ isPremium: true });
    const pendingUsers = await User.countDocuments({ status: 'pending' });
    const paidUsers = await User.countDocuments({ status: 'paid' });
    
    // Get online users count
    const onlineUsers = await Session.getOnlineUsersCount();
    
    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get revenue statistics (basic calculation)
    const totalRevenue = await User.aggregate([
      {
        $match: {
          status: 'paid',
          paymentAmount: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paymentAmount' }
        }
      }
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

    res.status(200).json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        users: {
          total: totalUsers,
          premium: premiumUsers,
          pending: pendingUsers,
          paid: paidUsers,
          online: onlineUsers,
          recentRegistrations
        },
        revenue: {
          total: revenue,
          currency: 'USD' // You can make this dynamic
        },
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user payment status
 */
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      status,
      isPremium,
      subscriptionMonths,
      paymentAmount,
      paymentType,
      transactionId,
      utrNo
    } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Update payment status
    if (status) user.status = status;
    if (typeof isPremium !== 'undefined') user.isPremium = isPremium;
    if (paymentAmount) user.paymentAmount = paymentAmount;
    if (paymentType) user.paymentType = paymentType;
    if (transactionId) user.transactionId = transactionId;
    if (utrNo) user.utrNo = utrNo;

    // Set premium dates if making user premium
    if (isPremium && subscriptionMonths) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + subscriptionMonths);
      
      user.premiumStartDate = startDate;
      user.premiumEndDate = endDate;
      user.subscriptionMonths = subscriptionMonths;
    }

    await user.save();

    logger.info(`Payment status updated for user: ${user.email} - Status: ${status}`);

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user payment info
 */
export const getUserPaymentInfo = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      message: 'User payment info retrieved successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          isPremium: user.isPremium,
          status: user.status,
          premiumStartDate: user.premiumStartDate,
          premiumEndDate: user.premiumEndDate,
          subscriptionMonths: user.subscriptionMonths,
          paymentType: user.paymentType,
          paymentAmount: user.paymentAmount,
          transactionId: user.transactionId,
          utrNo: user.utrNo,
          paymentPlanId: user.paymentPlanId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all payment transactions
 */
export const getAllPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status = '', paymentType = '' } = req.query;
    
    const query = {
      paymentAmount: { $exists: true, $ne: null }
    };
    
    if (status) {
      query.status = status;
    }
    
    if (paymentType) {
      query.paymentType = paymentType;
    }

    const payments = await User.find(query)
      .select('name email phone isPremium status paymentType paymentAmount transactionId utrNo premiumStartDate premiumEndDate createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });
    
    const total = await User.countDocuments(query);
    
    res.status(200).json({
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPayments: total
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get online users
 */
export const getOnlineUsers = async (req, res, next) => {
  try {
    const onlineSessions = await Session.find({
      isOnline: true,
      isActive: true,
      expiresAt: { $gt: new Date() }
    })
    .populate('userId', 'name email')
    .sort({ lastActivity: -1 });

    const onlineUsers = onlineSessions.map(session => ({
      user: session.userId,
      lastActivity: session.lastActivity,
      loginTime: session.loginTime,
      deviceInfo: session.deviceInfo
    }));

    res.status(200).json({
      success: true,
      message: 'Online users retrieved successfully',
      data: {
        users: onlineUsers,
        count: onlineUsers.length
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all users (admin dashboard)
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
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user status (approve/decline payment)
 */
export const userStatus = async (req, res, next) => {
  try {
    const { status, id, premiumEndDate } = req.body;

    if (!id) {
      throw new ValidationError('User ID is required');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    let updateData = {};
    let message = '';
    let statusCode = 200;

    if (status && id) {
      // Approve payment
      updateData = {
        isPremium: true,
        status: 'paid',
        premiumStartDate: new Date(),
        premiumEndDate: premiumEndDate ? new Date(premiumEndDate) : null,
        isSubscriptionActive: true
      };
      message = 'User request accepted';
      statusCode = 200;
    } else if (!status && id) {
      // Decline payment
      updateData = {
        status: 'cancel',
        isPremium: false,
        premiumStartDate: null,
        premiumEndDate: null,
        subscriptionMonths: 0,
        utrNo: '',
        isSubscriptionActive: false
      };
      message = 'Request rejected';
      statusCode = 400;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, select: '-password' }
    );

    logger.info(`User status updated: ${user.email} - Status: ${updateData.status}`);

    res.status(200).json({
      success: true,
      message,
      data: updatedUser
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Change user subscription months
 */
export const changeSubMonths = async (req, res, next) => {
  try {
    const { email, months } = req.body;

    if (!email || !months) {
      throw new ValidationError('Email and subscription months are required');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!user.premiumStartDate) {
      throw new ValidationError('User does not have a premium start date');
    }

    // Calculate new end date based on start date + months
    let newPremiumEndDate = new Date(user.premiumStartDate);
    newPremiumEndDate.setMonth(newPremiumEndDate.getMonth() + parseInt(months));

    user.subscriptionMonths = parseInt(months);
    user.premiumEndDate = newPremiumEndDate;
    await user.save();

    logger.info(`Subscription months updated for ${email}: ${months} months`);

    res.status(200).json({
      success: true,
      message: 'Subscription months updated successfully',
      data: user
    });

  } catch (error) {
    next(error);
  }
};

// ============= PAYMENT PLAN MANAGEMENT =============

/**
 * Create payment plan
 */
export const createPaymentInfo = async (req, res, next) => {
  try {
    const { price, month, qrcodeUrl, type } = req.body;

    if (!price || !month || !qrcodeUrl || !type) {
      throw new ValidationError('All fields are required (price, month, qrcodeUrl, type)');
    }

    if (!['crypto', 'regular'].includes(type)) {
      throw new ValidationError('Type must be either crypto or regular');
    }

    // Check for duplicate plan (same type and month duration)
    const existingPlan = await PayInfo.findOne({ type, month, isActive: true });
    if (existingPlan) {
      throw new ConflictError(`A ${type} plan for ${month} month(s) already exists`);
    }

    const newPayment = new PayInfo({
      price: Number(price),
      month: Number(month),
      qrcodeUrl: qrcodeUrl.trim(),
      type
    });

    const savedPayment = await newPayment.save();

    logger.info(`Payment plan created: ${type} - ${month} months - $${price}`);

    res.status(201).json({
      success: true,
      message: 'Payment info created successfully',
      data: savedPayment
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update payment plan
 */
export const updatePaymentInfo = async (req, res, next) => {
  try {
    const { id, price, month, qrcodeUrl, type } = req.body;

    if (!id) {
      throw new ValidationError('Payment ID is required');
    }

    const paymentInfo = await PayInfo.findById(id);
    if (!paymentInfo) {
      throw new NotFoundError('Payment info not found');
    }

    if (type && !['crypto', 'regular'].includes(type)) {
      throw new ValidationError('Type must be either crypto or regular');
    }

    // Check for duplicate if type or month is being changed
    if ((type && type !== paymentInfo.type) || (month && month !== paymentInfo.month)) {
      const existingPlan = await PayInfo.findOne({
        type: type || paymentInfo.type,
        month: month || paymentInfo.month,
        isActive: true,
        _id: { $ne: id }
      });
      
      if (existingPlan) {
        throw new ConflictError(`A ${type || paymentInfo.type} plan for ${month || paymentInfo.month} month(s) already exists`);
      }
    }

    const updateData = {};
    if (price !== undefined) updateData.price = Number(price);
    if (month !== undefined) updateData.month = Number(month);
    if (qrcodeUrl !== undefined) updateData.qrcodeUrl = qrcodeUrl.trim();
    if (type !== undefined) updateData.type = type;

    const updatedPayment = await PayInfo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    logger.info(`Payment plan updated: ID ${id}`);

    res.status(200).json({
      success: true,
      message: 'Payment info updated successfully',
      data: updatedPayment
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all payment plans
 */
export const getAllPaymentInfo = async (req, res, next) => {
  try {
    const { includeInactive = 'false' } = req.query;
    
    const query = includeInactive === 'true' ? {} : { isActive: true };
    const paymentInfos = await PayInfo.find(query).sort({ type: 1, month: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Payment information retrieved successfully',
      data: paymentInfos
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all active payment plans (public access)
 */
export const getPublicPaymentInfo = async (req, res, next) => {
  try {
    const paymentInfos = await PayInfo.find({ isActive: true }).sort({ type: 1, month: 1 });

    res.status(200).json({
      success: true,
      message: 'Payment plans retrieved successfully',
      data: paymentInfos
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get payment plans by type
 */
export const getPaymentInfoByType = async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!['crypto', 'regular'].includes(type)) {
      throw new ValidationError('Type must be either crypto or regular');
    }

    const paymentInfo = await PayInfo.getActiveByType(type);

    res.status(200).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} payment information retrieved successfully`,
      data: paymentInfo
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete payment plan
 */
export const deletePaymentInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const paymentInfo = await PayInfo.findById(id);
    if (!paymentInfo) {
      throw new NotFoundError('Payment info not found');
    }

    // Soft delete by setting isActive to false
    await paymentInfo.deactivate();

    logger.info(`Payment plan deactivated: ID ${id}`);

    res.status(200).json({
      success: true,
      message: 'Payment info deleted successfully',
      data: paymentInfo
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete all user sessions
 */
export const deleteUserSessions = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Terminate all active sessions for the user
    const result = await Session.terminateUserSessions(userId);

    logger.info(`All sessions deleted for user: ${user.email} by admin: ${req.user.email}`);

    res.status(200).json({
      success: true,
      message: 'All user sessions deleted successfully',
      data: {
        userId,
        userEmail: user.email,
        sessionsTerminated: result.modifiedCount,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
};
