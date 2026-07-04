import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { createVoiceMessage } from './messageService.js';
import { getExperts, getExpertById } from './expertRegistry.js';
import { broadcastMessageToSession } from './websocketServer.js';
import {
  createSession,
  getAllSessions,
  getMessages,
  getSession,
  getSessionByParticipants,
  getSessionsByExpert,
  type ChatSender,
} from './sessionManager.js';

const upload = multer({ storage: multer.memoryStorage() });

const expertChatRouter = Router();

expertChatRouter.get('/experts', requireAuth, async (_req, res) => {
  const experts = await getExperts();
  res.status(200).json({
    success: true,
    data: experts,
  });
});

expertChatRouter.post('/start-session', requireAuth, requireRole('farmer'), async (req, res) => {
  const farmerId = req.user?.id ?? '';
  const expertId = typeof req.body?.expert_id === 'string' ? req.body.expert_id : '';

  if (!expertId) {
    res.status(400).json({
      success: false,
      message: 'expert_id is required',
    });
    return;
  }

  const expert = await getExpertById(expertId);
  if (!expert) {
    res.status(404).json({
      success: false,
      message: 'Expert not found',
    });
    return;
  }

  const existingSession = getSessionByParticipants(farmerId, expertId);
  const session = existingSession ?? createSession(farmerId, expertId);
  res.status(201).json({
    success: true,
    data: session,
  });
});

expertChatRouter.get('/messages/:session_id', requireAuth, (req, res) => {
  const sessionId = req.params.session_id ?? '';
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({
      success: false,
      message: 'Session not found',
    });
    return;
  }

  const isAdmin = req.user?.role === 'admin';
  const isParticipant = req.user?.id === session.farmer_id || req.user?.id === session.expert_id;
  if (!isAdmin && !isParticipant) {
    res.status(403).json({
      success: false,
      message: 'You are not allowed to access this chat session',
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: getMessages(sessionId),
  });
});

expertChatRouter.get('/sessions', requireAuth, (req, res) => {
  if (req.user?.role !== 'expert' && req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Only experts and admins can access sessions',
    });
    return;
  }

  const expertId = req.user.role === 'expert' ? req.user.id : typeof req.query.expert_id === 'string' ? req.query.expert_id : '';

  res.status(200).json({
    success: true,
    data: expertId ? getSessionsByExpert(expertId) : getAllSessions(),
  });
});

expertChatRouter.post('/voice-message', requireAuth, upload.single('audio'), async (req, res) => {
  const sessionId = typeof req.body?.session_id === 'string' ? req.body.session_id : '';
  const senderCandidate = req.body?.sender;
  const sender = senderCandidate === 'farmer' || senderCandidate === 'expert' ? senderCandidate : undefined;
  const audio = req.file;

  if (!sessionId || (sender !== 'farmer' && sender !== 'expert') || !audio) {
    res.status(400).json({
      success: false,
      message: 'session_id, sender and audio file are required',
    });
    return;
  }

  if (!getSession(sessionId)) {
    res.status(404).json({
      success: false,
      message: 'Session not found',
    });
    return;
  }

  const session = getSession(sessionId);
  const isAdmin = req.user?.role === 'admin';
  const isParticipant = req.user?.id === session?.farmer_id || req.user?.id === session?.expert_id;
  if (!isAdmin && !isParticipant) {
    res.status(403).json({
      success: false,
      message: 'You are not allowed to post in this chat session',
    });
    return;
  }

  try {
    const message = await createVoiceMessage(sessionId, sender, {
      buffer: audio.buffer,
      mimeType: audio.mimetype || 'audio/webm',
    });

    broadcastMessageToSession(sessionId, {
      type: 'new_message',
      data: message,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: 'Failed to process voice message',
    });
  }
});

export { expertChatRouter };
