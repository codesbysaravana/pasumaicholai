import { Link } from "react-router-dom";
import { useCart } from "../hooks/useCart";

export function CartDrawer() {
  const items = useCart((state) => state.items);
  const isOpen = useCart((state) => state.isOpen);
  const close = useCart((state) => state.close);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const removeItem = useCart((state) => state.removeItem);
  const subtotal = useCart((state) => state.subtotal);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.35)",
        zIndex: 45,
      }}
      onClick={close}
    >
      <aside
        className="card stack"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "min(420px, 100vw)",
          height: "100vh",
          borderRadius: 0,
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3>Cart</h3>
          <button type="button" className="btn btn-secondary" onClick={close}>
            Close
          </button>
        </div>

        {items.length === 0 ? <p className="muted">Your cart is empty.</p> : null}

        {items.map((item) => (
          <article key={item.product.id} className="card">
            <h4>{item.product.name}</h4>
            <p className="muted">{item.product.farmer_name}</p>
            <p>Rs.{item.product.price}/kg</p>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void updateQuantity(item.product.id, item.quantity - 1)}
              >
                -
              </button>
              <span>{item.quantity}</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void updateQuantity(item.product.id, item.quantity + 1)}
              >
                +
              </button>
              <button type="button" className="btn btn-danger" onClick={() => void removeItem(item.product.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}

        <div className="card">
          <p>Subtotal: Rs.{subtotal().toFixed(2)}</p>
          <Link className="btn btn-primary" to="/dashboard/consumer/marketplace/checkout" onClick={close}>
            Checkout
          </Link>
        </div>
      </aside>
    </div>
  );
}
