type TwilioWebhookPayload = Record<string, unknown>;

export type ParsedTwilioWebhook = {
  from: string;
  to: string;
  body: string;
  profileName: string;
  receivedAt: Date;
};

export type ExtractedWhatsappComplaint = {
  phoneNumber: string;
  messageText: string;
  timestamp: string;
};

function readString(payload: TwilioWebhookPayload, key: string): string {
  const raw = payload[key];
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim();
}

export function parseTwilioWebhook(payload: TwilioWebhookPayload): ParsedTwilioWebhook {
  const from = readString(payload, 'From');
  const to = readString(payload, 'To');
  const body = readString(payload, 'Body');
  const profileName = readString(payload, 'ProfileName');

  return {
    from,
    to,
    body,
    profileName,
    receivedAt: new Date(),
  };
}

export function extractComplaint(parsed: ParsedTwilioWebhook): ExtractedWhatsappComplaint {
  const normalizedPhoneNumber = parsed.from.replace(/^whatsapp:/i, '').trim();

  return {
    phoneNumber: normalizedPhoneNumber,
    messageText: parsed.body,
    timestamp: parsed.receivedAt.toISOString(),
  };
}
