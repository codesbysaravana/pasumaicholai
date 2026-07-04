import type { Product, ProductCreateInput } from "../types/market";
import { http } from "./http";

type BackendProduct = {
  id: string;
  name: string;
  cropType: string;
  pricePerKg: number;
  quantityKg: number;
  location: string;
  sellerId: string;
  description: string;
};

function mapProduct(product: BackendProduct): Product {
  return {
    id: product.id,
    name: product.name,
    cropType: product.cropType,
    pricePerKg: product.pricePerKg,
    quantityKg: product.quantityKg,
    location: product.location,
    sellerId: product.sellerId,
    description: product.description,
    sellerRole: "farmer",
  };
}

export async function getProducts() {
  const data = await http<BackendProduct[]>("/marketplace", {
    method: "GET",
  });

  return data.map(mapProduct);
}

export async function getProductById(productId: string) {
  const data = await http<BackendProduct>(`/marketplace/${productId}`, {
    method: "GET",
  });

  return mapProduct(data);
}

export async function createProduct(input: ProductCreateInput): Promise<Product> {
  const data = await http<BackendProduct>("/marketplace", {
    method: "POST",
    body: input,
  });

  return mapProduct(data);
}
