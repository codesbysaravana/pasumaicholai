import type { CropListing } from "../types";
import { MarketplaceCard } from "./MarketplaceCard";

interface MarketplaceGridProps {
  listings: CropListing[];
  emptyMessage?: string;
}

export function MarketplaceGrid({ listings, emptyMessage = "No crop listings found." }: MarketplaceGridProps) {
  if (listings.length === 0) {
    return <p className="muted">{emptyMessage}</p>;
  }

  return (
    <section className="marketplace-modern-grid">
      {listings.map((listing) => (
        <MarketplaceCard key={listing.id} listing={listing} />
      ))}
    </section>
  );
}
