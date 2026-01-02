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

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

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

app.post('/api/v1/test', (req, res) => {
  try {
    console.log('Test endpoint hit with:', req.body);
    res.status(200).json({ 
      success: true, 
      message: 'Test endpoint working', 
      data: req.body
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Test failed', 
      error: error.message
    });
  }
});
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

// CORS Error Handler
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    console.error('CORS Error:', {
      origin: req.get('Origin'),
      allowedOrigins: process.env.CORS_ORIGIN,
      method: req.method,
      url: req.url
    });
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation: Origin not allowed',
      error: 'CORS_ERROR'
    });
  }
  next(err);
});

// Error handler
app.use(errorHandler);

export default app;