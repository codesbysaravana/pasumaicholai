import { useEffect, useMemo, useState } from "react";
import { useLocation, Link, useSearchParams } from "react-router-dom";
import { getConsumerOrderTracking, type ConsumerOrderTracking } from "../../../api/orderApi";
import { getCheckoutSessionStatus } from "../services/marketplaceApi";
import { useCart } from "../hooks/useCart";

interface SuccessState {
  id?: string;
  farmer_contact?: string;
  expected_delivery_window?: string;
}

export function OrderSuccess() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const clearCart = useCart((state) => state.clear);
  const state = (location.state ?? {}) as SuccessState;
  const [statusMessage, setStatusMessage] = useState<string>("Checking payment status...");
  const [orderId, setOrderId] = useState<string | null>(state.id ?? null);
  const [tracking, setTracking] = useState<ConsumerOrderTracking | null>(null);

  const sessionId = useMemo(() => searchParams.get("session_id"), [searchParams]);

  useEffect(() => {
    if (!sessionId) {
      setStatusMessage("Order processed.");
      return;
    }

    let disposed = false;
    let tries = 0;
    const maxTries = 20;

    const poll = async () => {
      try {
        const status = await getCheckoutSessionStatus(sessionId);
        if (disposed) {
          return;
        }
        if (status.status === "paid" && status.orderId) {
          setOrderId(status.orderId);
          setStatusMessage("Payment successful and order confirmed.");
          clearCart();
          return;
        }
        if (status.status === "unpaid") {
          setStatusMessage("Payment is not completed.");
          return;
        }
      } catch {
        if (disposed) {
          return;
        }
      }

      tries += 1;
      if (tries < maxTries && !disposed) {
        window.setTimeout(() => {
          void poll();
        }, 1500);
      } else if (!disposed) {
        setStatusMessage("Payment received. Order confirmation is still processing.");
      }
    };

    void poll();
    return () => {
      disposed = true;
    };
  }, [clearCart, sessionId]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let mounted = true;
    const loadTracking = async () => {
      try {
        const data = await getConsumerOrderTracking(orderId);
        if (!mounted) return;
        setTracking(data);
      } catch {
        if (!mounted) return;
      }
    };

    void loadTracking();
    const interval = window.setInterval(() => void loadTracking(), 10000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [orderId]);

  return (
    <section className="dashboard-page stack">
      <article className="card">
        <h2>Order placed successfully</h2>
        <p>{statusMessage}</p>
        <p>Order ID: {orderId ?? "Pending confirmation"}</p>
        <p>Purchase status: {tracking?.purchaseStatus ?? "BOUGHT"}</p>
        <p>Delivery status: {tracking?.deliveryStatus ?? "PENDING_PICKUP"}</p>
        <p>Farmer contact: {state.farmer_contact ?? "Not available"}</p>
        <p>Expected delivery window: {state.expected_delivery_window ?? "Within 2-4 days"}</p>
        <Link className="btn btn-primary" to="/dashboard/consumer/marketplace">
          Back to marketplace
        </Link>
      </article>
    </section>
  );
}
