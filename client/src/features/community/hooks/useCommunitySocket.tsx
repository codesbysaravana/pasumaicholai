import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';

type CommunityEventType = 'NEW_POST' | 'POST_LIKED' | 'NEW_COMMENT' | 'NEW_REPLY' | 'POST_REPOSTED';

interface CommunitySocketMessage {
    type: CommunityEventType;
    data: any;
}

interface CommunitySocketContextValue {
    subscribe: (callback: (message: CommunitySocketMessage) => void) => () => void;
}

const CommunitySocketContext = createContext<CommunitySocketContextValue | undefined>(undefined);

export const CommunitySocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const socketRef = useRef<WebSocket | null>(null);
    const subscribersRef = useRef<Set<(message: CommunitySocketMessage) => void>>(new Set());

    const connect = useCallback(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:5000' : window.location.host;
        const wsUrl = `${protocol}//${host}/ws/community`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data) as CommunitySocketMessage;
                subscribersRef.current.forEach(callback => callback(message));
            } catch (err) {
                console.error('Failed to parse community socket message', err);
            }
        };

        ws.onclose = () => {
            setTimeout(connect, 3000);
        };
    }, []);

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
        <CommunitySocketContext.Provider value={{ subscribe }}>
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
};
