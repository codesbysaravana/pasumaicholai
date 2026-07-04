import type { UserRole } from "./auth";

export interface Product {
  id: string;
  name: string;
  cropType: string;
  pricePerKg: number;
  quantityKg: number;
  location: string;
  sellerId: string;
  sellerRole: UserRole;
  description: string;
}

export interface ProductCreateInput {
  name: string;
  cropType: string;
  pricePerKg: number;
  quantityKg: number;
  location: string;
  description: string;
}
