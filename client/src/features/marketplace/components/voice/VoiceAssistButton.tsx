interface VoiceAssistButtonProps {
  disabled?: boolean;
  isActive: boolean;
  onClick: () => void;
}

export function VoiceAssistButton({ disabled = false, isActive, onClick }: VoiceAssistButtonProps) {
  return (
    <button type="button" className="btn btn-secondary" onClick={onClick} disabled={disabled}>
      <span aria-hidden="true" style={{ marginRight: "0.4rem" }}>
        {isActive ? "🎙️" : "🎤"}
      </span>
      {isActive ? "Stop Voice Assist" : "Start Voice Assist"}
    </button>
  );
}
