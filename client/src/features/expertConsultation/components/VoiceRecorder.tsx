import { useEffect, useRef, useState } from "react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => Promise<void>;
  disabled?: boolean;
}

export function VoiceRecorder({ onRecorded, disabled }: VoiceRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startRecording = async () => {
    if (disabled || isSending) {
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setIsSending(true);
      try {
        await onRecorded(blob);
      } finally {
        setIsSending(false);
      }
      stream.getTracks().forEach((track) => track.stop());
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (!recorderRef.current) {
      return;
    }
    recorderRef.current.stop();
    setIsRecording(false);
  };

  return (
    <button
      type="button"
      className={`btn ${isRecording ? "btn-danger" : "btn-secondary"}`}
      onClick={isRecording ? stopRecording : () => void startRecording()}
      disabled={disabled || isSending}
    >
      {isRecording ? "Stop Recording" : isSending ? "Sending Voice..." : "Voice Message"}
    </button>
  );
}
