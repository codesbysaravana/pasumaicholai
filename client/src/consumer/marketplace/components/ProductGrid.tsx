import type { MarketplaceProduct } from "../services/marketplaceApi";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: MarketplaceProduct[];
  onView: (productId: string) => void;
}

export function ProductGrid({ products, onView }: ProductGridProps) {
  if (products.length === 0) {
    return <article className="card">No products available for selected filters.</article>;
  }

  return (
    <section className="marketplace-modern-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onView={onView} />
      ))}
    </section>
  );
}
