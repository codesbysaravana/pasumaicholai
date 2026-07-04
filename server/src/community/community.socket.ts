import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { logger } from '../utils/logger.js';
import url from 'url';

const communityWsServer = new WebSocketServer({ noServer: true });

// userId -> Set of WebSockets (allowing multi-tab)
const userSockets = new Map<string, Set<WebSocket>>();

export const handleCommunityUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const parsedUrl = url.parse(req.url || '', true);
    const userId = parsedUrl.query.userId as string;

    communityWsServer.handleUpgrade(req, socket, head, (ws) => {
        if (userId) {
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
                // First connection for this user - they are now "online"
                broadcastCommunityEvent('PRESENCE_UPDATE', { userId, status: 'online' });
            }
            userSockets.get(userId)?.add(ws);
        }

        logger.info(`New community websocket connection for user: ${userId || 'anonymous'}`);

        ws.on('close', () => {
            if (userId) {
                const sockets = userSockets.get(userId);
                if (sockets) {
                    sockets.delete(ws);
                    if (sockets.size === 0) {
                        userSockets.delete(userId);
                        // Last connection closed - they are now "offline"
                        broadcastCommunityEvent('PRESENCE_UPDATE', { userId, status: 'offline' });
                    }
                }
            }
            logger.info(`Community websocket connection closed for user: ${userId || 'anonymous'}`);
        });

        // Initial presence state for the joining user
        const onlineUsers = Array.from(userSockets.keys());
        ws.send(JSON.stringify({ type: 'INITIAL_PRESENCE', data: { onlineUsers } }));

        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping();
            } else {
                clearInterval(pingInterval);
            }
        }, 30000);
    });
};

export const broadcastCommunityEvent = (type: string, data: any) => {
    const payload = JSON.stringify({ type, data });
    userSockets.forEach((sockets) => {
        sockets.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });
    });
};

// Targetted send
export const sendToUser = (userId: string, type: string, data: any) => {
    const sockets = userSockets.get(userId);
    if (sockets) {
        const payload = JSON.stringify({ type, data });
        sockets.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        });
    }
}
