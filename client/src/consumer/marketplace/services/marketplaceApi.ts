import { http } from "../../../api/http";

export interface MarketplaceProduct {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone?: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  location: string;
  category: string;
  image_url?: string;
  created_at: string;
}

interface BackendListing {
  id: string;
  farmerId: string;
  farmer?: {
    name?: string;
    phone?: string;
    location?: string;
  };
  cropName?: string;
  productName?: string;
  description: string;
  pricePerKg: number;
  quantity?: number;
  quantityAvailable?: number;
  location?: string;
  category: string;
  images?: string[];
  createdAt: string;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  location?: string;
  price_min?: number;
  price_max?: number;
  sort?: "latest" | "price_asc" | "price_desc" | "quantity_desc";
}

export interface CartProductInput {
  product_id: string;
  quantity: number;
}

export interface CreateCartPayload {
  items: CartProductInput[];
}

export interface CreateOrderPayload {
  consumer_id: string;
  farmer_id: string;
  products: CartProductInput[];
  total_price: number;
  delivery_address: {
    name: string;
    phone: string;
    location: string;
    notes?: string;
  };
}

export interface OrderResponse {
  id: string;
  farmer_contact?: string;
  expected_delivery_window: string;
}

export interface ListingOrderPayload {
  listingId: string;
  quantity: number;
}

export interface StripeCheckoutPayload {
  items: Array<{
    listingId: string;
    quantity: number;
  }>;
  delivery_address: {
    name: string;
    phone: string;
    location: string;
    notes?: string;
  };
}

export interface StripeCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface StripeCheckoutStatusResponse {
  status: "pending" | "processing" | "paid" | "unpaid" | "no_payment_required";
  orderId: string | null;
  paymentStatus: "pending" | "paid" | "unpaid" | "no_payment_required" | "processing";
}

export interface RazorpayCreateOrderResponse {
  id: string;
  amount: number;
  currency: string;
  key: string;
  checkout_token: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  checkout_token: string;
}

export interface RazorpayVerifyResponse {
  status: "paid";
  orderId: string;
  paymentStatus: "paid";
}

function buildQuery(filters: ProductFilters): string {
  const params = new URLSearchParams();
  if (filters.search) {
    params.set("search", filters.search);
  }
  if (filters.category && filters.category !== "all") {
    params.set("category", filters.category);
  }
  if (filters.location) {
    params.set("location", filters.location);
  }
  if (typeof filters.price_min === "number") {
    params.set("price_min", String(filters.price_min));
  }
  if (typeof filters.price_max === "number") {
    params.set("price_max", String(filters.price_max));
  }
  if (filters.sort) {
    params.set("sort", filters.sort);
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

function mapListing(listing: BackendListing): MarketplaceProduct {
  return {
    id: listing.id,
    farmer_id: listing.farmerId,
    farmer_name: listing.farmer?.name ?? "Farmer",
    farmer_phone: listing.farmer?.phone ?? "",
    name: listing.productName ?? listing.cropName ?? "Product",
    description: listing.description,
    price: listing.pricePerKg,
    quantity: listing.quantityAvailable ?? listing.quantity ?? 0,
    location: listing.farmer?.location ?? listing.location ?? "",
    category: listing.category,
    image_url: listing.images?.[0] ?? "",
    created_at: listing.createdAt,
  };
}

export async function getMarketplaceProducts(filters: ProductFilters): Promise<MarketplaceProduct[]> {
  const data = await http<BackendListing[]>(`/marketplace/listings${buildQuery(filters)}`, {
    method: "GET",
  });
  return data.map(mapListing);
}

export async function getMarketplaceProduct(productId: string): Promise<MarketplaceProduct> {
  const data = await http<BackendListing>(`/marketplace/listings/${productId}`, {
    method: "GET",
  });
  return mapListing(data);
}

export async function saveCart(payload: CreateCartPayload) {
  return http<{ items: CartProductInput[]; subtotal: number }>("/cart", {
    method: "POST",
    body: payload,
  });
}

export async function placeOrder(payload: CreateOrderPayload): Promise<OrderResponse> {
  return http<OrderResponse>("/orders", {
    method: "POST",
    body: payload,
  });
}

export async function placeListingOrder(payload: ListingOrderPayload): Promise<{ id: string; orderStatus: string; totalPrice: number }> {
  return http<{ id: string; orderStatus: string; totalPrice: number }>("/orders/create", {
    method: "POST",
    body: payload,
  });
}

export async function createCheckoutSession(payload: StripeCheckoutPayload): Promise<StripeCheckoutSessionResponse> {
  return http<StripeCheckoutSessionResponse>("/payments/checkout-session", {
    method: "POST",
    body: payload,
  });
}

export async function getCheckoutSessionStatus(sessionId: string): Promise<StripeCheckoutStatusResponse> {
  return http<StripeCheckoutStatusResponse>(`/payments/session/${sessionId}`, {
    method: "GET",
  });
}

export async function createRazorpayOrder(payload: StripeCheckoutPayload): Promise<RazorpayCreateOrderResponse> {
  return http<RazorpayCreateOrderResponse>("/payments/razorpay/create-order", {
    method: "POST",
    body: payload,
  });
}

export async function verifyRazorpayPayment(payload: RazorpayVerifyPayload): Promise<RazorpayVerifyResponse> {
  return http<RazorpayVerifyResponse>("/payments/razorpay/verify", {
    method: "POST",
    body: payload,
  });
}
