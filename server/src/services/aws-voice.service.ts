import {
  ComprehendClient,
  DetectDominantLanguageCommand,
  DetectEntitiesCommand,
  type Entity,
} from '@aws-sdk/client-comprehend';
import { PollyClient, SynthesizeSpeechCommand, type Engine, type VoiceId } from '@aws-sdk/client-polly';
import {
  GetTranscriptionJobCommand,
  StartTranscriptionJobCommand,
  TranscribeClient,
} from '@aws-sdk/client-transcribe';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { awsConfig } from '../config/aws.config.js';
import { env } from '../config/env.config.js';
import { ApiError } from '../utils/api-error.js';

export interface ParsedVoiceListing {
  productName: string;
  price: number;
  quantity: number;
  category: 'fruit' | 'vegetable' | 'grain' | 'other';
  description: string;
  language: 'ta' | 'en';
  transcript: string;
}

export interface VoiceParseResult {
  parsed: ParsedVoiceListing;
  confirmationText: string;
  confirmationAudioUrl: string;
}

type SupportedLanguage = 'ta' | 'en';

const transcribeClient = new TranscribeClient(awsConfig);
const comprehendClient = new ComprehendClient(awsConfig);
const pollyClient = new PollyClient(awsConfig);
const s3Client = new S3Client(awsConfig);

const MAX_TRANSCRIBE_POLL_ATTEMPTS = 15;
const POLL_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function mapMimeToExtension(mimeType: string): string {
  const normalized = mimeType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('wav')) return 'wav';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'mp4';
  return 'webm';
}

function mapExtensionToTranscribeFormat(extension: string): 'webm' | 'ogg' | 'wav' | 'mp3' | 'mp4' {
  if (extension === 'ogg') return 'ogg';
  if (extension === 'wav') return 'wav';
  if (extension === 'mp3') return 'mp3';
  if (extension === 'mp4') return 'mp4';
  return 'webm';
}

function normalizeLanguageCode(code: string | undefined): SupportedLanguage {
  if (!code) {
    return 'en';
  }
  const normalized = code.toLowerCase();
  if (normalized.startsWith('ta')) {
    return 'ta';
  }
  return 'en';
}

function mapCategory(text: string): ParsedVoiceListing['category'] {
  const normalized = text.toLowerCase();
  if (/\b(apple|banana|orange|mango|grape|fruit|பழம்)\b/.test(normalized)) {
    return 'fruit';
  }
  if (/\b(rice|wheat|grain|maize|millet|கோதுமை|அரிசி)\b/.test(normalized)) {
    return 'grain';
  }
  if (/\b(tomato|onion|potato|vegetable|காய்கறி)\b/.test(normalized)) {
    return 'vegetable';
  }
  return 'other';
}

function parseNumber(input: string): number | null {
  const cleaned = input.replace(/[^\d.]/g, '');
  if (!cleaned) {
    return null;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function extractFirstMeaningfulWord(text: string): string {
  const cleaned = text.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(' ');
}

function extractFieldsFromTranscript(transcript: string, entities: Entity[], language: SupportedLanguage): ParsedVoiceListing {
  const normalized = transcript.trim();
  const lower = normalized.toLowerCase();

  const numberEntities = entities
    .filter((entity) => entity.Type === 'QUANTITY' && entity.Text)
    .map((entity) => parseNumber(entity.Text as string))
    .filter((value): value is number => typeof value === 'number');

  const explicitPriceMatch =
    lower.match(/(?:price|rate|rs|rupees|ரூபாய்)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i) ??
    lower.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupees|ரூபாய்)/i);
  const explicitQtyMatch =
    lower.match(/(?:quantity|qty|kg|kilo|கிலோ)\s*(?:is|=|:)?\s*(\d+(?:\.\d+)?)/i) ??
    lower.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|கிலோ)/i);

  const explicitPrice = explicitPriceMatch?.[1] ? Number(explicitPriceMatch[1]) : undefined;
  const explicitQuantity = explicitQtyMatch?.[1] ? Number(explicitQtyMatch[1]) : undefined;

  const fallbackNumbers = numberEntities.filter((value) => value > 0);
  const inferredPrice = explicitPrice ?? fallbackNumbers[0] ?? 0;
  const inferredQuantity = explicitQuantity ?? fallbackNumbers[1] ?? 0;

  const productEntity =
    entities.find((entity) => (entity.Type === 'COMMERCIAL_ITEM' || entity.Type === 'TITLE') && entity.Text)?.Text ??
    extractFirstMeaningfulWord(transcript);

  const category = mapCategory(`${transcript} ${productEntity ?? ''}`);
  const safeProductName = (productEntity ?? '').trim() || (language === 'ta' ? 'பொருள்' : 'Product');
  const safeDescription = normalized || (language === 'ta' ? 'வாய்ஸ் மூலம் சேர்க்கப்பட்டது' : 'Added via voice');

  return {
    productName: safeProductName,
    price: inferredPrice > 0 ? inferredPrice : 0,
    quantity: inferredQuantity > 0 ? inferredQuantity : 0,
    category,
    description: safeDescription,
    language,
    transcript: normalized,
  };
}

function buildConfirmationText(parsed: ParsedVoiceListing): string {
  if (parsed.language === 'ta') {
    return `நீங்கள் கூறியது: ${parsed.productName}, ஒரு கிலோக்கு ${parsed.price} ரூபாய், அளவு ${parsed.quantity} கிலோ. சரியா?`;
  }
  return `Did you mean: ${parsed.productName}, price ${parsed.price} rupees per kg, quantity ${parsed.quantity} kg?`;
}

function buildIntroText(language: SupportedLanguage): string {
  if (language === 'ta') {
    return 'குரல் மூலம் பொருள் பட்டியலை உருவாக்கலாம். தயவுசெய்து பொருள் பெயரை சொல்லுங்கள்.';
  }
  return 'You can create your product listing by voice. Please say the product name.';
}

export async function generateSpeech(text: string, language: SupportedLanguage): Promise<string> {
  const candidates: Array<{ voice: VoiceId; engine: Engine }> =
    language === 'ta'
      ? [
          { voice: 'Kajal', engine: 'neural' },
          { voice: 'Aditi', engine: 'standard' },
          { voice: 'Raveena', engine: 'standard' },
        ]
      : [
          { voice: 'Kajal', engine: 'neural' },
          { voice: 'Aditi', engine: 'standard' },
          { voice: 'Raveena', engine: 'standard' },
        ];

  let output:
    | {
        AudioStream?: {
          transformToByteArray: () => Promise<Uint8Array>;
        };
      }
    | undefined;
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      output = await pollyClient.send(
        new SynthesizeSpeechCommand({
          OutputFormat: 'mp3',
          Text: text,
          VoiceId: candidate.voice,
          Engine: candidate.engine,
        }),
      );
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!output) {
    throw new ApiError(503, `Failed to synthesize speech${lastError instanceof Error ? `: ${lastError.message}` : ''}`);
  }

  if (!output.AudioStream) {
    throw new ApiError(503, 'Failed to synthesize speech');
  }

  const bytes = await output.AudioStream.transformToByteArray();
  const base64 = Buffer.from(bytes).toString('base64');
  return `data:audio/mpeg;base64,${base64}`;
}

export async function createListingPrompt(language: SupportedLanguage): Promise<{ text: string; audioUrl: string }> {
  const text = buildIntroText(language);
  const audioUrl = await generateSpeech(text, language);
  return { text, audioUrl };
}

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  if (!env.AWS_TRANSCRIBE_BUCKET) {
    throw new ApiError(500, 'AWS_TRANSCRIBE_BUCKET is not configured');
  }

  const extension = mapMimeToExtension(mimeType);
  const mediaFormat = mapExtensionToTranscribeFormat(extension);
  const key = `voice-listings/${Date.now()}-${randomUUID()}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: env.AWS_TRANSCRIBE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const mediaUri = `s3://${env.AWS_TRANSCRIBE_BUCKET}/${key}`;
  const jobName = `listing-voice-${Date.now()}-${randomUUID()}`;

  await transcribeClient.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageOptions: ['en-IN', 'ta-IN'],
      IdentifyLanguage: true,
      MediaFormat: mediaFormat,
      Media: {
        MediaFileUri: mediaUri,
      },
    }),
  );

  for (let attempt = 0; attempt < MAX_TRANSCRIBE_POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_DELAY_MS);
    const status = await transcribeClient.send(
      new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      }),
    );
    const job = status.TranscriptionJob;
    if (!job) {
      continue;
    }

    if (job.TranscriptionJobStatus === 'FAILED') {
      throw new ApiError(422, job.FailureReason || 'Transcription failed');
    }

    if (job.TranscriptionJobStatus === 'COMPLETED' && job.Transcript?.TranscriptFileUri) {
      const transcriptResponse = await fetch(job.Transcript.TranscriptFileUri);
      if (!transcriptResponse.ok) {
        throw new ApiError(503, 'Unable to fetch transcription result');
      }
      const transcriptJson = (await transcriptResponse.json()) as {
        results?: { transcripts?: Array<{ transcript?: string }> };
      };
      const transcript = transcriptJson.results?.transcripts?.[0]?.transcript?.trim();
      if (transcript) {
        return transcript;
      }
      throw new ApiError(422, 'Unable to detect clear speech from audio');
    }
  }

  throw new ApiError(504, 'Transcription timed out');
}

export async function detectLanguage(text: string): Promise<SupportedLanguage> {
  const response = await comprehendClient.send(
    new DetectDominantLanguageCommand({
      Text: text,
    }),
  );
  const topLanguage = response.Languages?.sort((a, b) => (b.Score ?? 0) - (a.Score ?? 0))[0]?.LanguageCode;
  return normalizeLanguageCode(topLanguage);
}

export async function extractEntities(text: string, language: SupportedLanguage): Promise<Entity[]> {
  // DetectEntities supports a limited set of languages. Tamil fallback uses regex parsing only.
  if (language === 'ta') {
    return [];
  }

  const response = await comprehendClient.send(
    new DetectEntitiesCommand({
      Text: text,
      LanguageCode: 'en',
    }),
  );
  return response.Entities ?? [];
}

export async function parseListingFromAudio(buffer: Buffer, mimeType: string): Promise<VoiceParseResult> {
  const transcript = await transcribeAudio(buffer, mimeType);
  const language = await detectLanguage(transcript);
  const entities = await extractEntities(transcript, language);
  const parsed = extractFieldsFromTranscript(transcript, entities, language);
  const confirmationText = buildConfirmationText(parsed);
  const confirmationAudioUrl = await generateSpeech(confirmationText, language);
  return {
    parsed,
    confirmationText,
    confirmationAudioUrl,
  };
}

export async function createPresignedUploadUrl(fileName: string, mimeType: string): Promise<{ key: string; url: string }> {
  if (!env.AWS_TRANSCRIBE_BUCKET) {
    throw new ApiError(500, 'AWS_TRANSCRIBE_BUCKET is not configured');
  }

  const key = `voice-listings/${Date.now()}-${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const command = new PutObjectCommand({
    Bucket: env.AWS_TRANSCRIBE_BUCKET,
    Key: key,
    ContentType: mimeType,
  });
  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });
  return { key, url };
}
