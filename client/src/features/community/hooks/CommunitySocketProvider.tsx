import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

type CommunityEventType =
    | 'NEW_POST'
    | 'POST_REACTION'
    | 'NEW_COMMENT'
    | 'NEW_REPLY'
    | 'POST_REPOSTED'
    | 'PRESENCE_UPDATE'
    | 'INITIAL_PRESENCE';

interface CommunitySocketMessage {
    type: CommunityEventType;
    data: any;
}

interface CommunitySocketContextValue {
    subscribe: (callback: (message: CommunitySocketMessage) => void) => () => void;
    onlineUsers: Set<string>;
}

const CommunitySocketContext = createContext<CommunitySocketContextValue | undefined>(undefined);

export const CommunitySocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { auth } = useAuth();
    const socketRef = useRef<WebSocket | null>(null);
    const subscribersRef = useRef<Set<(message: CommunitySocketMessage) => void>>(new Set());
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    const connect = useCallback(() => {
        if (!auth?.id) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:5000' : window.location.host;
        const wsUrl = `${protocol}//${host}/ws/community?userId=${auth.id}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as CommunitySocketMessage;

                if (message.type === 'INITIAL_PRESENCE') {
                    setOnlineUsers(new Set(message.data.onlineUsers));
                } else if (message.type === 'PRESENCE_UPDATE') {
                    setOnlineUsers(prev => {
                        const next = new Set(prev);
                        if (message.data.status === 'online') {
                            next.add(message.data.userId);
                        } else {
                            next.delete(message.data.userId);
                        }
                        return next;
                    });
                }

                subscribersRef.current.forEach(callback => callback(message));
            } catch (err) {
                console.error('Failed to parse community socket message', err);
            }
        };

        ws.onclose = () => {
            setTimeout(connect, 3000);
        };
    }, [auth?.id]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
        };
    }, [connect]);

    const subscribe = useCallback((callback: (message: CommunitySocketMessage) => void) => {
        subscribersRef.current.add(callback);
        return () => {
            subscribersRef.current.delete(callback);
        };
    }, []);

    return (
        <CommunitySocketContext.Provider value={{ subscribe, onlineUsers }}>
            {children}
        </CommunitySocketContext.Provider>
    );
};

export const useCommunitySocket = (onMessage: (message: CommunitySocketMessage) => void) => {
    const context = useContext(CommunitySocketContext);
    if (!context) {
        throw new Error('useCommunitySocket must be used within a CommunitySocketProvider');
    }

    useEffect(() => {
        return context.subscribe(onMessage);
    }, [context, onMessage]);

    return { onlineUsers: context.onlineUsers };
};
