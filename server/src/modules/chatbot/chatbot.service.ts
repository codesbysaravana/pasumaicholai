import { env } from '../../config/env.config.js';
import { ApiError } from '../../utils/api-error.js';
import type {
  AudioResult,
  ChatReply,
  VoiceAgentResult,
  VoiceToTextResult,
} from './chatbot.types.js';

type JsonObject = Record<string, unknown>;

export class ChatbotService {
  private readonly baseUrl = env.AI_SERVICE_URL.replace(/\/+$/, '');
  private readonly fallbackBaseUrl = this.baseUrl.includes('localhost')
    ? this.baseUrl.replace('localhost', '127.0.0.1')
    : null;

  private async doFetch(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, init);
  }

  private async withFallback(endpoint: string, init: RequestInit): Promise<Response> {
    try {
      return await this.doFetch(`${this.baseUrl}${endpoint}`, init);
    } catch (error) {
      if (!this.fallbackBaseUrl) {
        throw error;
      }
      return this.doFetch(`${this.fallbackBaseUrl}${endpoint}`, init);
    }
  }

  private async postJson(endpoint: string, payload: JsonObject): Promise<Response> {
    const response = await this.withFallback(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return response;
  }

  private async postAudio(endpoint: string, audioBase64: string, mimeType: string): Promise<Response> {
    const buffer = Buffer.from(audioBase64, 'base64');
    const normalizedMimeType = (mimeType || 'audio/webm').split(';')[0]?.trim() || 'audio/webm';
    const extension = normalizedMimeType.split('/')[1] ?? 'webm';
    const safeExtension = extension.replace(/[^a-zA-Z0-9]/g, '') || 'webm';
    const file = new Blob([buffer], { type: normalizedMimeType });
    const formData = new FormData();
    formData.append('file', file, `voice.${safeExtension}`);

    const response = await this.withFallback(endpoint, {
      method: 'POST',
      body: formData,
    });

    return response;
  }

  private async postTextFile(endpoint: string, text: string): Promise<Response> {
    const formData = new FormData();
    const file = new Blob([Buffer.from(text, 'utf-8')], { type: 'text/plain' });
    formData.append('file', file, 'message.txt');

    const response = await this.withFallback(endpoint, {
      method: 'POST',
      body: formData,
    });

    return response;
  }

  private async parseJsonResponse(response: Response): Promise<JsonObject> {
    const payload = (await response.json()) as JsonObject;
    return payload;
  }

  private assertSuccess(response: Response, fallbackMessage: string): void {
    if (!response.ok) {
      throw new ApiError(response.status, fallbackMessage);
    }
  }

  public async askTextAI(message: string): Promise<ChatReply> {
    // Primary path: direct text chat from AI service.
    // Fallback path: previous audio bridge for compatibility.
    try {
      const response = await this.postJson('/chat', { message });
      this.assertSuccess(response, 'AI service failed to respond to chat');
      const payload = await this.parseJsonResponse(response);
      const reply = this.extractString(payload, ['reply', 'text', 'message', 'transcript']);
      if (reply) {
        return { reply };
      }
    } catch {
      // Fall through to audio bridge fallback below.
    }

    const userAudio = await this.postJson('/tts', { text: message });
    this.assertSuccess(userAudio, 'AI service failed to synthesize user message');
    const userAudioBytes = Buffer.from(await userAudio.arrayBuffer());

    const agentFormData = new FormData();
    agentFormData.append('file', new Blob([userAudioBytes], { type: 'audio/wav' }), 'user-message.wav');
    const agentAudio = await this.withFallback('/agent', {
      method: 'POST',
      body: agentFormData,
    });
    this.assertSuccess(agentAudio, 'AI service failed to generate assistant response');
    const assistantAudioBytes = Buffer.from(await agentAudio.arrayBuffer());

    const sttFormData = new FormData();
    sttFormData.append('file', new Blob([assistantAudioBytes], { type: 'audio/wav' }), 'assistant-response.wav');
    const sttResponse = await this.withFallback('/voice', {
      method: 'POST',
      body: sttFormData,
    });
    this.assertSuccess(sttResponse, 'AI service failed to transcribe assistant response');
    const payload = await this.parseJsonResponse(sttResponse);
    const reply = this.extractString(payload, ['transcript', 'text', 'message']);

    if (!reply) {
      throw new ApiError(502, 'AI service returned an empty assistant response');
    }

    return { reply };
  }

  public async voiceToText(audioBase64: string, mimeType: string): Promise<VoiceToTextResult> {
    const response = await this.postAudio('/voice', audioBase64, mimeType);
    this.assertSuccess(response, 'AI service failed to transcribe audio');
    const payload = await this.parseJsonResponse(response);
    const transcript = this.extractString(payload, ['transcript', 'text', 'message']);

    if (!transcript) {
      throw new ApiError(502, 'AI service returned an invalid transcription response');
    }

    return { transcript };
  }

  public async textToSpeech(text: string): Promise<AudioResult> {
    const response = await this.postJson('/tts', { text });
    this.assertSuccess(response, 'AI service failed to generate speech');

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const bytes = Buffer.from(await response.arrayBuffer());
      return {
        audioBase64: bytes.toString('base64'),
        audioMimeType: contentType || 'audio/mpeg',
      };
    }

    const payload = await this.parseJsonResponse(response);
    const audioBase64 = this.extractString(payload, ['audioBase64', 'audio_base64', 'audio', 'data']);

    if (!audioBase64) {
      throw new ApiError(502, 'AI service returned an invalid speech response');
    }

    const audioMimeType = this.extractString(payload, ['audioMimeType', 'mimeType', 'contentType']) ?? 'audio/mpeg';

    return {
      audioBase64,
      audioMimeType,
    };
  }

  public async voiceAgent(audioBase64: string, mimeType: string): Promise<VoiceAgentResult> {
    const response = await this.postAudio('/agent', audioBase64, mimeType);
    this.assertSuccess(response, 'AI service failed to process voice agent request');
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) {
      const bytes = Buffer.from(await response.arrayBuffer());
      return {
        audioBase64: bytes.toString('base64'),
        audioMimeType: contentType || 'audio/mpeg',
      };
    }

    const payload = await this.parseJsonResponse(response);
    const audioResponse = this.extractString(payload, ['audioBase64', 'audio_base64', 'audio', 'data']);

    if (!audioResponse) {
      throw new ApiError(502, 'AI service returned an invalid voice agent response');
    }

    const reply = this.extractString(payload, ['reply', 'response', 'answer', 'text']);
    const result: VoiceAgentResult = {
      audioBase64: audioResponse,
      audioMimeType: this.extractString(payload, ['audioMimeType', 'mimeType', 'contentType']) ?? 'audio/mpeg',
    };

    if (reply) {
      result.reply = reply;
    }

    return result;
  }

  public async compereTextFile(text: string): Promise<AudioResult> {
    const response = await this.postTextFile('/compere', text);
    this.assertSuccess(response, 'AI service failed to process compere request');
    const bytes = Buffer.from(await response.arrayBuffer());

    return {
      audioBase64: bytes.toString('base64'),
      audioMimeType: response.headers.get('content-type') ?? 'audio/wav',
    };
  }

  private extractString(source: JsonObject, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  }
}

export const chatbotService = new ChatbotService();
