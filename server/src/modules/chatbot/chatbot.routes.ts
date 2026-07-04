import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.middleware.js';
import { validateRequest } from '../../middlewares/validate-request.middleware.js';
import {
  chatWithAI,
  chatbotBodySchema,
  textToSpeech,
  voiceAgent,
  voiceToText,
} from './chatbot.controller.js';

const chatbotRouter = Router();

chatbotRouter.use(requireAuth, requireRole('farmer'));
chatbotRouter.post('/chat', validateRequest({ body: chatbotBodySchema.chat }), chatWithAI);
chatbotRouter.post('/voice', validateRequest({ body: chatbotBodySchema.voice }), voiceToText);
chatbotRouter.post('/tts', validateRequest({ body: chatbotBodySchema.tts }), textToSpeech);
chatbotRouter.post('/agent', validateRequest({ body: chatbotBodySchema.voice }), voiceAgent);

export { chatbotRouter };
