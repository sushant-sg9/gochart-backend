import cron from 'node-cron';
import logger from '../utils/logger.js';

class CronJobService {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5001';
  }

  /**
   * Start all cron jobs
   */
  start() {
    this.startPremiumStatusCheck();
    this.startSessionCleanup();
    logger.info('🕐 Cron jobs started successfully');
  }

  /**
   * Premium status check cron job
   * Runs every 6 hours by default
   */
  startPremiumStatusCheck() {
    const cronPattern = process.env.SUBSCRIPTION_CHECK_CRON || '0 */6 * * *';
    
    cron.schedule(cronPattern, async () => {
      try {
        logger.info('Starting premium status check...');
        
        const response = await fetch(`${this.baseUrl}/api/v1/admin/check-premium-status`);
        const data = await response.json();
        
        if (data.success) {
          logger.info(`Premium status check completed: ${data.message}`);
        } else {
          logger.error('Premium status check failed:', data.message);
        }
      } catch (error) {
        logger.error('Error in premium status cron job:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info(`Premium status check cron job scheduled: ${cronPattern}`);
  }

  /**
   * Session cleanup cron job
   * Runs daily at 2 AM
   */
  startSessionCleanup() {
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Starting session cleanup...');
        
        const { default: Session } = await import('../models/Session.js');
        const deletedCount = await Session.cleanupExpired();
        
        logger.info(`Session cleanup completed. ${deletedCount.deletedCount || 0} sessions removed.`);
      } catch (error) {
        logger.error('Error in session cleanup cron job:', error.message);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Session cleanup cron job scheduled: 0 2 * * *');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    cron.getTasks().forEach((task, name) => {
      task.stop();
      logger.info(`Cron job stopped: ${name}`);
    });
  }
}

export default new CronJobService();