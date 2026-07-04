import { http } from "./http";

export interface FarmerPaymentSummary {
  id: string;
  productName: string;
  buyerName: string;
  amount: number;
  paidAt: string;
  paymentStatus: "paid" | "pending" | "failed";
}

export interface FarmerPaymentNotification extends FarmerPaymentSummary {
  message: string;
}

export async function getFarmerPayments(): Promise<FarmerPaymentSummary[]> {
  return http<FarmerPaymentSummary[]>("/farmer/payments", {
    method: "GET",
  });
}

export async function getFarmerPaymentNotifications(): Promise<FarmerPaymentNotification[]> {
  return http<FarmerPaymentNotification[]>("/farmer/payments/notifications", {
    method: "GET",
  });
}

export async function markFarmerPaymentNotificationsSeen(notificationIds?: string[]): Promise<{ markedCount: number }> {
  return http<{ markedCount: number }>("/farmer/payments/notifications/mark-seen", {
    method: "POST",
    body: notificationIds && notificationIds.length > 0 ? { notificationIds } : {},
  });
}
