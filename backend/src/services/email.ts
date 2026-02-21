import { Resend } from 'resend';

// Fallback to nodemailer if Resend API key is not set
let resend: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.EMAIL_FROM || 'CBT Platform <noreply@mycbtplatform.duckdns.org>';
const PLATFORM_NAME = 'CBT Platform';
const PLATFORM_URL = process.env.FRONTEND_URL || 'https://mycbtplatform.duckdns.org';

// Base HTML wrapper for all emails
const emailLayout = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${PLATFORM_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">${PLATFORM_NAME}</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Empowering Schools Across Africa</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px 48px;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8f9fa;padding:24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="color:#6b7280;font-size:13px;margin:0;">
            © ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.<br>
            <a href="${PLATFORM_URL}" style="color:#6366f1;">Visit Platform</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

// Core send function
const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    if (resend) {
      await resend.emails.send({ from: FROM, to, subject, html });
      return true;
    }
    // Fallback: log to console (dev/no-config)
    console.log(`\n📧 EMAIL (no Resend configured)\nTo: ${to}\nSubject: ${subject}\n`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

// =============================================
// Welcome email (on school registration)
// =============================================
export const sendWelcomeEmail = async (to: string, schoolName: string): Promise<boolean> => {
  const html = emailLayout(`
    <h2 style="color:#1f2937;margin:0 0 16px;">Welcome to ${PLATFORM_NAME}! 🎉</h2>
    <p style="color:#374151;line-height:1.6;">
      Congratulations, <strong>${schoolName}</strong>! Your school account has been created successfully.
    </p>
    <p style="color:#374151;line-height:1.6;">
      Your <strong>14-day free trial</strong> has started — you have full access to our Basic Premium features:
    </p>
    <ul style="color:#374151;line-height:2;">
      <li>✅ Up to 10 tutors &amp; 300 students</li>
      <li>✅ Full student portal access</li>
      <li>✅ Bulk CSV import</li>
      <li>✅ Email notifications</li>
      <li>✅ AI question generation (30 uses/month)</li>
      <li>✅ Result PDF downloads</li>
    </ul>
    <div style="text-align:center;margin:32px 0;">
      <a href="${PLATFORM_URL}/login" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
        Get Started →
      </a>
    </div>
    <p style="color:#6b7280;font-size:14px;">
      Need help? Reply to this email or visit our support centre.
    </p>
  `);

  return sendEmail(to, `Welcome to ${PLATFORM_NAME} — Your 14-day Trial Has Started!`, html);
};

// =============================================
// Trial expiry warning (sent on day 10)
// =============================================
export const sendTrialStartEmail = async (to: string, schoolName: string, trialEndDate: Date): Promise<boolean> => {
  const daysLeft = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const html = emailLayout(`
    <h2 style="color:#1f2937;margin:0 0 16px;">Your Trial Ends in ${daysLeft} Days ⏰</h2>
    <p style="color:#374151;line-height:1.6;">
      Hi <strong>${schoolName}</strong>, your 14-day trial is coming to an end on
      <strong>${trialEndDate.toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
    </p>
    <p style="color:#374151;line-height:1.6;">
      After your trial, your account will revert to the <strong>Free plan</strong> (2 tutors, 20 students, exam access only).
      Upgrade now to keep all your data and access.
    </p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="color:#92400e;margin:0;font-weight:bold;">🚀 Upgrade to Basic Premium for just ₦8,000/month</p>
      <p style="color:#92400e;margin:8px 0 0;font-size:14px;">Unlimited exams • 300 students • Full student portal • Email notifications</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${PLATFORM_URL}/billing" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
        Upgrade Now →
      </a>
    </div>
  `);

  return sendEmail(to, `⚠️ Your ${PLATFORM_NAME} trial ends in ${daysLeft} days`, html);
};

// =============================================
// Trial expired
// =============================================
export const sendTrialExpiredEmail = async (to: string, schoolName: string): Promise<boolean> => {
  const html = emailLayout(`
    <h2 style="color:#1f2937;margin:0 0 16px;">Your Trial Has Ended</h2>
    <p style="color:#374151;line-height:1.6;">
      Hi <strong>${schoolName}</strong>, your 14-day trial has ended and your account is now on the Free plan.
    </p>
    <p style="color:#374151;line-height:1.6;">
      <strong>Your data is safe</strong> — all your exams, students, and results are preserved. Upgrade anytime to regain full access.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${PLATFORM_URL}/billing" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">
        View Upgrade Options →
      </a>
    </div>
  `);

  return sendEmail(to, `Your ${PLATFORM_NAME} trial has ended — upgrade to continue`, html);
};

// =============================================
// Exam credentials for students
// =============================================
export const sendExamCredentials = async (
  studentEmail: string,
  studentName: string,
  examTitle: string,
  details: { date: string; time: string; username: string; accessCode: string; password?: string }
): Promise<boolean> => {
  const html = emailLayout(`
    <h2 style="color:#1f2937;margin:0 0 16px;">📝 You've Been Scheduled for an Exam</h2>
    <p style="color:#374151;line-height:1.6;">Hello <strong>${studentName}</strong>,</p>
    <p style="color:#374151;line-height:1.6;">
      You have been scheduled for: <strong>${examTitle}</strong>
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="color:#166534;margin:4px 0;"><strong>📅 Date:</strong> ${details.date}</p>
      <p style="color:#166534;margin:4px 0;"><strong>⏰ Time:</strong> ${details.time}</p>
    </div>
    <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="color:#1f2937;margin:0 0 12px;">Your Exam Credentials</h3>
      <p style="margin:6px 0;"><strong>Username:</strong> <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;color:#7c3aed;">${details.username}</code></p>
      ${details.password ? `<p style="margin:6px 0;"><strong>Password:</strong> <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;color:#7c3aed;">${details.password}</code></p>` : ''}
      <p style="margin:6px 0;"><strong>Access Code:</strong> <code style="background:#e2e8f0;padding:2px 8px;border-radius:4px;color:#2563eb;">${details.accessCode}</code></p>
    </div>
    <p style="color:#6b7280;font-size:13px;">Please keep these credentials private. Do not share them with anyone.</p>
  `);

  return sendEmail(studentEmail, `📝 Exam Credentials: ${examTitle}`, html);
};

// =============================================
// Payment confirmation
// =============================================
export const sendPaymentConfirmationEmail = async (
  to: string,
  schoolName: string,
  planName: string,
  amount: string,
  currency: string,
  nextBillingDate: Date
): Promise<boolean> => {
  const html = emailLayout(`
    <h2 style="color:#1f2937;margin:0 0 16px;">✅ Payment Confirmed</h2>
    <p style="color:#374151;line-height:1.6;">
      Thank you, <strong>${schoolName}</strong>! Your payment has been received.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="color:#166534;margin:4px 0;"><strong>Plan:</strong> ${planName}</p>
      <p style="color:#166534;margin:4px 0;"><strong>Amount:</strong> ${currency} ${amount}</p>
      <p style="color:#166534;margin:4px 0;"><strong>Next billing date:</strong> ${nextBillingDate.toLocaleDateString()}</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="${PLATFORM_URL}/billing" style="background:#6366f1;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;">
        View Billing Details →
      </a>
    </div>
  `);

  return sendEmail(to, `✅ Payment Confirmed — ${planName} Plan Active`, html);
};
