import { useEffect, useState } from "react";
import {
  getFarmerPaymentNotifications,
  markFarmerPaymentNotificationsSeen,
  type FarmerPaymentNotification,
} from "../../../api/farmerPaymentsApi";

export function PaymentNotifications() {
  const [notifications, setNotifications] = useState<FarmerPaymentNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setError(null);
      try {
        const data = await getFarmerPaymentNotifications();
        if (!active || data.length === 0) {
          return;
        }
        setNotifications(data);
        await markFarmerPaymentNotificationsSeen(data.map((item) => item.id));
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load payment notifications.");
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <article className="card">
        <p className="muted">{error}</p>
      </article>
    );
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <article className="module-card border-[#f59e0b]/20 bg-[#f59e0b]/[0.02]">
      <div className="module-card-header mb-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] animate-pulse"></div>
          <h3 className="text-[#f59e0b]">Payment Alerts</h3>
        </div>
        <p>Recent earnings from your marketplace listings.</p>
      </div>

      <div className="grid gap-3">
        {notifications.slice(0, 3).map((notification) => (
          <div key={notification.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/5 flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-accent-green">
              <span>Success</span>
              <span className="text-[#f59e0b]">Rs.{notification.amount.toFixed(2)}</span>
            </div>
            <div className="text-sm font-bold text-white/90 truncate">
              {notification.productName} purchased
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">
              Buyer: {notification.buyerName}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
