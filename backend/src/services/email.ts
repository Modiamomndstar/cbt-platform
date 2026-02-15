import nodemailer from 'nodemailer';

// Create a transporter that logs to console if no SMTP config is present
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Mock transporter
  return {
    sendMail: async (mailOptions: any) => {
      console.log('---------------------------------------------------');
      console.log('📧 MOCK EMAIL SENT');
      console.log('To:', mailOptions.to);
      console.log('Subject:', mailOptions.subject);
      console.log('Body:', mailOptions.text);
      console.log('---------------------------------------------------');
      return { messageId: 'mock-email-id' };
    }
  };
};

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CBT Platform" <noreply@cbtplatform.com>',
      to,
      subject,
      text,
      html: html || text,
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendExamCredentials = async (
  studentEmail: string,
  studentName: string,
  examTitle: string,
  details: {
    date: string,
    time: string,
    username: string,
    accessCode: string,
    password?: string
  }
) => {
  const subject = `Exam Credentials: ${examTitle}`;
  const text = `Hello ${studentName},\n\nYou have been scheduled for the exam: ${examTitle}.\n\nDate: ${details.date}\nTime: ${details.time}\n\nBelow are your login credentials for this exam:\n\nExam Username: ${details.username}\nExam Password: ${details.password || 'N/A'}\nAccess Code: ${details.accessCode}\n\nPlease keep these credentials safe and do not share them.\n\nGood luck!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Exam Scheduled</h2>
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>You have been scheduled for the exam: <strong>${examTitle}</strong>.</p>

      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Date:</strong> ${details.date}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${details.time}</p>
      </div>

      <div style="border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin: 20px 0; background-color: #f9f9f9;">
        <h3 style="margin-top: 0;">Your Exam Credentials</h3>
        <p style="margin: 5px 0;"><strong>Exam Username:</strong> <code style="font-size: 1.2em; color: #d63384;">${details.username}</code></p>
        <p style="margin: 5px 0;"><strong>Exam Password:</strong> <code style="font-size: 1.2em; color: #d63384;">${details.password || 'N/A'}</code></p>
        <p style="margin: 5px 0;"><strong>Access Code:</strong> <code style="font-size: 1.2em; color: #0d6efd;">${details.accessCode}</code></p>
      </div>

      <p>Please log in using these credentials at the scheduled time.</p>
      <p>Good luck!</p>
    </div>
  `;

  return sendEmail(studentEmail, subject, text, html);
};
