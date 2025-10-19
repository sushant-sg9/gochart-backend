import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('SMTP configuration error:', error);
        } else {
          logger.info('SMTP server is ready to take our messages');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `${process.env.FROM_NAME || 'GoChart'} <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  htmlToText(html) {
    // Simple HTML to text conversion
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  async sendVerificationOTP(email, name, otp) {
    const subject = 'Verify Your GoChart Account - OTP';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .otp-box { background: #f8f9ff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
          .otp { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
            <p>Welcome to GoChart!</p>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Thank you for signing up with GoChart! To complete your registration and start analyzing market trends, please verify your email address using the OTP below:</p>
            
            <div class="otp-box">
              <p>Your Verification OTP:</p>
              <div class="otp">${otp}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</li>
                <li>Never share this OTP with anyone</li>
                <li>GoChart staff will never ask for your OTP</li>
              </ul>
            </div>
            
            <p>If you didn't create an account with GoChart, please ignore this email.</p>
            
            <p>Best regards,<br>The GoChart Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GoChart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  async sendVerificationEmail(email, name, verificationToken) {
    const subject = 'Verify Your GoChart Account';
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to GoChart!</h1>
            <p>Professional Market Analysis Platform</p>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>Thank you for signing up with GoChart! To complete your registration and start analyzing market trends, please verify your email address.</p>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
              ${verificationUrl}
            </p>
            
            <p><strong>This verification link will expire in 24 hours.</strong></p>
            
            <p>If you didn't create an account with GoChart, please ignore this email.</p>
            
            <p>Best regards,<br>The GoChart Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GoChart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  async sendPasswordResetOTP(email, name, otp) {
    const subject = 'GoChart Password Reset - OTP Verification';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .otp-box { background: #f8f9ff; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
          .otp { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>GoChart Security Team</p>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            <p>We received a request to reset your GoChart account password. Use the OTP below to proceed:</p>
            
            <div class="otp-box">
              <p>Your One-Time Password (OTP):</p>
              <div class="otp">${otp}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This OTP will expire in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes</li>
                <li>Never share this OTP with anyone</li>
                <li>GoChart staff will never ask for your OTP</li>
              </ul>
            </div>
            
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            
            <p>For security purposes, this OTP can only be used once.</p>
            
            <p>Best regards,<br>The GoChart Security Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GoChart. All rights reserved.</p>
            <p>If you need help, contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to GoChart - Account Verified Successfully!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .feature { background: #f8f9ff; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; border-radius: 0 5px 5px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to GoChart!</h1>
            <p>Your account is now verified and ready to use</p>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Congratulations! Your GoChart account has been successfully verified. You now have access to our comprehensive market analysis platform.</p>
            
            <h3>What you can do now:</h3>
            <div class="feature">
              <strong>📈 Real-time Market Analysis</strong><br>
              Access live charts and market data for forex, crypto, and more
            </div>
            <div class="feature">
              <strong>🔍 Advanced Analytics</strong><br>
              Use professional-grade indicators and analysis tools
            </div>
            
            <p>If you have any questions or need assistance, our support team is here to help.</p>
            
            <p>Happy trading and analyzing!<br>The GoChart Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GoChart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }

  async sendPasswordChangeNotification(email, name) {
    const subject = 'GoChart Password Changed Successfully';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Password Changed</h1>
            <p>GoChart Security Notification</p>
          </div>
          <div class="content">
            <h2>Hi ${name},</h2>
            
            <div class="success">
              <strong>✅ Success:</strong> Your GoChart account password has been changed successfully.
            </div>
            
            <p><strong>Details:</strong></p>
            <ul>
              <li>Date: ${new Date().toLocaleString()}</li>
              <li>Account: ${email}</li>
              <li>Action: Password Reset Completed</li>
            </ul>
            
            <p>If you did not make this change, please contact our support team immediately.</p>
            
            <p>For your security, you may need to log in again with your new password.</p>
            
            <p>Best regards,<br>The GoChart Security Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GoChart. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(email, subject, html);
  }
}

// Export singleton instance
export default new EmailService();