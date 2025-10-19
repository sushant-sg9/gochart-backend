import express from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  validate,
  createPaymentPlanSchema,
  updatePaymentPlanSchema,
  userStatusSchema,
  changeSubMonthsSchema,
  validatePaymentType
} from '../validators/paymentValidator.js';

const router = express.Router();

/**
 * @route   GET /api/v1/admin/check-premium-status
 * @desc    Check and update premium status (cron job endpoint)
 * @access  Public (called by cron job)
 */
router.get('/check-premium-status', adminController.checkPremiumStatus);

/**
 * @route   GET /api/v1/admin/dashboard-stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard-stats', authenticate, authorize('admin'), adminController.getDashboardStats);

/**
 * @route   PUT /api/v1/admin/users/:userId/payment
 * @desc    Update user payment status
 * @access  Private (Admin)
 */
router.put('/users/:userId/payment', authenticate, authorize('admin'), adminController.updatePaymentStatus);

/**
 * @route   GET /api/v1/admin/users/:userId/payment
 * @desc    Get user payment info
 * @access  Private (Admin)
 */
router.get('/users/:userId/payment', authenticate, authorize('admin'), adminController.getUserPaymentInfo);

/**
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payment transactions
 * @access  Private (Admin)
 */
router.get('/payments', authenticate, authorize('admin'), adminController.getAllPayments);

/**
 * @route   GET /api/v1/admin/online-users
 * @desc    Get online users
 * @access  Private (Admin)
 */
router.get('/online-users', authenticate, authorize('admin'), adminController.getOnlineUsers);

/**
 * @route   GET /api/v1/admin/getOnlineUsers
 * @desc    Get online users (compatible with old backend)
 * @access  Private (Admin)
 */
router.get('/getOnlineUsers', authenticate, authorize('admin'), adminController.getOnlineUsers);

// ============= USER MANAGEMENT =============

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (compatible with old backend)
 * @access  Private (Admin)
 */
router.get('/users', authenticate, authorize('admin'), adminController.getAllUsers);

/**
 * @route   GET /api/v1/admin/
 * @desc    Get all users (compatible with old backend - main route)
 * @access  Private (Admin)
 */
router.get('/', authenticate, authorize('admin'), adminController.getAllUsers);

/**
 * @route   POST /api/v1/admin/userstatus
 * @desc    Approve/decline user payment (compatible with old backend)
 * @access  Private (Admin)
 */
router.post('/userstatus', authenticate, authorize('admin'), validate(userStatusSchema), adminController.userStatus);

/**
 * @route   POST /api/v1/admin/change-sub-months
 * @desc    Change user subscription months (compatible with old backend)
 * @access  Private (Admin)
 */
router.post('/change-sub-months', authenticate, authorize('admin'), validate(changeSubMonthsSchema), adminController.changeSubMonths);

// ============= PAYMENT PLAN MANAGEMENT =============

/**
 * @route   POST /api/v1/admin/create-payment-info
 * @desc    Create new payment plan (compatible with old backend)
 * @access  Private (Admin)
 */
router.post('/create-payment-info', authenticate, authorize('admin'), validate(createPaymentPlanSchema), adminController.createPaymentInfo);

/**
 * @route   PUT /api/v1/admin/update-payment-info
 * @desc    Update existing payment plan (compatible with old backend)
 * @access  Private (Admin)
 */
router.put('/update-payment-info', authenticate, authorize('admin'), validate(updatePaymentPlanSchema), adminController.updatePaymentInfo);

/**
 * @route   GET /api/v1/admin/payment-info
 * @desc    Get all payment plans (compatible with old backend)
 * @access  Private (Admin)
 */
router.get('/payment-info', authenticate, authorize('admin'), adminController.getAllPaymentInfo);

/**
 * @route   GET /api/v1/admin/payment-info/public/all
 * @desc    Get all active payment plans (public access for users)
 * @access  Public
 */
router.get('/payment-info/public/all', adminController.getPublicPaymentInfo);

/**
 * @route   GET /api/v1/admin/payment-info/:type
 * @desc    Get payment plans by type (compatible with old backend)
 * @access  Public (users need to see payment options)
 */
router.get('/payment-info/:type', validatePaymentType, adminController.getPaymentInfoByType);

/**
 * @route   DELETE /api/v1/admin/payment-info/:id
 * @desc    Delete payment plan (compatible with old backend)
 * @access  Private (Admin)
 */
router.delete('/payment-info/:id', authenticate, authorize('admin'), adminController.deletePaymentInfo);

export default router;
