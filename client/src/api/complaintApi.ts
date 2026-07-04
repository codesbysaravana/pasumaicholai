import { API_BASE_URL, http } from "./http";

export type ComplaintStatus = "PENDING" | "ONGOING" | "COMPLETED";

export interface ComplaintRecord {
  id: string;
  complaintId: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  farmerLocation: string;
  wardId?: string;
  talukId?: string;
  latitude?: number;
  longitude?: number;
  ward?: string;
  city?: string;
  state?: string;
  talukAdminId: string;
  complaintType: string;
  description: string;
  attachmentUrl?: string;
  status: ComplaintStatus;
  escalated?: boolean;
  escalatedAt?: string | null;
  resolvedAt?: string | null;
  lastUpdated?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscalatedComplaintRecord extends ComplaintRecord {
  hoursPending: number;
  assignedWardAdmin: string;
}

interface ApiPayload<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

function normalizeAttachmentUrl(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  if (path.startsWith("http")) {
    return path;
  }
  const root = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${root}${path}`;
}

function mapComplaint(item: ComplaintRecord): ComplaintRecord {
  return {
    ...item,
    complaintId: item.complaintId ?? item.id,
    attachmentUrl: normalizeAttachmentUrl(item.attachmentUrl),
  };
}

async function requestFormData<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    body,
    credentials: "include",
  });
  const payload = (await response.json()) as ApiPayload<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? "Request failed");
  }
  return payload.data as T;
}

export async function createComplaint(input: {
  farmerLocation: string;
  latitude?: number;
  longitude?: number;
  ward?: string;
  city?: string;
  state?: string;
  complaintType: string;
  description: string;
  attachment?: File;
}): Promise<ComplaintRecord> {
  const formData = new FormData();
  formData.append("farmerLocation", input.farmerLocation);
  formData.append("complaintType", input.complaintType);
  formData.append("description", input.description);
  if (typeof input.latitude === "number") {
    formData.append("latitude", String(input.latitude));
  }
  if (typeof input.longitude === "number") {
    formData.append("longitude", String(input.longitude));
  }
  if (input.ward?.trim()) {
    formData.append("ward", input.ward.trim());
  }
  if (input.city?.trim()) {
    formData.append("city", input.city.trim());
  }
  if (input.state?.trim()) {
    formData.append("state", input.state.trim());
  }
  if (input.attachment) {
    formData.append("attachment", input.attachment);
  }

  const record = await requestFormData<ComplaintRecord>("/farmer/complaints", formData);
  return mapComplaint(record);
}

export async function transcribeComplaintVoice(audioFile: File): Promise<string> {
  const formData = new FormData();
  formData.append("audio", audioFile);

  const response = await fetch(`${API_BASE_URL}/farmer/complaints/transcribe-voice`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const payload = (await response.json()) as ApiPayload<{ transcript: string }>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? "Voice transcription failed");
  }

  return payload.data?.transcript ?? "";
}

export async function complaintTextToSpeech(text: string): Promise<{ audioBase64: string; audioMimeType: string }> {
  const data = await http<{ audioBase64: string; audioMimeType: string }>("/farmer/complaints/tts", {
    method: "POST",
    body: { text },
  });
  return data;
}

export async function getFarmerComplaints(): Promise<ComplaintRecord[]> {
  const data = await http<ComplaintRecord[]>("/farmer/complaints", { method: "GET" });
  return data.map(mapComplaint);
}

export async function getTalukComplaints(): Promise<ComplaintRecord[]> {
  const data = await http<ComplaintRecord[]>("/taluk/complaints", { method: "GET" });
  return data.map(mapComplaint);
}

export async function updateComplaintStatus(id: string, status: ComplaintStatus): Promise<ComplaintRecord> {
  const data = await http<ComplaintRecord>(`/taluk/complaints/${id}/status`, {
    method: "PUT",
    body: { status },
  });
  return mapComplaint(data);
}

export async function getEscalatedComplaints(): Promise<EscalatedComplaintRecord[]> {
  const data = await http<EscalatedComplaintRecord[]>("/admin/escalated-complaints", { method: "GET" });
  return data.map((item) => mapComplaint(item) as EscalatedComplaintRecord);
}
