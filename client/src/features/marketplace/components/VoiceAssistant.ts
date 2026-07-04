type VoiceCommand = "skip" | "repeat" | "cancel";
export type VoiceLanguage = "en" | "ta";

export type VoiceListenResult =
  | {
      kind: "answer";
      text: string;
    }
  | {
      kind: "command";
      command: VoiceCommand;
    };

interface VoiceAssistantOptions {
  language?: VoiceLanguage;
}

interface BasicSpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface BasicSpeechRecognitionErrorEvent {
  error: string;
}

interface BasicSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: BasicSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BasicSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface BrowserSpeechRecognitionConstructor {
  new (): BasicSpeechRecognition;
}

export class VoiceAssistant {
  private readonly recognitionCtor: BrowserSpeechRecognitionConstructor | null;

  private readonly language: VoiceLanguage;

  private voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  public constructor(options: VoiceAssistantOptions = {}) {
    this.language = options.language ?? "en";
    const webkitWindow = window as Window & { webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor };
    this.recognitionCtor = (window.SpeechRecognition as BrowserSpeechRecognitionConstructor | undefined) ?? webkitWindow.webkitSpeechRecognition ?? null;
  }

  private getSpeechLanguage(): string {
    return this.language === "ta" ? "ta-IN" : "en-US";
  }

  private async getSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
    if (!("speechSynthesis" in window)) {
      return [];
    }

    if (this.voicesPromise) {
      return this.voicesPromise;
    }

    this.voicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const synth = window.speechSynthesis;
      const immediateVoices = synth.getVoices();
      if (immediateVoices.length > 0) {
        resolve(immediateVoices);
        return;
      }

      const onVoicesChanged = () => {
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(synth.getVoices());
      };

      synth.addEventListener("voiceschanged", onVoicesChanged);

      // Fallback in case browser does not emit voiceschanged reliably.
      window.setTimeout(() => {
        synth.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(synth.getVoices());
      }, 1200);
    });

    return this.voicesPromise;
  }

  private async getTamilVoice(): Promise<SpeechSynthesisVoice | null> {
    const voices = await this.getSpeechVoices();
    const tamilExact = voices.find((voice) => voice.lang.toLowerCase() === "ta-in");
    if (tamilExact) {
      return tamilExact;
    }

    const tamilFallback = voices.find((voice) => voice.lang.toLowerCase().includes("ta"));
    return tamilFallback ?? null;
  }

  private getCommandPhrases(): Record<VoiceCommand, string[]> {
    return {
      skip: ["skip", "தவிர்க்க"],
      repeat: ["repeat", "மீண்டும்"],
      cancel: ["cancel", "ரத்து"],
    };
  }

  public isSupported(): boolean {
    return Boolean(this.recognitionCtor) && "speechSynthesis" in window;
  }

  public async speak(text: string): Promise<void> {
    if (!("speechSynthesis" in window)) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getSpeechLanguage();
    if (this.language === "ta") {
      const tamilVoice = await this.getTamilVoice();
      if (tamilVoice) {
        utterance.voice = tamilVoice;
      }
    }

    await new Promise<void>((resolve) => {
      utterance.rate = 0.95;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }

  public async listen(): Promise<VoiceListenResult> {
    const RecognitionCtor = this.recognitionCtor;
    if (!RecognitionCtor) {
      throw new Error("Speech recognition is not supported in this browser.");
    }

    return new Promise<VoiceListenResult>((resolve, reject) => {
      const recognition = new RecognitionCtor();
      recognition.lang = this.getSpeechLanguage();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      let resolved = false;

      recognition.onresult = (event: BasicSpeechRecognitionEvent) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
        if (!transcript) {
          return;
        }

        const normalized = transcript.toLowerCase();
        const commandPhrases = this.getCommandPhrases();
        if (commandPhrases.skip.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
          resolved = true;
          resolve({ kind: "command", command: "skip" });
          recognition.stop();
          return;
        }

        if (commandPhrases.repeat.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
          resolved = true;
          resolve({ kind: "command", command: "repeat" });
          recognition.stop();
          return;
        }

        if (commandPhrases.cancel.some((phrase) => normalized.includes(phrase.toLowerCase()))) {
          resolved = true;
          resolve({ kind: "command", command: "cancel" });
          recognition.stop();
          return;
        }

        resolved = true;
        resolve({ kind: "answer", text: transcript });
        recognition.stop();
      };

      recognition.onerror = (event: BasicSpeechRecognitionErrorEvent) => {
        if (resolved) {
          return;
        }
        resolved = true;
        reject(new Error(event.error || "Unable to recognize speech."));
      };

      recognition.onend = () => {
        if (resolved) {
          return;
        }
        resolved = true;
        reject(new Error("No speech captured. Please try again."));
      };

      recognition.start();
    });
  }
}
