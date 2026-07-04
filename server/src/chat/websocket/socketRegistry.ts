import { WebSocket } from 'ws';
import type { OutgoingSocketPayload } from './socketEvents.js';

interface SocketMeta {
  sessionId: string;
  userId: string;
}

const sessionSockets = new Map<string, Set<WebSocket>>();
const userSockets = new Map<string, WebSocket>();
const socketMeta = new Map<WebSocket, SocketMeta>();

function safeSend(socket: WebSocket, payload: OutgoingSocketPayload): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function registerSocket(sessionId: string, userId: string, socket: WebSocket): void {
  const sockets = sessionSockets.get(sessionId) ?? new Set<WebSocket>();
  sockets.add(socket);
  sessionSockets.set(sessionId, sockets);
  userSockets.set(userId, socket);
  socketMeta.set(socket, { sessionId, userId });
}

export function removeSocket(socket: WebSocket): { sessionId: string; userId: string } | null {
  const meta = socketMeta.get(socket);
  if (!meta) {
    return null;
  }

  const sockets = sessionSockets.get(meta.sessionId);
  if (sockets) {
    sockets.delete(socket);
    if (sockets.size === 0) {
      sessionSockets.delete(meta.sessionId);
    }
  }

  const trackedSocket = userSockets.get(meta.userId);
  if (trackedSocket === socket) {
    userSockets.delete(meta.userId);
  }

  socketMeta.delete(socket);
  return meta;
}

export function broadcastToSession(sessionId: string, payload: OutgoingSocketPayload): void {
  const sockets = sessionSockets.get(sessionId);
  if (!sockets) {
    return;
  }

  for (const socket of sockets) {
    safeSend(socket, payload);
  }
}

export function getSessionSockets(sessionId: string): Set<WebSocket> {
  return sessionSockets.get(sessionId) ?? new Set<WebSocket>();
}
