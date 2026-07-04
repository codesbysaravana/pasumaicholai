import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { logger } from '../utils/logger.js';
import url from 'url';
import { communityRepository } from './community.repository.js';

const communityWsServer = new WebSocketServer({ noServer: true });

// userId -> Set of WebSockets
const userSockets = new Map<string, Set<WebSocket>>();

export const handleCommunityUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const parsedUrl = url.parse(req.url || '', true);
    const userId = parsedUrl.query.userId as string;

    communityWsServer.handleUpgrade(req, socket, head, (ws) => {
        if (userId) {
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
                // First connection - mark online
                communityRepository.updatePresence(userId, 'online').then(() => {
                    broadcastToCommunity('presence_update', { userId, status: 'online' });
                });
            }
            userSockets.get(userId)?.add(ws);
        }

        ws.on('close', () => {
            if (userId) {
                const sockets = userSockets.get(userId);
                if (sockets) {
                    sockets.delete(ws);
                    if (sockets.size === 0) {
                        userSockets.delete(userId);
                        // Last connection closed - mark offline
                        communityRepository.updatePresence(userId, 'offline').then(() => {
                            broadcastToCommunity('presence_update', { userId, status: 'offline' });
                        });
                    }
                }
            }
        });

        // Provide initial online users
        communityRepository.getAllOnlineUsers().then(users => {
            const onlineIds = users.map(u => u.userId.toString());
            ws.send(JSON.stringify({ type: 'initial_presence', data: onlineIds }));
        });
    });
};

export const broadcastToCommunity = (type: string, data: any) => {
    const payload = JSON.stringify({ type, data });
    userSockets.forEach((sockets) => {
        sockets.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    });
};

export const sendToUser = (userId: string, type: string, data: any) => {
    const sockets = userSockets.get(userId);
    if (sockets) {
        const payload = JSON.stringify({ type, data });
        sockets.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        });
    }
};
