import { http } from "./http";

export interface FarmerOrderSummary {
  id: string;
  buyerName: string;
  status: string;
  createdAt: string;
  products: Array<{
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export async function getFarmerOrders(): Promise<FarmerOrderSummary[]> {
  return http<FarmerOrderSummary[]>("/orders/farmer", {
    method: "GET",
  });
}

export type DeliveryStatus = "PENDING_PICKUP" | "PICKED_UP" | "OUT_FOR_DELIVERY" | "DELIVERED";

export interface DeliveryOrderRecord {
  orderId: string;
  product: string;
  farmerId: string;
  farmerName: string;
  consumerId: string;
  consumerName: string;
  pickupLocation: string;
  deliveryLocation: string;
  deliveryStatus: DeliveryStatus;
  assignedDeliveryAgentId: string | null;
  assignedDeliveryAgentName: string | null;
  purchaseTime: string | null;
  pickedUpAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface ConsumerOrderTracking {
  orderId: string;
  purchaseStatus: "BOUGHT";
  purchaseTime: string;
  deliveryStatus: DeliveryStatus;
  pickedUpAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  assignedDeliveryAgentId: string | null;
  assignedDeliveryAgentName: string | null;
}

export async function getAvailableDeliveries(): Promise<DeliveryOrderRecord[]> {
  return http<DeliveryOrderRecord[]>("/orders/delivery/available", { method: "GET" });
}

export async function getAssignedDeliveries(): Promise<DeliveryOrderRecord[]> {
  return http<DeliveryOrderRecord[]>("/orders/delivery/assigned", { method: "GET" });
}

export async function acceptDeliveryJob(orderId: string): Promise<DeliveryOrderRecord> {
  return http<DeliveryOrderRecord>(`/orders/delivery/${orderId}/accept`, { method: "PUT" });
}

export async function updateDeliveryStatus(orderId: string, deliveryStatus: DeliveryStatus): Promise<DeliveryOrderRecord> {
  return http<DeliveryOrderRecord>(`/orders/delivery/${orderId}/status`, {
    method: "PUT",
    body: { deliveryStatus },
  });
}

export async function getConsumerOrderTracking(orderId: string): Promise<ConsumerOrderTracking> {
  return http<ConsumerOrderTracking>(`/orders/consumer/${orderId}/tracking`, { method: "GET" });
}
