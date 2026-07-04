import { useEffect, useState } from "react";
import { getMarketplaceProduct, placeListingOrder, type MarketplaceProduct } from "../services/marketplaceApi";
import { useCart } from "../hooks/useCart";

interface ProductDetailsModalProps {
  productId: string | null;
  onClose: () => void;
}

export function ProductDetailsModal({ productId, onClose }: ProductDetailsModalProps) {
  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const addProduct = useCart((state) => state.addProduct);

  useEffect(() => {
    if (!productId) {
      return;
    }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMarketplaceProduct(productId);
        setProduct(data);
        setQuantity(1);
        setSuccessMessage(null);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load product details.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [productId]);

  if (!productId) {
    return null;
  }

  return (
    <div
      role="presentation"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 40,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <article className="marketplace-premium-card" style={{ width: "min(850px, 98vw)", maxHeight: "92vh", overflowY: "auto", padding: "0" }} onClick={(event) => event.stopPropagation()}>
        {isLoading && <div style={{ padding: "3rem", textAlign: "center", color: "#22c55e" }}>Loading Product Details...</div>}
        {error && <div style={{ padding: "1.5rem", color: "#ef4444" }}>{error}</div>}
        {successMessage && <div style={{ padding: "1.5rem", color: "#22c55e" }}>{successMessage}</div>}

        {product && (
          <>
            <div className="marketplace-img-wrapper" style={{ aspectRatio: "16/8", borderRadius: "0" }}>
              <img
                src={product.image_url || "https://placehold.co/1200x600?text=Fresh+Crop"}
                alt={product.name}
                className="marketplace-img"
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ position: "absolute", top: "1.25rem", right: "1.25rem", borderRadius: "99px", background: "rgba(0,0,0,0.5)", border: "none" }}
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            <div className="marketplace-premium-content" style={{ padding: "1.75rem 2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.5rem" }}>
                <div>
                  <span className="marketplace-subtitle">Product Detail</span>
                  <h2 className="marketplace-premium-title" style={{ fontSize: "2rem" }}>{product.name}</h2>
                  <p className="muted" style={{ fontSize: "0.95rem", marginTop: "0.25rem" }}>Farmer: {product.farmer_name} • {product.location}</p>
                </div>
                <div className="marketplace-premium-price" style={{ textAlign: "right" }}>
                  <span className="marketplace-price-value" style={{ fontSize: "2.4rem" }}>₹{product.price}</span>
                  <span className="marketplace-price-label">per kg</span>
                </div>
              </div>

              <p style={{ fontSize: "1.1rem", color: "rgba(255,255,255,0.8)", marginBottom: "1.5rem", lineHeight: "1.5" }}>
                {product.description}
              </p>

              <div className="marketplace-premium-filter" style={{ gridTemplateColumns: "1fr auto", gap: "1.5rem", marginBottom: "2rem" }}>
                <div className="premium-input-group">
                  <label className="premium-input-label">Quantity to Buy ({product.quantity} kg available)</label>
                  <input
                    className="premium-marketplace-input"
                    type="number"
                    min={1}
                    max={product.quantity}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "1rem 2rem" }}
                    onClick={() => void addProduct(product, quantity).then(onClose)}
                  >
                    Add to Cart
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={isBuying}
                    style={{ padding: "1rem 2rem" }}
                    onClick={() =>
                      void (async () => {
                        setIsBuying(true);
                        setError(null);
                        setSuccessMessage(null);
                        try {
                          const response = await placeListingOrder({ listingId: product.id, quantity });
                          setSuccessMessage(`Order placed successfully. Order ID: ${response.id}`);
                        } catch (caughtError) {
                          setError(caughtError instanceof Error ? caughtError.message : "Failed to place order.");
                        } finally {
                          setIsBuying(false);
                        }
                      })()
                    }
                  >
                    {isBuying ? "Buying..." : "Quick Buy"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", opacity: "0.5", fontSize: "0.85rem" }}>
                <span>📅 Harvested: {new Date(product.created_at).toLocaleDateString()}</span>
                <span>📍 Location: {product.location}</span>
              </div>
            </div>
          </>
        )}
      </article>



    </div>
  );
}
