import { useEffect, useState } from "react";
import { getFarmerOrders, type FarmerOrderSummary } from "../../../api/orderApi";

export function OrdersTracker() {
  const [orders, setOrders] = useState<FarmerOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrders, setShowOrders] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getFarmerOrders();
        if (active) {
          setOrders(data);
        }
      } catch (caughtError) {
        if (active) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load orders.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <article className="module-card">
      <div className="module-card-header">
        <h3>My Orders</h3>
        <p>Monitor recent orders from consumers.</p>
      </div>

      <div className="module-card-content flex flex-col gap-4">
        {isLoading ? <p className="muted text-sm">Retrieving order data...</p> : null}
        {error ? <p className="muted text-red-400 text-sm">{error}</p> : null}

        {showOrders && !isLoading && !error && (
          <div className="order-mini-list grid gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {orders.length === 0 ? (
              <p className="muted italic text-xs text-center border border-white/5 p-4 rounded-xl">No recent consumer activity.</p>
            ) : (
              orders.slice(0, 3).map((order) => (
                <div key={order.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col gap-1 transition-all hover:bg-white/[0.06]">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#f59e0b]">
                    <span>{order.status}</span>
                    <span className="text-white/20 font-sans">{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm font-bold text-white/90 truncate">
                    {order.products[0]?.productName ?? "Product"}
                  </div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest">
                    Buyer: {order.buyerName}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          onClick={() => setShowOrders(!showOrders)}
          className="btn btn-primary mt-2 group relative overflow-hidden"
        >
          <span className="relative z-10">{showOrders ? "Hide Activity" : "Track Order Status"}</span>
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        </button>
      </div>
    </article>
  );
}
