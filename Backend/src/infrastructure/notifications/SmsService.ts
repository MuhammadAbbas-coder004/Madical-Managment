import twilio from 'twilio';

export const sendSms = async (to: string, message: string): Promise<void> => {
  const accountSid = process.env.TWILIO_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const fromNumber = process.env.TWILIO_PHONE || '';

  const client = twilio(accountSid, authToken);

  await client.messages.create({
    body: message,
    from: fromNumber,
    to,
  });
};

export class SmsService {
  public static async sendSms(to: string, message: string): Promise<void> {
    return sendSms(to, message);
  }
}
