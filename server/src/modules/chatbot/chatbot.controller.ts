import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/async-handler.js';
import { chatbotService } from './chatbot.service.js';

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required'),
});

const ttsSchema = z.object({
  text: z.string().min(1, 'Text is required'),
});

const voiceSchema = z.object({
  audioBase64: z.string().min(1, 'Audio payload is required'),
  mimeType: z.string().min(1).default('audio/webm'),
});

export const chatbotBodySchema = {
  chat: chatSchema,
  tts: ttsSchema,
  voice: voiceSchema,
};

export const chatWithAI = asyncHandler(async (req: Request, res: Response) => {
  const { message } = chatSchema.parse(req.body);
  const result = await chatbotService.askTextAI(message);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const voiceToText = asyncHandler(async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = voiceSchema.parse(req.body);
  const result = await chatbotService.voiceToText(audioBase64, mimeType);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const textToSpeech = asyncHandler(async (req: Request, res: Response) => {
  const { text } = ttsSchema.parse(req.body);
  const result = await chatbotService.textToSpeech(text);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const voiceAgent = asyncHandler(async (req: Request, res: Response) => {
  const { audioBase64, mimeType } = voiceSchema.parse(req.body);
  const result = await chatbotService.voiceAgent(audioBase64, mimeType);

  res.status(200).json({
    success: true,
    data: result,
  });
});
