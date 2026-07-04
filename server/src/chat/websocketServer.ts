import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import {
  broadcastMessageToSession as broadcastFromGateway,
  handleExpertChatUpgrade as handleUpgradeFromGateway,
} from './websocket/websocketGateway.js';
import type { OutgoingSocketPayload } from './websocket/socketEvents.js';

export function handleExpertChatUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
  handleUpgradeFromGateway(req, socket, head);
}

export function broadcastMessageToSession(sessionId: string, payload: OutgoingSocketPayload): void {
  broadcastFromGateway(sessionId, payload);
}
