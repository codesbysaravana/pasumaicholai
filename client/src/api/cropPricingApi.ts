import { API_BASE_URL, http } from "./http";

export interface CropPriceRecord {
  crop: string;
  category: "vegetable" | "fruit";
  base_price: number;
  recommended_price: number;
  demand_score: number;
  last_updated: string;
}

interface Envelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export async function getAdminCrops(): Promise<CropPriceRecord[]> {
  return http<CropPriceRecord[]>("/admin/crops", { method: "GET" });
}

export async function getFarmerRecommendedCropPrices(): Promise<CropPriceRecord[]> {
  return http<CropPriceRecord[]>("/farmer/recommended-crop-prices", { method: "GET" });
}

export async function updateCropPrice(input: { crop_name: string; base_price: number }): Promise<CropPriceRecord> {
  return http<CropPriceRecord>("/admin/update-crop-price", {
    method: "POST",
    body: input,
  });
}

export async function uploadCropPriceCsv(file: File): Promise<{ updated: number; invalid_crops: string[] }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE_URL}/admin/upload-crop-prices`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const payload = (await response.json()) as Envelope<{ updated: number; invalid_crops: string[] }>;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message ?? "CSV upload failed");
  }
  return payload.data;
}

export async function triggerCropPriceRecalculation(): Promise<{ recalculated: number; updatedAt: string }> {
  return http<{ recalculated: number; updatedAt: string }>("/system/recalculate-crop-prices", {
    method: "POST",
  });
}
