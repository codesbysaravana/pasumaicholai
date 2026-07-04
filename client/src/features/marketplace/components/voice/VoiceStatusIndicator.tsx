interface VoiceStatusIndicatorProps {
  status: "idle" | "speaking" | "listening" | "processing" | "completed" | "error";
  message?: string | null;
  transcript?: string | null;
}

const statusTextMap: Record<VoiceStatusIndicatorProps["status"], string> = {
  idle: "Voice assist is ready.",
  speaking: "Speaking prompt...",
  listening: "Listening... please speak now.",
  processing: "Processing your voice input...",
  completed: "Voice flow completed.",
  error: "Voice assist encountered an issue.",
};

export function VoiceStatusIndicator({ status, message, transcript }: VoiceStatusIndicatorProps) {
  return (
    <div className="stack">
      <p className="muted">{message || statusTextMap[status]}</p>
      {transcript ? <p className="muted">Heard: "{transcript}"</p> : null}
    </div>
  );
}
