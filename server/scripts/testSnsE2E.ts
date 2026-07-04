import { GetSMSAttributesCommand, PublishCommand, SNSClient } from '@aws-sdk/client-sns';

function parseArgs(): { phoneNumber: string; runPaymentFlow: boolean } {
  const args = process.argv.slice(2);
  const phoneNumber = args[0] ?? process.env.TEST_SMS_PHONE ?? '';
  const runPaymentFlow = !args.includes('--skip-payment-flow');
  return { phoneNumber, runPaymentFlow };
}

function assertE164(phoneNumber: string): void {
  if (!/^\+\d{10,15}$/.test(phoneNumber)) {
    throw new Error('Phone number must be E.164 format, e.g. +919876543210');
  }
}

async function main(): Promise<void> {
  const { phoneNumber, runPaymentFlow } = parseArgs();
  if (!phoneNumber) {
    throw new Error('Missing phone number. Usage: npm run test:sns:e2e -- +919876543210');
  }
  assertE164(phoneNumber);

  // Force SMS branch for this test run without editing .env.
  if (!process.env.SNS_SMS_ENABLED) {
    process.env.SNS_SMS_ENABLED = 'true';
  }

  const [{ awsConfig }, { env }, { sendPaymentCompletedSms }] = await Promise.all([
    import('../src/config/aws.config.js'),
    import('../src/config/env.config.js'),
    import('../src/services/sns-notification.service.js'),
  ]);

  const snsClient = new SNSClient(awsConfig);
  console.log('Starting SNS E2E check');
  console.log(`Region: ${env.AWS_REGION}`);
  console.log(`Sender ID configured: ${env.SNS_SMS_SENDER_ID ? 'yes' : 'no'}`);

  try {
    const attrs = await snsClient.send(
      new GetSMSAttributesCommand({
        attributes: ['MonthlySpendLimit', 'DefaultSMSType', 'DeliveryStatusIAMRole'],
      }),
    );
    console.log('SMS account attributes read: ok');
    console.log(`DefaultSMSType: ${attrs.attributes?.DefaultSMSType ?? 'unknown'}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const permissionDenied =
      message.includes('sms-voice:DescribeSpendLimits') || message.includes('not authorized');
    if (permissionDenied) {
      // Some IAM roles can publish SMS but cannot read account-level spend limits.
      console.log('SMS account attribute check skipped (missing DescribeSpendLimits permission).');
    } else {
      throw error;
    }
  }

  const directPublish = await snsClient.send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: `PASUMAI CHOLAI SNS direct test at ${new Date().toISOString()}`,
      ...(env.SNS_SMS_SENDER_ID
        ? {
            MessageAttributes: {
              'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: env.SNS_SMS_SENDER_ID.slice(0, 11),
              },
            },
          }
        : {}),
    }),
  );

  if (!directPublish.MessageId) {
    throw new Error('Direct SNS publish did not return MessageId');
  }
  console.log(`Direct publish ok. MessageId: ${directPublish.MessageId}`);

  if (runPaymentFlow) {
    await sendPaymentCompletedSms({
      orderId: `E2E-${Date.now()}`,
      productName: 'E2E Test Product',
      amount: 99.5,
      consumerName: 'E2E Consumer',
      farmerName: 'E2E Farmer',
      consumerPhone: phoneNumber,
      farmerPhone: phoneNumber,
    });
    console.log('Payment SMS service flow executed (consumer + farmer messages attempted).');
  } else {
    console.log('Skipped payment service flow (--skip-payment-flow).');
  }

  console.log('SNS E2E check completed.');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`SNS E2E check failed: ${message}`);
  process.exitCode = 1;
});
