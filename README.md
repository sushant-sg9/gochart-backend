# GoChart Backend - New Enhanced Version

Modern, secure, and scalable Node.js backend for the GoChart trading platform.

## 🚀 Features

- **Modern Node.js Architecture**: ES modules, async/await, clean code structure
- **Enhanced Security**: JWT authentication, session management, rate limiting, input validation
- **Database**: MongoDB with Mongoose ODM, proper connection handling
- **API Design**: RESTful APIs with consistent response format (`success: true/false, data, message`)
- **Admin Panel**: User management, payment processing, subscription handling
- **Cron Jobs**: Automated premium status checks and session cleanup
- **Logging**: Winston-based logging with file and console transports
- **Error Handling**: Centralized error handling with proper HTTP status codes

## 📁 Project Structure

```
src/
├── config/          # Database configuration
├── controllers/     # Route controllers (auth, user, admin)
├── middleware/      # Custom middleware (auth, error handling)
├── models/         # Mongoose models (User, Session)
├── routes/         # Express routes
├── services/       # Business logic services (cron jobs)
├── utils/          # Utility functions (JWT, logger, errors)
├── validators/     # Input validation schemas
├── app.js          # Express app configuration
└── server.js       # Server startup
```

## 🛠️ Installation

1. **Clone/Navigate to the project:**
   ```bash
   cd D:\Gochart\gochart-backend-new
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   - Copy `.env.example` to `.env`
   - Update environment variables as needed

## 🔧 Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=5001
API_VERSION=v1

# Database (MongoDB Atlas)
MONGODB_URI=mongodb+srv://gochart2:gochart%40123@cluster0.hy3lpp6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Security Configuration
BCRYPT_SALT_ROUNDS=12

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cron Jobs
SUBSCRIPTION_CHECK_CRON=0 */6 * * *
```

## 🚦 API Endpoints

### Authentication Routes (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login  
- `POST /logout` - User logout
- `GET /me` - Get current user profile
- `PUT /profile` - Update user profile
- `PUT /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `GET /sessions` - Get user sessions
- `DELETE /sessions/:sessionId` - Terminate session

### User Routes (`/api/v1/user`)
- `GET /` - Get current user (frontend compatible)
- `GET /all` - Get all users (admin)
- `PUT /:userId/subscription` - Update subscription (admin)
- `DELETE /:userId` - Delete user (admin)

### Admin Routes (`/api/v1/admin`)
- `GET /check-premium-status` - Check premium status (cron job)
- `GET /dashboard-stats` - Get dashboard statistics
- `PUT /users/:userId/payment` - Update payment status
- `GET /users/:userId/payment` - Get payment info
- `GET /payments` - Get all payments
- `GET /online-users` - Get online users

## 🏃‍♂️ Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:5001`

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable salt rounds
- **Session Management**: Device tracking and session invalidation
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Joi-based request validation
- **CORS Protection**: Configurable cross-origin requests
- **Security Headers**: Helmet.js security headers
- **MongoDB Sanitization**: Prevents NoSQL injection
- **HTTP Parameter Pollution**: HPP protection

## 📊 User Model Fields (Compatible with Frontend)

```javascript
{
  name: String,
  role: String (default: "user"),
  phone: String (unique),
  email: String (unique), 
  password: String,
  isPremium: Boolean (default: false),
  transactionId: String,
  status: String (enum: ["pending", "paid", "cancel"], default: "cancel"),
  premiumStartDate: Date,
  utrNo: String,
  subscriptionMonths: Number,
  premiumEndDate: Date,
  paymentType: String (enum: ["crypto", "regular"]),
  paymentAmount: Number,
  paymentPlanId: String
}
```

## 🕐 Cron Jobs

- **Premium Status Check**: Runs every 6 hours (configurable)
- **Session Cleanup**: Runs daily at 2 AM
- **Graceful Shutdown**: Properly stops cron jobs on server shutdown

## 📝 API Response Format

All APIs return consistent response format:

```javascript
{
  success: boolean,
  message: string,
  data: any | null
}
```

## 🐛 Error Handling

- Development mode: Detailed error information
- Production mode: Safe error messages
- Centralized error logging
- Proper HTTP status codes

## 🔄 Migration from Old Backend

This backend is designed to be compatible with your existing frontend:
- Same User model fields
- Compatible API endpoints (`/api/v1/user/` for getting current user)
- Session-token header support
- Same authentication flow

## 🚀 Next Steps

1. **Test the endpoints** with your frontend
2. **Update frontend API URLs** to point to `http://localhost:5001`
3. **Configure production environment** variables
4. **Set up SSL certificates** for production
5. **Deploy to production** server

## 📞 Support

The backend is production-ready with:
- ✅ Secure authentication
- ✅ Modern architecture  
- ✅ Error handling
- ✅ Logging
- ✅ Cron jobs
- ✅ Frontend compatibility