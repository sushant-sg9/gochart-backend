# GoChart Backend API Endpoints

All API responses follow the consistent format:
```json
{
  "success": boolean,
  "message": string,
  "data": any | null
}
```

## 🔐 Authentication Endpoints

### POST `/api/v1/auth/register`
- **Description**: Register new user
- **Access**: Public
- **Body**: `{ name, email, phone, password }`
- **Response**: `{ success: true, message: "Registration successful", data: { user, token } }`

### POST `/api/v1/auth/login`
- **Description**: User login
- **Access**: Public  
- **Body**: `{ email, password }`
- **Response**: `{ success: true, message: "Login successful", data: { user, token } }`

### POST `/api/v1/auth/logout`
- **Description**: User logout
- **Access**: Public
- **Body**: `{ email? }`
- **Response**: `{ success: true, message: "Logout successful", data: null }`

### GET `/api/v1/auth/me`
- **Description**: Get current user profile
- **Access**: Private (Bearer Token)
- **Response**: `{ success: true, message: "User profile retrieved successfully", data: user }`

### PUT `/api/v1/auth/profile`
- **Description**: Update user profile
- **Access**: Private (Bearer Token)
- **Body**: `{ name?, phone?, timezone?, language? }`
- **Response**: `{ success: true, message: "Profile updated successfully", data: user }`

### PUT `/api/v1/auth/change-password`
- **Description**: Change user password
- **Access**: Private (Bearer Token)
- **Body**: `{ currentPassword, newPassword }`
- **Response**: `{ success: true, message: "Password changed successfully", data: null }`

### POST `/api/v1/auth/forgot-password`
- **Description**: Request password reset
- **Access**: Public
- **Body**: `{ email }`
- **Response**: `{ success: true, message: "Password reset instructions sent", data: null }`

### POST `/api/v1/auth/reset-password`
- **Description**: Reset password with token
- **Access**: Public
- **Body**: `{ token, password }`
- **Response**: `{ success: true, message: "Password reset successful", data: null }`

## 👤 User Endpoints

### GET `/api/v1/user/`
- **Description**: Get current user (JWT authentication)
- **Access**: Private (Bearer Token)
- **Response**: `{ success: true, message: "User retrieved successfully", data: user }`

### POST `/api/v1/user/payment`
- **Description**: Submit payment details
- **Access**: Private (Bearer Token)
- **Body**: `{ utrNo, Months, price, type, paymentPlanId? }`
- **Response**: `{ success: true, message: "Payment request submitted successfully", data: { utrNo, subscriptionMonths, paymentType, paymentAmount, paymentPlanId, status } }`

### GET `/api/v1/user/chart-history`
|- **Description**: Get last 5 chart history entries for current user
|- **Access**: Private (Bearer Token)
|- **Response**: `{ success: true, message: "Chart history retrieved successfully", data: [{ symbol, title, path, openedAt }] }`

### POST `/api/v1/user/chart-history`
|- **Description**: Add or update a chart history entry for current user
|- **Access**: Private (Bearer Token)
|- **Body**: `{ symbol: string, title: string, path: string }`
|- **Response**: `{ success: true, message: "Chart history updated successfully", data: [{ symbol, title, path, openedAt }] }`

### GET `/api/v1/user/all`
- **Description**: Get all users (admin only)
- **Access**: Private (Admin)
- **Query**: `{ page?, limit?, search?, status? }`
- **Response**: `{ success: true, message: "Users retrieved successfully", data: { users, pagination } }`

### PUT `/api/v1/user/:userId/subscription`
- **Description**: Update user subscription (admin only)
- **Access**: Private (Admin)
- **Body**: `{ isPremium?, status?, premiumStartDate?, premiumEndDate?, subscriptionMonths?, paymentType?, paymentAmount?, transactionId?, utrNo? }`
- **Response**: `{ success: true, message: "Subscription updated successfully", data: user }`

### DELETE `/api/v1/user/:userId`
- **Description**: Delete user (admin only)
- **Access**: Private (Admin)
- **Response**: `{ success: true, message: "User deleted successfully", data: null }`

## 🔧 Admin Endpoints

### GET `/api/v1/admin/check-premium-status`
- **Description**: Check and update premium status (cron job endpoint)
- **Access**: Public (called by cron)
- **Response**: `{ success: true, message: "Premium status check completed. X users updated", data: { updatedCount, checkedAt } }`

### GET `/api/v1/admin/dashboard-stats`
- **Description**: Get dashboard statistics
- **Access**: Private (Admin)
- **Response**: `{ success: true, message: "Dashboard statistics retrieved successfully", data: { users, revenue, lastUpdated } }`

### PUT `/api/v1/admin/users/:userId/payment`
- **Description**: Update user payment status
- **Access**: Private (Admin)
- **Body**: `{ status?, isPremium?, subscriptionMonths?, paymentAmount?, paymentType?, transactionId?, utrNo? }`
- **Response**: `{ success: true, message: "Payment status updated successfully", data: user }`

### GET `/api/v1/admin/users/:userId/payment`
- **Description**: Get user payment info
- **Access**: Private (Admin)
- **Response**: `{ success: true, message: "User payment info retrieved successfully", data: { user } }`

### GET `/api/v1/admin/payments`
- **Description**: Get all payment transactions
- **Access**: Private (Admin)
- **Query**: `{ page?, limit?, status?, paymentType? }`
- **Response**: `{ success: true, message: "Payments retrieved successfully", data: { payments, currentPage, totalPages, totalPayments } }`

### GET `/api/v1/admin/online-users`
- **Description**: Get online users
- **Access**: Private (Admin)
- **Response**: `{ success: true, message: "Online users retrieved successfully", data: { users, count } }`

## 👥 User Management (Admin)

### GET `/api/v1/admin/users`
- **Description**: Get all users with pagination and search
- **Access**: Private (Admin)
- **Query**: `{ page?, limit?, search?, status? }`
- **Response**: `{ success: true, message: "Users retrieved successfully", data: { users, pagination } }`

### POST `/api/v1/admin/userstatus`
- **Description**: Approve/decline user payment (compatible with old backend)
- **Access**: Private (Admin)
- **Body**: `{ status: boolean, id: string, premiumEndDate?: string }`
- **Response**: `{ success: true, message: "User request accepted/Request rejected", data: user }`

### POST `/api/v1/admin/change-sub-months`
- **Description**: Change user subscription months
- **Access**: Private (Admin)
- **Body**: `{ email: string, months: number }`
- **Response**: `{ success: true, message: "Subscription months updated successfully", data: user }`

## 💳 Payment Plan Management

### POST `/api/v1/admin/create-payment-info`
- **Description**: Create new payment plan
- **Access**: Private (Admin)
- **Body**: `{ price: number, month: number, qrcodeUrl: string, type: "crypto"|"regular" }`
- **Response**: `{ success: true, message: "Payment info created successfully", data: paymentPlan }`

### PUT `/api/v1/admin/update-payment-info`
- **Description**: Update existing payment plan
- **Access**: Private (Admin)
- **Body**: `{ id: string, price?: number, month?: number, qrcodeUrl?: string, type?: "crypto"|"regular" }`
- **Response**: `{ success: true, message: "Payment info updated successfully", data: paymentPlan }`

### GET `/api/v1/admin/payment-info`
- **Description**: Get all payment plans
- **Access**: Private (Admin)
- **Query**: `{ includeInactive?: "true"|"false" }`
- **Response**: `{ success: true, message: "Payment information retrieved successfully", data: paymentPlans }`

### GET `/api/v1/admin/payment-info/:type`
- **Description**: Get payment plans by type (crypto/regular)
- **Access**: Public (users need to see payment options)
- **Params**: `type: "crypto"|"regular"`
- **Response**: `{ success: true, message: "Crypto/Regular payment information retrieved successfully", data: paymentPlans }`

### DELETE `/api/v1/admin/payment-info/:id`
- **Description**: Delete payment plan (soft delete)
- **Access**: Private (Admin)
- **Params**: `id: string`
- **Response**: `{ success: true, message: "Payment info deleted successfully", data: paymentPlan }`

## 🔍 Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## ⚠️ Error Responses

All errors follow the same format:
```json
{
  "success": false,  
  "message": "Error description",
  "data": null
}
```

## 🎯 Key Features

1. **Consistent Response Format**: All endpoints use the same `{ success, message, data }` structure
2. **JWT Authentication**: Single token system (no session tokens)
3. **Enhanced Validation**: Comprehensive input validation with Joi
4. **Soft Deletes**: Payment plans are deactivated, not permanently deleted
5. **Payment Plan Verification**: User payments are validated against selected plans
6. **Comprehensive Logging**: All operations are logged for monitoring
7. **Error Handling**: Proper error responses with meaningful messages