import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import { createTextMessage, createVoiceMessageFromRealtime } from '../services/messageService.js';
import { getMessages, getSession, type ChatSender } from '../services/sessionManager.js';
import type { IncomingSocketPayload, OutgoingSocketPayload } from './socketEvents.js';
import { broadcastToSession, registerSocket, removeSocket } from './socketRegistry.js';

const wsServer = new WebSocketServer({ noServer: true });

interface ConnectionContext {
  sessionId: string;
  userId: string;
  sender: ChatSender;
}

function send(socket: WebSocket, payload: OutgoingSocketPayload): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function parseSessionId(url?: string): string | null {
  if (!url) {
    return null;
  }
  const match = url.match(/^\/ws\/expert-chat\/([^/?#]+)(?:\?.*)?$/);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}

function parseConnectionContext(req: IncomingMessage, sessionId: string): ConnectionContext {
  const parsedUrl = new URL(req.url ?? '', 'ws://localhost');
  const userId = parsedUrl.searchParams.get('user_id') ?? `user-${Date.now()}`;
  const senderValue = parsedUrl.searchParams.get('sender');
  const sender: ChatSender = senderValue === 'expert' ? 'expert' : 'farmer';

  return {
    sessionId,
    userId,
    sender,
  };
}

function isIncomingPayload(payload: unknown): payload is IncomingSocketPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const candidate = payload as { type?: unknown; data?: unknown };
  return typeof candidate.type === 'string' && typeof candidate.data === 'object' && candidate.data !== null;
}

function handleIncomingEvent(socket: WebSocket, context: ConnectionContext, payload: IncomingSocketPayload): void {
  if (payload.type === 'join_session') {
    send(socket, {
      type: 'session_history',
      data: getMessages(context.sessionId),
    });
    return;
  }

  if (payload.type === 'leave_session') {
    broadcastToSession(context.sessionId, {
      type: 'presence_update',
      data: {
        user_id: payload.data.user_id,
        sender: payload.data.sender,
        status: 'offline',
      },
    });
    return;
  }

  if (payload.type === 'typing_start' || payload.type === 'typing_stop') {
    broadcastToSession(context.sessionId, payload);
    return;
  }

  if (payload.type === 'text_message') {
    const text = payload.data.text.trim();
    if (!text) {
      return;
    }

    const message = createTextMessage(context.sessionId, payload.data.sender, text);
    broadcastToSession(context.sessionId, {
      type: 'new_message',
      data: message,
    });
    return;
  }

  if (payload.type === 'voice_message') {
    const text = payload.data.text.trim();
    const voicePayload: { text: string; audioUrl?: string } = {
      text: text || 'Voice message received',
    };
    if (payload.data.audio_url) {
      voicePayload.audioUrl = payload.data.audio_url;
    }
    const message = createVoiceMessageFromRealtime(context.sessionId, payload.data.sender, voicePayload);

    broadcastToSession(context.sessionId, {
      type: 'new_message',
      data: message,
    });
  }
}

function attachSocketHandlers(socket: WebSocket, context: ConnectionContext): void {
  registerSocket(context.sessionId, context.userId, socket);

  send(socket, {
    type: 'session_history',
    data: getMessages(context.sessionId),
  });

  broadcastToSession(context.sessionId, {
    type: 'presence_update',
    data: {
      user_id: context.userId,
      sender: context.sender,
      status: 'online',
    },
  });

  socket.on('message', (rawMessage: Buffer) => {
    try {
      const parsed = JSON.parse(rawMessage.toString()) as unknown;
      if (!isIncomingPayload(parsed)) {
        send(socket, {
          type: 'error',
          data: { message: 'Invalid websocket payload' },
        });
        return;
      }

      handleIncomingEvent(socket, context, parsed);
    } catch {
      send(socket, {
        type: 'error',
        data: { message: 'Invalid websocket payload' },
      });
    }
  });

  socket.on('close', () => {
    const removed = removeSocket(socket);
    if (!removed) {
      return;
    }

    broadcastToSession(removed.sessionId, {
      type: 'presence_update',
      data: {
        user_id: removed.userId,
        sender: context.sender,
        status: 'offline',
      },
    });
  });
}

export function handleExpertChatUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
  const sessionId = parseSessionId(req.url);
  if (!sessionId || !getSession(sessionId)) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  wsServer.handleUpgrade(req, socket, head, (wsSocket) => {
    const context = parseConnectionContext(req, sessionId);
    attachSocketHandlers(wsSocket, context);
  });
}

export function broadcastMessageToSession(sessionId: string, payload: OutgoingSocketPayload): void {
  broadcastToSession(sessionId, payload);
}
