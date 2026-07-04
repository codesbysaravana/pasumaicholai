import type { VoiceLanguage } from "./voiceFlowConfig";

interface SpeechRecognitionAlternativeLike {
  transcript?: string;
  confidence?: number;
}

interface SpeechRecognitionResultLike {
  0?: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface RecognitionResult {
  transcript: string;
  confidence?: number;
}

interface ListenOptions {
  language: VoiceLanguage;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

function createErrorMessage(errorCode?: string): string {
  if (errorCode === "no-speech") {
    return "No speech detected.";
  }
  if (errorCode === "audio-capture") {
    return "Microphone is unavailable.";
  }
  if (errorCode === "not-allowed") {
    return "Microphone permission denied.";
  }
  return "Speech recognition failed.";
}

export function listenForSpeech(options: ListenOptions): Promise<RecognitionResult> {
  const { language, timeoutMs = 8000, signal } = options;
  const RecognitionConstructor = getSpeechRecognitionConstructor();
  if (!RecognitionConstructor) {
    return Promise.reject(new Error("Speech recognition is not supported in this browser."));
  }

  return new Promise<RecognitionResult>((resolve, reject) => {
    const recognition = new RecognitionConstructor();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let isSettled = false;

    const settle = (callback: () => void) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      window.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortHandler);
      callback();
    };

    const abortHandler = () => {
      settle(() => {
        recognition.stop();
        reject(new Error("Speech recognition aborted."));
      });
    };

    const timeoutId = window.setTimeout(() => {
      settle(() => {
        recognition.stop();
        reject(new Error("Speech recognition timed out."));
      });
    }, timeoutMs);

    recognition.onresult = (event) => {
      const alternative = event.results[0]?.[0];
      const transcript = alternative?.transcript?.trim() ?? "";
      if (!transcript) {
        return;
      }

      settle(() => {
        recognition.stop();
        resolve({
          transcript,
          confidence: alternative?.confidence,
        });
      });
    };

    recognition.onerror = (event) => {
      settle(() => {
        recognition.stop();
        reject(new Error(createErrorMessage(event.error)));
      });
    };

    recognition.onend = () => {
      settle(() => {
        reject(new Error("No speech detected."));
      });
    };

    if (signal?.aborted) {
      abortHandler();
      return;
    }

    signal?.addEventListener("abort", abortHandler);
    recognition.start();
  });
}
