import express from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, userPaymentSchema } from '../validators/paymentValidator.js';

const router = express.Router();

/**
 * @route   GET /api/v1/user/
 * @desc    Get current user (uses JWT authentication)
 * @access  Private
 */
router.get('/', authenticate, userController.getUser);

/**
 * @route   POST /api/v1/user/payment
 * @desc    Submit payment details (compatible with old backend)
 * @access  Private
 */
router.post('/payment', authenticate, validate(userPaymentSchema), userController.payment);

/**
 * @route   GET /api/v1/user/chart-history
 * @desc    Get last 5 chart history entries for the current user
 * @access  Private
 */
router.get('/chart-history', authenticate, userController.getChartHistory);

/**
 * @route   POST /api/v1/user/chart-history
 * @desc    Add or update a chart history entry for the current user
 * @access  Private
 */
router.post('/chart-history', authenticate, userController.addChartHistoryEntry);

/**
 * @route   GET /api/v1/user/all
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/all', authenticate, authorize('admin'), userController.getAllUsers);

/**
 * @route   PUT /api/v1/user/:userId/subscription
 * @desc    Update user subscription (admin only)
 * @access  Private (Admin)
 */
router.put('/:userId/subscription', authenticate, authorize('admin'), userController.updateSubscription);

/**
 * @route   DELETE /api/v1/user/:userId
 * @desc    Delete user (admin only)
 * @access  Private (Admin)
 */
router.delete('/:userId', authenticate, authorize('admin'), userController.deleteUser);

export default router;