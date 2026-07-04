import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { awsConfig } from '../config/aws.config.js';
import { env } from '../config/env.config.js';
import { logger } from '../utils/logger.js';

const snsClient = new SNSClient(awsConfig);

function isSmsEnabled(): boolean {
  return (env.SNS_SMS_ENABLED ?? 'false').toLowerCase() === 'true';
}

function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const compact = raw.replace(/[^\d+]/g, '');
  if (!compact) return null;

  if (compact.startsWith('+')) {
    return /^\+\d{10,15}$/.test(compact) ? compact : null;
  }

  const digitsOnly = compact.replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    const countryCode = (env.SMS_DEFAULT_COUNTRY_CODE ?? '+91').trim();
    const normalizedCode = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
    return `${normalizedCode}${digitsOnly}`;
  }
  if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    return `+${digitsOnly}`;
  }
  return null;
}

async function sendSms(phoneNumber: string, message: string): Promise<void> {
  const senderId = env.SNS_SMS_SENDER_ID?.trim();
  await snsClient.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      ...(senderId
        ? {
            MessageAttributes: {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: senderId.slice(0, 11),
              },
            },
          }
        : {}),
    }),
  );
}

export interface PaymentSmsInput {
  consumerPhone?: string | null;
  farmerPhone?: string | null;
  consumerName?: string | null;
  farmerName?: string | null;
  productName: string;
  orderId: string;
  amount: number;
}

export async function sendPaymentCompletedSms(input: PaymentSmsInput): Promise<void> {
  if (!isSmsEnabled()) {
    return;
  }

  const consumerPhone = normalizePhone(input.consumerPhone);
  const farmerPhone = normalizePhone(input.farmerPhone);
  const amount = Number.isFinite(input.amount) ? input.amount.toFixed(2) : String(input.amount);
  const consumerName = input.consumerName?.trim() || 'Customer';
  const farmerName = input.farmerName?.trim() || 'Farmer';

  const tasks: Array<Promise<void>> = [];

  if (consumerPhone) {
    const message = `Payment confirmed for order ${input.orderId}. Product: ${input.productName}. Amount: Rs ${amount}. Thank you, ${consumerName}.`;
    tasks.push(
      sendSms(consumerPhone, message).catch((error) => {
        logger.warn('Failed to send consumer payment SMS', {
          orderId: input.orderId,
          phone: consumerPhone,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }),
    );
  }

  if (farmerPhone) {
    const message = `New paid order ${input.orderId} for ${input.productName}. Amount: Rs ${amount}. Customer payment completed. - PASUMAI CHOLAI`;
    tasks.push(
      sendSms(farmerPhone, message).catch((error) => {
        logger.warn('Failed to send farmer payment SMS', {
          orderId: input.orderId,
          phone: farmerPhone,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }),
    );
  }

  await Promise.all(tasks);
}
