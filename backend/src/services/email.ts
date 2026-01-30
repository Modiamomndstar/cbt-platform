import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      logger.warn('Email service not configured. SMTP credentials missing.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort),
      secure: parseInt(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    this.isInitialized = true;
    logger.info('Email service initialized');
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter || !this.isInitialized) {
      logger.warn('Email service not initialized. Cannot send email.');
      return false;
    }

    try {
      const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;
      const fromName = process.env.FROM_NAME || 'CBT Platform';

      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html
      });

      logger.info(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      logger.error('Failed to send email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(to: string, name: string, role: string): Promise<boolean> {
    const subject = 'Welcome to CBT Platform';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Welcome to CBT Platform!</h2>
        <p>Hello ${name},</p>
        <p>Your ${role} account has been created successfully.</p>
        <p>You can now log in to the platform and start using our features.</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <br>
        <p>Best regards,<br>CBT Platform Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendCredentialsEmail(to: string, name: string, email: string, password: string, role: string): Promise<boolean> {
    const subject = 'Your CBT Platform Account Credentials';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Your Account Credentials</h2>
        <p>Hello ${name},</p>
        <p>Your ${role} account has been created on CBT Platform.</p>
        <p>Here are your login credentials:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
          <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${process.env.FRONTEND_URL}/login">${process.env.FRONTEND_URL}/login</a></p>
        </div>
        <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after your first login.</p>
        <br>
        <p>Best regards,<br>CBT Platform Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendExamScheduledEmail(to: string, studentName: string, examTitle: string, scheduledDate: string, startTime: string, accessCode: string): Promise<boolean> {
    const subject = `Exam Scheduled: ${examTitle}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Exam Scheduled</h2>
        <p>Hello ${studentName},</p>
        <p>You have been scheduled for the following exam:</p>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>Exam:</strong> ${examTitle}</p>
          <p style="margin: 5px 0;"><strong>Date:</strong> ${scheduledDate}</p>
          <p style="margin: 5px 0;"><strong>Start Time:</strong> ${startTime}</p>
          <p style="margin: 5px 0;"><strong>Access Code:</strong> <span style="font-size: 18px; font-weight: bold; color: #4f46e5;">${accessCode}</span></p>
        </div>
        <p>Please make sure to:</p>
        <ul>
          <li>Log in to the platform before your scheduled time</li>
          <li>Have a stable internet connection</li>
          <li>Keep your access code safe</li>
        </ul>
        <br>
        <p>Good luck!<br>CBT Platform Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendPasswordResetEmail(to: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${resetUrl}</p>
        <p style="color: #dc2626;">This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>CBT Platform Team</p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }
}
