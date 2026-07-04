import type { CropListing } from "../types";

interface MarketplaceCardProps {
  listing: CropListing;
}

export function MarketplaceCard({ listing }: MarketplaceCardProps) {
  const statusLabel = listing.status === "active" ? "Available" : listing.status.toUpperCase();

  return (
    <article className="marketplace-premium-card">
      <div className="marketplace-img-wrapper">
        <div className="marketplace-premium-badge">{statusLabel}</div>
        <img
          src={listing.images[0] || "https://placehold.co/600x400?text=Fresh+Crop"}
          alt={listing.cropName}
          className="marketplace-img"
        />
      </div>

      <div className="marketplace-premium-content">
        <span className="marketplace-subtitle">{listing.category}</span>
        <h3 className="marketplace-premium-title">{listing.cropName}</h3>

        <p className="muted" style={{ margin: 0, fontSize: "0.85rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {listing.description}
        </p>

        <div className="marketplace-details-row">
          <div className="marketplace-premium-price">
            <span className="marketplace-price-value">₹{listing.pricePerKg}</span>
            <span className="marketplace-price-label">per kg</span>
          </div>
          <div className="marketplace-quantity-badge">
            {listing.quantity} {listing.unit || "kg"}
          </div>
        </div>
      </div>

      <div className="marketplace-info-footer">
        <div className="marketplace-footer-item">
          <span>📍</span> {listing.location}
        </div>
        <div className="marketplace-footer-item" style={{ marginLeft: "auto" }}>
          <span>📅</span> {new Date(listing.harvestDate).toLocaleDateString()}
        </div>
      </div>
    </article>
  );
}

