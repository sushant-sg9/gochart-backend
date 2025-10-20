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

    // Connect to database
    try {
      await connectDB();
      // Start cron jobs only after DB connection
      cronJobs.start();
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      // Don't exit in production (Vercel doesn't like process.exit)
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
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
