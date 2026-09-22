import nodemailer from 'nodemailer';

export const sendEmail = async (to: string, subject: string, message: string): Promise<void> => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER || 'no-reply@medical-management.com',
    to,
    subject,
    text: message,
    html: `<p>${message.replace(/\n/g, '<br/>')}</p>`,
  });
};

export class EmailService {
  public static async sendEmail(to: string, subject: string, message: string): Promise<void> {
    return sendEmail(to, subject, message);
  }
}
