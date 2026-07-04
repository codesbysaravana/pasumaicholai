import { API_BASE_URL, http } from "../../api/http";
import type { CropListing, CropListingInput, CropListingUpdateInput } from "./types";

const marketplaceBasePath = "/marketplace";

export async function createCropListing(payload: CropListingInput): Promise<CropListing> {
  return http<CropListing>(`${marketplaceBasePath}/listings`, {
    method: "POST",
    body: payload,
  });
}

export async function getCropListings(): Promise<CropListing[]> {
  return http<CropListing[]>(`${marketplaceBasePath}/listings`, {
    method: "GET",
  });
}

export async function getCropListingById(listingId: string): Promise<CropListing> {
  return http<CropListing>(`${marketplaceBasePath}/listings/${listingId}`, {
    method: "GET",
  });
}

export async function getMyCropListings(): Promise<CropListing[]> {
  return http<CropListing[]>(`${marketplaceBasePath}/my-listings`, {
    method: "GET",
  });
}

export async function updateCropListing(listingId: string, payload: CropListingUpdateInput): Promise<CropListing> {
  return http<CropListing>(`${marketplaceBasePath}/listings/${listingId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteCropListing(listingId: string): Promise<{ id: string }> {
  return http<{ id: string }>(`${marketplaceBasePath}/listings/${listingId}`, {
    method: "DELETE",
  });
}

export interface VoiceListingParseResponse {
  stage: "parse";
  productName: string;
  price: number;
  quantity: number;
  category: "fruit" | "vegetable" | "grain" | "other";
  description: string;
  language: "ta" | "en";
  transcript: string;
  confirmationText: string;
  confirmationAudioUrl: string;
}

export interface VoiceListingStartResponse {
  stage: "start";
  promptText: string;
  promptAudioUrl: string;
}

export interface VoiceListingConfirmResponse {
  stage: "confirm";
  confirmed: boolean;
  transcript: string;
  responseText: string;
  responseAudioUrl: string;
}

type VoiceResponseEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

async function callVoiceApi<T>(formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/voice/parse-listing`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const payload = (await response.json()) as VoiceResponseEnvelope<T>;
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }
  if (!payload.success || !payload.data) {
    throw new Error(payload.message ?? "Voice request was not successful");
  }
  return payload.data;
}

export async function startVoiceListing(language: "en" | "ta"): Promise<VoiceListingStartResponse> {
  const formData = new FormData();
  formData.append("stage", "start");
  formData.append("language", language);
  return callVoiceApi<VoiceListingStartResponse>(formData);
}

export async function parseVoiceListing(audioBlob: Blob): Promise<VoiceListingParseResponse> {
  const formData = new FormData();
  formData.append("stage", "parse");
  formData.append("audio", audioBlob, `listing-input.${audioBlob.type.includes("ogg") ? "ogg" : "webm"}`);
  return callVoiceApi<VoiceListingParseResponse>(formData);
}

export async function confirmVoiceListing(
  audioBlob: Blob,
  payload: {
    productName: string;
    price: number;
    quantity: number;
    category: "fruit" | "vegetable" | "grain" | "other";
    description: string;
    language: "en" | "ta";
  }
): Promise<VoiceListingConfirmResponse> {
  const formData = new FormData();
  formData.append("stage", "confirm");
  formData.append("audio", audioBlob, `listing-confirm.${audioBlob.type.includes("ogg") ? "ogg" : "webm"}`);
  formData.append("productName", payload.productName);
  formData.append("price", String(payload.price));
  formData.append("quantity", String(payload.quantity));
  formData.append("category", payload.category);
  formData.append("description", payload.description);
  formData.append("language", payload.language);
  return callVoiceApi<VoiceListingConfirmResponse>(formData);
}

export interface VoiceTranscribeFields {
  productName: string;
  price: number;
  quantity: string;
  category: string;
  description: string;
}

export interface VoiceTranscribeResponse {
  transcript: string;
  cleanedText: string;
  fields: VoiceTranscribeFields;
}

export async function transcribeVoiceListing(audioBlob: Blob): Promise<VoiceTranscribeResponse> {
  const formData = new FormData();
  const extension = audioBlob.type.includes("ogg")
    ? "ogg"
    : audioBlob.type.includes("wav")
      ? "wav"
      : audioBlob.type.includes("mp4")
        ? "m4a"
        : "webm";
  formData.append("audio", audioBlob, `voice-listing.${extension}`);

  const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const payload = (await response.json()) as VoiceResponseEnvelope<VoiceTranscribeResponse>;
  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with status ${response.status}`);
  }
  if (!payload.success || !payload.data) {
    throw new Error(payload.message ?? "Voice transcription failed");
  }
  return payload.data;
}
