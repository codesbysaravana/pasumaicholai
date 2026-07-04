import OpenAI from 'openai';
import { toFile } from 'openai/uploads';
import { ApiError } from '../utils/api-error.js';

type ParsedVoiceFields = {
  productName: string;
  price: number;
  quantity: string;
  category: string;
  description: string;
};

type TranscriptValidationResult = {
  language: 'tamil' | 'english' | 'mixed' | 'unsupported';
  isSupported: boolean;
  confidence: 'high' | 'medium' | 'low';
  cleanedText: string;
};

type VoiceProcessingResult = {
  transcript: string;
  cleanedText: string;
  fields: ParsedVoiceFields;
};

let openaiClient: OpenAI | null = null;

function getOpenAiClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new ApiError(500, 'OPENAI_API_KEY is not configured');
  }
  openaiClient = new OpenAI({ apiKey: openaiApiKey });
  return openaiClient;
}

function sanitizeFields(input: Partial<ParsedVoiceFields>): ParsedVoiceFields {
  return {
    productName: typeof input.productName === 'string' ? input.productName.trim() : '',
    price: Number.isFinite(Number(input.price)) ? Number(input.price) : 0,
    quantity: typeof input.quantity === 'string' ? input.quantity.trim() : '',
    category: typeof input.category === 'string' ? input.category.trim() : '',
    description: typeof input.description === 'string' ? input.description.trim() : '',
  };
}

function stripNoiseWords(input: string): string {
  const noiseWords = [
    'uh',
    'umm',
    'mmm',
    'hello',
    'test',
    'ஹலோ',
    'டெஸ்ட்',
    'அம்',
    'ம்',
  ];

  const normalized = input
    .split(/\s+/)
    .filter((token) => {
      const lowered = token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      return lowered.length > 0 && !noiseWords.includes(lowered);
    })
    .join(' ')
    .trim();

  return normalized;
}

function normalizeTamilNumberHints(input: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bஆயிரம்\b/gu, '1000'],
    [/\bநூறு\b/gu, '100'],
    [/\bஐம்பது\b/gu, '50'],
    [/\bநாற்பது\b/gu, '40'],
    [/\bமுப்பது\b/gu, '30'],
    [/\bஇருபது\b/gu, '20'],
    [/\bபத்து\b/gu, '10'],
  ];

  return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), input);
}

function detectAllowedLanguageFallback(text: string): { isSupported: boolean; language: TranscriptValidationResult['language'] } {
  const normalized = text.trim();
  if (!normalized) {
    return { isSupported: false, language: 'unsupported' };
  }

  const tamilChars = (normalized.match(/[\u0B80-\u0BFF]/g) ?? []).length;
  const latinChars = (normalized.match(/[A-Za-z]/g) ?? []).length;
  const otherChars = (normalized.match(/[^\s0-9.,:;!?'"()\-A-Za-z\u0B80-\u0BFF]/g) ?? []).length;

  if (tamilChars === 0 && latinChars === 0) {
    return { isSupported: false, language: 'unsupported' };
  }

  if (otherChars > tamilChars + latinChars) {
    return { isSupported: false, language: 'unsupported' };
  }

  if (tamilChars > 0 && latinChars > 0) {
    return { isSupported: true, language: 'mixed' };
  }
  if (tamilChars > 0) {
    return { isSupported: true, language: 'tamil' };
  }
  return { isSupported: true, language: 'english' };
}

export async function transcribeAudioWithWhisper(buffer: Buffer, mimeType: string): Promise<string> {
  const openai = getOpenAiClient();
  const extension = mimeType.includes('ogg')
    ? 'ogg'
    : mimeType.includes('mp4')
      ? 'm4a'
      : mimeType.includes('mpeg') || mimeType.includes('mp3')
        ? 'mp3'
        : mimeType.includes('wav')
          ? 'wav'
          : 'webm';

  const file = await toFile(buffer, `voice-input.${extension}`, { type: mimeType });
  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    temperature: 0,
    response_format: 'json',
    file,
  });

  const transcript = transcription.text?.trim();
  if (!transcript) {
    throw new ApiError(422, 'Unable to transcribe speech from audio');
  }
  return transcript;
}

async function validateAndCleanTranscript(transcript: string): Promise<TranscriptValidationResult> {
  const openai = getOpenAiClient();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Detect transcript language and accept only Tamil or English. If unsupported language, mark unsupported. Treat mixed Tamil+English as supported. For noisy audio, keep meaningful words and do not over-reject. Clean noisy transcript, translate Tamil to English, normalize spoken Tamil numbers into digits. Return JSON only with keys: language, isSupported, confidence, cleanedText.',
      },
      {
        role: 'user',
        content: `Transcript: "${transcript}"`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new ApiError(422, 'Unable to validate transcript language');
  }

  let parsed: Partial<TranscriptValidationResult> = {};
  try {
    parsed = JSON.parse(content) as Partial<TranscriptValidationResult>;
  } catch {
    throw new ApiError(422, 'Invalid transcript validation response');
  }

  const cleanedText = typeof parsed.cleanedText === 'string' ? parsed.cleanedText.trim() : '';
  const language =
    parsed.language === 'tamil' || parsed.language === 'english' || parsed.language === 'mixed'
      ? parsed.language
      : 'unsupported';
  const confidence = parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low' ? parsed.confidence : 'low';
  const isSupported = parsed.isSupported === true && language !== 'unsupported';

  return {
    language,
    isSupported,
    confidence,
    cleanedText,
  };
}

async function extractStructuredFields(cleanedText: string): Promise<ParsedVoiceFields> {
  const openai = getOpenAiClient();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are an AI assistant helping farmers create marketplace listings.\nThe user speech may contain background noise, broken phrases, or mixed Tamil and English.\nYour job is to:\n1 Clean the transcription.\n2 Translate Tamil words to English.\n3 Convert spoken Tamil numbers into digits.\n4 Extract structured product listing fields.\nAccept ONLY Tamil or English input.\nIf the speech is unclear or irrelevant, return null values.\nReturn ONLY valid JSON in this format:\n{"productName":string,"price":number,"quantity":string,"category":string,"description":string}\nNever include explanations.\nNever include text outside JSON.',
      },
      {
        role: 'user',
        content: `Transcript: "${cleanedText}"\nReturn JSON only.`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new ApiError(422, 'Unable to parse transcript into listing fields');
  }

  let parsed: Partial<ParsedVoiceFields> = {};
  try {
    parsed = JSON.parse(content) as Partial<ParsedVoiceFields>;
  } catch {
    throw new ApiError(422, 'Model returned invalid field format');
  }

  return sanitizeFields(parsed);
}

export async function processVoiceTranscript(transcript: string): Promise<VoiceProcessingResult> {
  const normalizedTranscript = normalizeTamilNumberHints(stripNoiseWords(transcript)).replace(/\s+/g, ' ').trim();
  if (!normalizedTranscript || normalizedTranscript.length < 2) {
    throw new ApiError(422, 'Speech unclear. Please retry.');
  }

  const validation = await validateAndCleanTranscript(normalizedTranscript);
  const fallback = detectAllowedLanguageFallback(`${normalizedTranscript} ${validation.cleanedText}`);
  const isSupportedLanguage = validation.isSupported || fallback.isSupported;

  if (!isSupportedLanguage) {
    throw new ApiError(400, 'Unsupported language. Please speak Tamil or English.');
  }
  if (validation.confidence === 'low' && !fallback.isSupported) {
    throw new ApiError(422, 'Low confidence transcript. Please retry recording.');
  }

  const candidateText = validation.cleanedText || normalizedTranscript;
  const cleanedText = normalizeTamilNumberHints(stripNoiseWords(candidateText)).replace(/\s+/g, ' ').trim();
  if (!cleanedText || cleanedText.length < 2) {
    throw new ApiError(422, 'Speech unclear. Please retry.');
  }

  const fields = await extractStructuredFields(cleanedText);
  return {
    transcript: normalizedTranscript,
    cleanedText,
    fields,
  };
}

