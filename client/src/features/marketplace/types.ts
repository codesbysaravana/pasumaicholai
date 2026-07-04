export type CropCategory = "fruit" | "vegetable" | "grain" | "other";

export interface CropListing {
  id: string;
  farmerId: string;
  farmer?: {
    name?: string;
    phone?: string;
    location?: string;
    village?: string;
  };
  cropName: string;
  category: CropCategory;
  quantity: number;
  quantityAvailable?: number;
  pricePerKg: number;
  harvestDate: string;
  description: string;
  location: string;
  images: string[];
  unit?: "kg" | "ton" | "crate";
  isActive?: boolean;
  status: "active" | "sold" | "draft";
  createdAt: string;
}

export interface CropListingInput {
  cropName: string;
  category: CropCategory;
  quantity: number;
  pricePerKg: number;
  harvestDate: string;
  description: string;
  location: string;
  images: string[];
  unit: "kg" | "ton" | "crate";
}

export interface CropListingUpdateInput extends Partial<CropListingInput> {
  status?: "active" | "sold" | "draft";
}
