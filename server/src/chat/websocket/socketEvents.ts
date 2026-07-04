import type { ChatMessage, ChatSender } from '../services/sessionManager.js';

export type SocketEvent =
  | 'join_session'
  | 'leave_session'
  | 'text_message'
  | 'voice_message'
  | 'typing_start'
  | 'typing_stop'
  | 'presence_update'
  | 'session_history'
  | 'new_message'
  | 'error';

export interface BaseSocketPayload<TType extends SocketEvent, TData = Record<string, unknown>> {
  type: TType;
  data: TData;
}

export type IncomingSocketPayload =
  | BaseSocketPayload<
      'join_session',
      {
        user_id: string;
        sender: ChatSender;
      }
    >
  | BaseSocketPayload<
      'leave_session',
      {
        user_id: string;
        sender: ChatSender;
      }
    >
  | BaseSocketPayload<
      'text_message',
      {
        sender: ChatSender;
        text: string;
      }
    >
  | BaseSocketPayload<
      'voice_message',
      {
        sender: ChatSender;
        text: string;
        audio_url?: string;
      }
    >
  | BaseSocketPayload<
      'typing_start',
      {
        sender: ChatSender;
        user_id: string;
      }
    >
  | BaseSocketPayload<
      'typing_stop',
      {
        sender: ChatSender;
        user_id: string;
      }
    >;

export type OutgoingSocketPayload =
  | BaseSocketPayload<'session_history', ChatMessage[]>
  | BaseSocketPayload<'new_message', ChatMessage>
  | BaseSocketPayload<
      'typing_start' | 'typing_stop',
      {
        sender: ChatSender;
        user_id: string;
      }
    >
  | BaseSocketPayload<
      'presence_update',
      {
        user_id: string;
        sender: ChatSender;
        status: 'online' | 'offline';
      }
    >
  | BaseSocketPayload<
      'error',
      {
        message: string;
      }
    >;
