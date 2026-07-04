import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { createCheckoutSession, createRazorpayOrder, placeOrder, verifyRazorpayPayment } from "../services/marketplaceApi";
import { useCart } from "../hooks/useCart";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
}

async function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) {
    return true;
  }

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const items = useCart((state) => state.items);
  const checkout = useCart((state) => state.checkout);
  const setCheckout = useCart((state) => state.setCheckout);
  const subtotal = useCart((state) => state.subtotal);
  const clear = useCart((state) => state.clear);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth?.name && !checkout.name) {
      setCheckout({ name: auth.name });
    }
  }, [auth?.name, checkout.name, setCheckout]);

  const groupedFarmers = Array.from(new Set(items.map((item) => item.product.farmer_name)));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!auth?.userId || items.length === 0) {
      setError("Cart is empty.");
      return;
    }

    const firstFarmer = items[0]?.product.farmer_id;
    if (!firstFarmer || items.some((item) => item.product.farmer_id !== firstFarmer)) {
      setError("Please checkout products from one farmer at a time.");
      return;
    }

    const payload = {
      items: items.map((item) => ({
        listingId: item.product.id,
        quantity: item.quantity,
      })),
      delivery_address: {
        name: checkout.name || auth.name,
        phone: checkout.phone,
        location: checkout.location,
        notes: checkout.notes || undefined,
      },
    };

    setIsSubmitting(true);
    try {
      const razorpayOrder = await createRazorpayOrder(payload);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout.");
      }

      const checkoutInstance = new window.Razorpay({
        key: razorpayOrder.key,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: "Marketplace",
        description: "Order Payment",
        order_id: razorpayOrder.id,
        prefill: {
          name: checkout.name || auth.name,
          contact: checkout.phone,
        },
        theme: {
          color: "#2f855a",
        },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled.");
          },
        },
        handler: async (response) => {
          try {
            const verification = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              checkout_token: razorpayOrder.checkout_token,
            });
            clear();
            navigate("/dashboard/consumer/marketplace/success", {
              state: { id: verification.orderId },
            });
          } catch (verifyError) {
            const verifyMessage = verifyError instanceof Error ? verifyError.message : "Payment verification failed.";
            setError(verifyMessage);
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      checkoutInstance.on("payment.failed", (response) => {
        setError(response.error?.description ?? "Payment failed. Please try again.");
        setIsSubmitting(false);
      });

      checkoutInstance.open();
      return;
    } catch (razorpayError) {
      const razorpayMessage = razorpayError instanceof Error ? razorpayError.message : "Razorpay checkout failed.";

      if (!razorpayMessage.toLowerCase().includes("razorpay is not configured")) {
        setError(razorpayMessage);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const session = await createCheckoutSession(payload);
      if (!session.url) {
        throw new Error("Stripe checkout URL was not returned.");
      }
      window.location.assign(session.url);
    } catch (stripeOrFallbackError) {
      const message = stripeOrFallbackError instanceof Error ? stripeOrFallbackError.message : "Checkout failed.";
      // Keep existing direct order flow as fallback when Stripe is intentionally not configured.
      if (message.toLowerCase().includes("stripe is not configured")) {
        const response = await placeOrder({
          consumer_id: auth.userId,
          farmer_id: firstFarmer,
          products: items.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          total_price: subtotal(),
          delivery_address: {
            name: checkout.name || auth.name,
            phone: checkout.phone,
            location: checkout.location,
            notes: checkout.notes,
          },
        });
        clear();
        navigate("/dashboard/consumer/marketplace/success", {
          state: response,
        });
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="dashboard-page stack">
      <article className="card">
        <h2>Checkout</h2>
        <p className="muted">Confirm delivery details and place order directly with farmer.</p>
      </article>
      <form className="card stack" onSubmit={(event) => void onSubmit(event)}>
        <label className="stack">
          Consumer name
          <input
            className="input"
            value={checkout.name}
            onChange={(event) => setCheckout({ name: event.target.value })}
            placeholder={auth?.name || "Your name"}
            required
          />
        </label>
        <label className="stack">
          Phone number
          <input className="input" value={checkout.phone} onChange={(event) => setCheckout({ phone: event.target.value })} required />
        </label>
        <label className="stack">
          Delivery location
          <input className="input" value={checkout.location} onChange={(event) => setCheckout({ location: event.target.value })} required />
        </label>
        <label className="stack">
          Address notes
          <textarea className="input" rows={3} value={checkout.notes} onChange={(event) => setCheckout({ notes: event.target.value })} />
        </label>

        <article className="card">
          <h3>Order Summary</h3>
          {items.map((item) => (
            <p key={item.product.id}>
              {item.product.name} x {item.quantity} = Rs.{(item.quantity * item.product.price).toFixed(2)}
            </p>
          ))}
          <p className="muted">Farmers: {groupedFarmers.join(", ")}</p>
          <p>Total: Rs.{subtotal().toFixed(2)}</p>
        </article>

        {error ? <p className="muted">{error}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Processing..." : "Pay with Razorpay (Test)"}
        </button>
      </form>
    </section>
  );
}
