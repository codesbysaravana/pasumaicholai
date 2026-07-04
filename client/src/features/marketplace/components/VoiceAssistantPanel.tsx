import type { VoiceLanguage } from "../voice/voiceFlowConfig";
import type { VoiceAssistantStatus } from "../voice/useVoiceAssistant";

interface VoiceAssistantPanelProps {
  language: VoiceLanguage;
  onLanguageChange: (language: VoiceLanguage) => void;
  isSupported: boolean;
  isActive: boolean;
  status: VoiceAssistantStatus;
  currentQuestion: string;
  detectedSpeech: string;
  error: string | null;
  canConfirm: boolean;
  onStart: () => void;
  onRepeat: () => void;
  onConfirm: () => void;
  onStop: () => void;
}

const statusLabelMap: Record<VoiceAssistantStatus, string> = {
  IDLE: "Idle",
  ASKING: "Asking",
  LISTENING: "Listening",
  CONFIRMING: "Confirming",
  NEXT_FIELD: "Moving to next field",
  COMPLETED: "Completed",
};

export function VoiceAssistantPanel(props: VoiceAssistantPanelProps) {
  const {
    language,
    onLanguageChange,
    isSupported,
    isActive,
    status,
    currentQuestion,
    detectedSpeech,
    error,
    canConfirm,
    onStart,
    onRepeat,
    onConfirm,
    onStop,
  } = props;

  return (
    <article className="card stack" aria-live="polite">
      <h3>🎤 Voice Assistant</h3>
      <p className="muted">Use voice or type manually at any time.</p>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span className="muted">Language:</span>
        <button
          type="button"
          className={`btn ${language === "en-IN" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => onLanguageChange("en-IN")}
        >
          English
        </button>
        <button
          type="button"
          className={`btn ${language === "ta-IN" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => onLanguageChange("ta-IN")}
        >
          தமிழ்
        </button>
      </div>

      {!isSupported ? <p className="muted">Speech features are not supported in this browser.</p> : null}

      <p className="muted">State: {statusLabelMap[status]}</p>
      <p className="muted">Current Question: {currentQuestion || "-"}</p>
      <p className="muted">Detected Speech: {detectedSpeech || "-"}</p>
      {error ? <p className="muted">{error}</p> : null}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={onStart} disabled={!isSupported || isActive}>
          Start Voice Flow
        </button>
        <button type="button" className="btn btn-secondary" onClick={onRepeat} disabled={!isActive}>
          Repeat Question
        </button>
        <button type="button" className="btn btn-secondary" onClick={onConfirm} disabled={!canConfirm}>
          Confirm
        </button>
        <button type="button" className="btn btn-secondary" onClick={onStop} disabled={!isActive}>
          Stop Voice Mode
        </button>
      </div>
    </article>
  );
}
