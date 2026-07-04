import { useEffect, useRef } from "react";

interface VoiceRecorderProps {
  isRecording: boolean;
  maxDurationMs?: number;
  onRecordingReady: (audioBlob: Blob) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError: (message: string) => void;
}

export function VoiceRecorder({
  isRecording,
  maxDurationMs = 6000,
  onRecordingReady,
  onStart,
  onEnd,
  onError,
}: VoiceRecorderProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<number | null>(null);
  const onRecordingReadyRef = useRef(onRecordingReady);
  const onStartRef = useRef(onStart);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onRecordingReadyRef.current = onRecordingReady;
    onStartRef.current = onStart;
    onEndRef.current = onEnd;
    onErrorRef.current = onError;
  }, [onRecordingReady, onStart, onEnd, onError]);

  useEffect(() => {
    let cancelled = false;

    const clearTimer = () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const cleanupResources = () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
    };

    const stopRecorder = () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
    };

    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const recorder = new MediaRecorder(stream);
        streamRef.current = stream;
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        recorder.onerror = () => {
          onErrorRef.current("Audio recording failed.");
          cleanupResources();
          onEndRef.current?.();
        };

        recorder.onstop = () => {
          const type = chunksRef.current[0]?.type || "audio/webm";
          const blob = new Blob(chunksRef.current, { type });
          chunksRef.current = [];
          cleanupResources();
          if (blob.size > 0) {
            onRecordingReadyRef.current(blob);
          } else {
            onErrorRef.current("No audio captured. Please try again.");
          }
          onEndRef.current?.();
        };

        onStartRef.current?.();
        recorder.start();
        timeoutRef.current = window.setTimeout(() => {
          stopRecorder();
        }, maxDurationMs);
      } catch {
        onErrorRef.current("Unable to access microphone. Please allow mic permissions.");
        cleanupResources();
        onEndRef.current?.();
      }
    }

    if (isRecording && !recorderRef.current) {
      void startRecording();
    } else if (!isRecording) {
      stopRecorder();
    }

    return () => {
      cancelled = true;
      stopRecorder();
      cleanupResources();
    };
  }, [isRecording, maxDurationMs]);

  return null;
}
