import { useRef, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface VoiceRecorderProps {
  onVoiceCaptured: (audioFile: File, transcriptHint: string) => Promise<void>;
  disabled?: boolean;
}

export function VoiceRecorder({ onVoiceCaptured, disabled = false }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { transcript, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  const startRecording = async () => {
    if (!isSupported) return;

    try {
      resetTranscript();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        await onVoiceCaptured(file, transcript);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      startListening();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access failed", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    stopListening();
    setIsRecording(false);
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      className={`chatbot-voice-btn ${isRecording ? "is-recording" : ""}`}
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      title={isRecording ? "Stop Recording" : "Start Voice Input"}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
      {isRecording && <span className="recording-pulse"></span>}
    </button>
  );
}
