import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

// Trust proxy (useful if behind reverse proxy)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS - More permissive for debugging
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    console.log('Request origin:', origin);
    console.log('Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: process.env.CORS_CREDENTIALS === 'true'
};

app.use(cors(corsOptions));

// Body parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Prevent HTTP parameter pollution
app.use(hpp());

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
});
app.use('/api', limiter);

// Environment logging for debugging (remove in production)
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  CORS_CREDENTIALS: process.env.CORS_CREDENTIALS,
  MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
  JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
});

// Routes
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'GoChart backend is running', data: null });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Backend is healthy', 
    data: {
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      cors: process.env.CORS_ORIGIN
    }
  });
});
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

// Error handler
app.use(errorHandler);

export default app;