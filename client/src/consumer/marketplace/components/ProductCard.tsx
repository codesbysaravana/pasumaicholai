import type { MarketplaceProduct } from "../services/marketplaceApi";

interface ProductCardProps {
  product: MarketplaceProduct;
  onView: (productId: string) => void;
}

export function ProductCard({ product, onView }: ProductCardProps) {
  return (
    <article className="marketplace-premium-card">
      <div className="marketplace-img-wrapper">
        <div className="marketplace-premium-badge">Available</div>
        <img
          src={product.image_url || "https://placehold.co/600x400?text=Fresh+Crop"}
          alt={product.name}
          className="marketplace-img"
        />
      </div>

      <div className="marketplace-premium-content">
        <span className="marketplace-subtitle">Farmer: {product.farmer_name}</span>
        <h3 className="marketplace-premium-title">{product.name}</h3>

        <div className="marketplace-details-row">
          <div className="marketplace-premium-price">
            <span className="marketplace-price-value">₹{product.price}</span>
            <span className="marketplace-price-label">per kg</span>
          </div>
          <div className="marketplace-quantity-badge">
            {product.quantity} kg
          </div>
        </div>
      </div>

      <div className="marketplace-info-footer" style={{ paddingBottom: "1rem" }}>
        <div className="marketplace-footer-item">
          <span>📍</span> {product.location}
        </div>
      </div>

      <div className="marketplace-premium-actions">
        <button type="button" className="btn btn-secondary w-full" onClick={() => onView(product.id)}>
          View
        </button>
        <button type="button" className="btn btn-primary w-full" onClick={() => onView(product.id)}>
          Buy
        </button>
      </div>
    </article>
  );
}

