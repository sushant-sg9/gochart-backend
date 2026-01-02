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

/* =========================
   TRUST PROXY (NGINX)
========================= */
app.set('trust proxy', 1);

/* =========================
   SECURITY HEADERS
========================= */
app.use(helmet());

/* =========================
   CORS CONFIG (FIXED)
========================= */
const allowedOrigins = [
  'http://sushantsg9.duckdns.org',
  'https://sushantsg9.duckdns.org'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error('CORS blocked:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.options('*', cors());

/* =========================
   BODY & COOKIE PARSERS
========================= */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================
   SANITIZATION & HARDENING
========================= */
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

/* =========================
   RATE LIMITING
========================= */
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

/* =========================
   HEALTH & ROOT
========================= */
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GoChart backend is running',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is healthy',
    data: {
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      corsAllowed: allowedOrigins,
    },
  });
});

/* =========================
   API ROUTES
========================= */
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use(errorHandler);

export default app;
