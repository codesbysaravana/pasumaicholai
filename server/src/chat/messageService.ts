import { randomUUID } from 'crypto';
import { env } from '../config/env.config.js';
import type { ChatMessage, ChatSender } from './sessionManager.js';
import { addMessage, getSession } from './sessionManager.js';

interface AudioInput {
  buffer: Buffer;
  mimeType: string;
}

async function transcribeAudio(audio: AudioInput): Promise<string> {
  try {
    const file = new Blob([audio.buffer], { type: audio.mimeType });
    const formData = new FormData();
    formData.append('file', file, `voice.${audio.mimeType.split('/')[1] ?? 'webm'}`);

    const response = await fetch(`${env.AI_SERVICE_URL.replace(/\/+$/, '')}/voice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return 'Voice message received';
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const transcriptCandidates = [payload.transcript, payload.text, payload.message];

    for (const candidate of transcriptCandidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
  } catch {
    return 'Voice message received';
  }

  return 'Voice message received';
}

export function createTextMessage(sessionId: string, sender: ChatSender, text: string): ChatMessage {
  if (!getSession(sessionId)) {
    throw new Error('Session not found');
  }

  const message: ChatMessage = {
    id: randomUUID(),
    session_id: sessionId,
    sender,
    text,
    timestamp: new Date().toISOString(),
  };

  return addMessage(message);
}

export async function createVoiceMessage(
  sessionId: string,
  sender: ChatSender,
  audio: AudioInput,
): Promise<ChatMessage> {
  if (!getSession(sessionId)) {
    throw new Error('Session not found');
  }

  const transcript = await transcribeAudio(audio);
  const audioBase64 = audio.buffer.toString('base64');
  const audioUrl = `data:${audio.mimeType};base64,${audioBase64}`;

  const message: ChatMessage = {
    id: randomUUID(),
    session_id: sessionId,
    sender,
    text: transcript,
    audio_url: audioUrl,
    timestamp: new Date().toISOString(),
  };

  return addMessage(message);
}

export function createVoiceMessageFromRealtime(
  sessionId: string,
  sender: ChatSender,
  payload: { text: string; audioUrl?: string },
): ChatMessage {
  if (!getSession(sessionId)) {
    throw new Error('Session not found');
  }

  const message: ChatMessage = {
    id: randomUUID(),
    session_id: sessionId,
    sender,
    text: payload.text,
    timestamp: new Date().toISOString(),
  };

  if (payload.audioUrl) {
    message.audio_url = payload.audioUrl;
  }

  return addMessage(message);
}
