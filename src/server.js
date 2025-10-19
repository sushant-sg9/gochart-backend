import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/database.js';
import cronJobs from './services/cronJobs.js';

const PORT = process.env.PORT || 5001;

(async () => {
  try {
    // Start server first
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} (env: ${process.env.NODE_ENV})`);
    });

    // Try to connect to database (non-blocking)
    try {
      await connectDB();
      // Start cron jobs only after DB connection
      cronJobs.start();
    } catch (dbError) {
      console.warn('⚠️  Database connection failed, but server is still running:', dbError.message);
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      cronJobs.stop();
      server.close(() => {
        console.log('Process terminated');
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})();
