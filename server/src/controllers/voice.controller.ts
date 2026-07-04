import type { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/api-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createListingPrompt, parseListingFromAudio, transcribeAudio, detectLanguage, generateSpeech } from '../services/aws-voice.service.js';

const voiceRequestSchema = z.object({
  stage: z.enum(['start', 'parse', 'confirm']).default('parse'),
});

const categorySchema = z.enum(['fruit', 'vegetable', 'grain', 'other']);

const confirmationRequestSchema = z.object({
  productName: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  quantity: z.coerce.number().nonnegative(),
  category: categorySchema,
  description: z.string().min(1),
  language: z.enum(['ta', 'en']).default('en'),
});

function toBooleanConfirmation(transcript: string, language: 'ta' | 'en'): boolean {
  const normalized = transcript.toLowerCase().trim();
  if (language === 'ta') {
    if (/(ஆமாம்|ஆம்|சரி|ஒகே|ok)/i.test(normalized)) return true;
    if (/(இல்லை|வேண்டாம்|no)/i.test(normalized)) return false;
    return false;
  }
  if (/\b(yes|confirm|correct|ok|okay)\b/i.test(normalized)) return true;
  if (/\b(no|wrong|edit|change)\b/i.test(normalized)) return false;
  return false;
}

export const parseVoiceListing = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const parsedRequest = voiceRequestSchema.safeParse({
    stage: req.body?.stage,
  });
  if (!parsedRequest.success) {
    throw new ApiError(400, 'Invalid voice request');
  }

  const stage = parsedRequest.data.stage;
  const languageFromQuery = req.body?.language === 'ta' ? 'ta' : 'en';

  if (stage === 'start') {
    const prompt = await createListingPrompt(languageFromQuery);
    res.status(200).json({
      success: true,
      data: {
        stage,
        promptText: prompt.text,
        promptAudioUrl: prompt.audioUrl,
      },
    });
    return;
  }

  const audio = req.file;
  if (!audio) {
    throw new ApiError(400, 'Audio file is required');
  }

  if (!audio.mimetype.startsWith('audio/')) {
    throw new ApiError(400, 'Only audio files are supported');
  }

  if (audio.size > 10 * 1024 * 1024) {
    throw new ApiError(400, 'Audio file exceeds the 10MB size limit');
  }

  if (stage === 'confirm') {
    const confirmationPayload = confirmationRequestSchema.safeParse({
      productName: req.body?.productName,
      price: req.body?.price,
      quantity: req.body?.quantity,
      category: req.body?.category,
      description: req.body?.description,
      language: req.body?.language,
    });
    if (!confirmationPayload.success) {
      throw new ApiError(400, confirmationPayload.error.issues[0]?.message ?? 'Invalid confirmation payload');
    }
    const transcript = await transcribeAudio(audio.buffer, audio.mimetype || 'audio/webm');
    const confirmed = toBooleanConfirmation(transcript, confirmationPayload.data.language);
    const responseText = confirmed
      ? confirmationPayload.data.language === 'ta'
        ? 'நன்றி. விவரங்கள் சேர்க்கப்பட்டுவிட்டன.'
        : 'Great. The details are now filled in the form.'
      : confirmationPayload.data.language === 'ta'
        ? 'சரி. தயவுசெய்து விவரங்களை மீண்டும் சொல்லுங்கள் அல்லது கையால் திருத்துங்கள்.'
        : 'Okay. Please repeat the details or edit the fields manually.';
    const responseAudioUrl = await generateSpeech(responseText, confirmationPayload.data.language);
    res.status(200).json({
      success: true,
      data: {
        stage,
        confirmed,
        transcript,
        responseText,
        responseAudioUrl,
      },
    });
    return;
  }

  const parseResult = await parseListingFromAudio(audio.buffer, audio.mimetype || 'audio/webm');
  res.status(200).json({
    success: true,
    data: {
      stage,
      productName: parseResult.parsed.productName,
      price: parseResult.parsed.price,
      quantity: parseResult.parsed.quantity,
      category: parseResult.parsed.category,
      description: parseResult.parsed.description,
      language: parseResult.parsed.language,
      transcript: parseResult.parsed.transcript,
      confirmationText: parseResult.confirmationText,
      confirmationAudioUrl: parseResult.confirmationAudioUrl,
    },
  });
});

export const detectVoiceLanguage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!text) {
    throw new ApiError(400, 'Text is required');
  }
  const language = await detectLanguage(text);
  res.status(200).json({
    success: true,
    data: { language },
  });
});
