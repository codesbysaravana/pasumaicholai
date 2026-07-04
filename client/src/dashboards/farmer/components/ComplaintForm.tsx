import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { complaintTextToSpeech, createComplaint, transcribeComplaintVoice } from "../../../api/complaintApi";
import { useSpeechRecognition } from "../../../features/farmer/chatbot/hooks/useSpeechRecognition";
import { Mic, Send, Languages, Volume2 } from "lucide-react";

const complaintTypes = [
  "Water Supply",
  "Electricity",
  "Crop Disease",
  "Pest Issue",
  "Subsidy Issue",
  "Market Price Issue",
  "Other",
];

interface ComplaintFormProps {
  farmerName: string;
  farmerPhone: string;
  initialLocation: string;
  latitude?: number;
  longitude?: number;
  ward?: string;
  city?: string;
  state?: string;
  onSubmitted: () => Promise<void> | void;
}

export function ComplaintForm({
  farmerName,
  farmerPhone,
  initialLocation,
  latitude,
  longitude,
  ward,
  city,
  state,
  onSubmitted,
}: ComplaintFormProps) {
  const [complaintType, setComplaintType] = useState(complaintTypes[0]);
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [location, setLocation] = useState(initialLocation);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasResolvedArea = Boolean(ward || city || state);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const {
    transcript: browserTranscript,
    isSupported: browserSttSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    setLocation(initialLocation);
  }, [initialLocation]);

  const canUseVoiceCapture = useMemo(() => {
    return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  const cleanupRecorder = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  useEffect(() => {
    return () => {
      cleanupRecorder();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    };
  }, []);

  const playDescriptionAudio = async () => {
    const text = description.trim();
    if (!text) {
      setError("Enter complaint description before listening.");
      return;
    }

    setError(null);
    setWarning(null);
    setIsSpeaking(true);
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      const { audioBase64, audioMimeType } = await complaintTextToSpeech(text);
      const source = `data:${audioMimeType || "audio/wav"};base64,${audioBase64}`;
      const audio = new Audio(source);
      ttsAudioRef.current = audio;
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => {
        setIsSpeaking(false);
        setError("Unable to play generated speech.");
      };
      await audio.play();
    } catch (ttsError) {
      setIsSpeaking(false);
      setError(ttsError instanceof Error ? ttsError.message : "Text-to-speech failed.");
    }
  };

  const startVoiceInput = async () => {
    if (!canUseVoiceCapture) {
      setError("Voice capture is not supported in this browser.");
      return;
    }
    try {
      setError(null);
      setWarning(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.start();
      if (browserSttSupported) {
        resetTranscript();
        startListening();
      }
      setIsRecording(true);
    } catch {
      cleanupRecorder();
      setError("Unable to access microphone. Please allow permissions.");
    }
  };

  const stopVoiceInput = async () => {
    const recorder = recorderRef.current;
    if (!recorder) {
      return;
    }
    setIsRecording(false);
    setIsTranscribing(true);
    if (browserSttSupported) {
      stopListening();
    }
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    try {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const extension = blob.type.includes("ogg") ? "ogg" : "webm";
      const audioFile = new File([blob], `complaint-voice-${Date.now()}.${extension}`, {
        type: blob.type || "audio/webm",
      });
      const serverTranscript = await transcribeComplaintVoice(audioFile);
      if (!serverTranscript.trim()) {
        setError("Could not detect clear speech. Please try again.");
      } else {
        setDescription((prev) => (prev ? `${prev} ${serverTranscript}` : serverTranscript));
      }
    } catch (voiceError) {
      if (browserSttSupported && browserTranscript.trim().length > 0) {
        setDescription((prev) => (prev ? `${prev} ${browserTranscript.trim()}` : browserTranscript.trim()));
        setWarning("Server STT unavailable. Browser transcript added; please review before submitting.");
      } else {
        setError(voiceError instanceof Error ? voiceError.message : "Voice transcription failed.");
      }
    } finally {
      setIsTranscribing(false);
      cleanupRecorder();
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(null);

    if (!description.trim()) {
      setError("Complaint description is required.");
      return;
    }
    if (!location.trim()) {
      setError("Location is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createComplaint({
        complaintType,
        description: description.trim(),
        farmerLocation: location.trim(),
        latitude,
        longitude,
        ward,
        city,
        state,
        attachment,
      });
      setDescription("");
      setAttachment(undefined);
      setSuccess("Complaint submitted successfully.");
      await onSubmitted();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit complaint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="card stack complaint-form-card">
      <h3>Submit Complaint</h3>
      <form className="stack" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Farmer Name</span>
          <input className="input" value={farmerName} disabled />
        </label>
        <label className="field">
          <span className="field-label">Farmer Phone</span>
          <input className="input" value={farmerPhone || "Not available"} disabled />
        </label>
        <label className="field">
          <span className="field-label">Location</span>
          <input className="input" value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        {typeof latitude === "number" && typeof longitude === "number" ? (
          <div className="muted">
            {hasResolvedArea ? (
              <>
                <strong>Location detected</strong>
                <div>Ward: {ward ?? "Unknown"}</div>
                <div>City: {city ?? "Unknown"}</div>
                <div>State: {state ?? "Unknown"}</div>
              </>
            ) : (
              <div>Location: Coordinates captured (area unknown)</div>
            )}
          </div>
        ) : null}
        <label className="field">
          <span className="field-label">Complaint Type</span>
          <select className="input" value={complaintType} onChange={(event) => setComplaintType(event.target.value)}>
            {complaintTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Complaint Description</span>
          <textarea
            className="input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="Describe your issue in detail"
          />
        </label>
        <div className="inline-actions">
          <button
            type="button"
            className={`btn ${isRecording ? "btn-danger" : "btn-secondary"}`}
            onClick={isRecording ? () => void stopVoiceInput() : () => void startVoiceInput()}
            disabled={isTranscribing || isSubmitting || isSpeaking}
          >
            {isRecording ? (
              <>
                <Mic size={18} className="animate-pulse" />
                Stop Recording
              </>
            ) : isTranscribing ? (
              <>
                <Languages size={18} className="animate-spin" />
                Transcribing...
              </>
            ) : (
              <>
                <Mic size={18} />
                Voice Input
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void playDescriptionAudio()}
            disabled={isSubmitting || isTranscribing || isSpeaking || !description.trim()}
          >
            <Volume2 size={18} className={isSpeaking ? "animate-pulse" : ""} />
            {isSpeaking ? "Playing..." : "Listen Description"}
          </button>
        </div>
        <label className="field">
          <span className="field-label">Attachment (optional image/audio)</span>
          <input
            className="input"
            type="file"
            accept="image/*,audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setAttachment(file);
            }}
          />
        </label>
        {error ? <p className="field-error">{error}</p> : null}
        {warning ? <p className="muted">{warning}</p> : null}
        {success ? <p className="taluk-success">{success}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : (
            <>
              <Send size={18} />
              Submit Complaint
            </>
          )}
        </button>
      </form>
    </article>
  );
}
