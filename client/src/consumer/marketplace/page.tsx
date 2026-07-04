import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { useMarketplace } from "./hooks/useMarketplace";
import { FilterBar } from "./components/FilterBar";
import { ProductGrid } from "./components/ProductGrid";
import { ProductDetailsModal } from "./components/ProductDetailsModal";
import { CartDrawer } from "./components/CartDrawer";
import { useCart } from "./hooks/useCart";
import { useState, useMemo } from "react";
import { Pagination } from "../../components/ui/Pagination";

const ITEMS_PER_PAGE = 6;

const consumerItems = [
  { label: "Overview", href: "/dashboard/consumer" },
  { label: "Marketplace", href: "/dashboard/consumer/marketplace" },
  { label: "Follows", href: "/dashboard/consumer" },
];

export default function ConsumerMarketplacePage() {
  const { products, isLoading, error, filters, setFilters, categories } = useMarketplace();
  const openCart = useCart((state) => state.open);
  const itemCount = useCart((state) => state.items.reduce((count, item) => count + item.quantity, 0));
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return products.slice(start, start + ITEMS_PER_PAGE);
  }, [products, currentPage]);

  const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE);

  // Reset page when filters change
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Browse Marketplace" items={consumerItems}>
      <section className="marketplace-page">
        <header className="marketplace-premium-hero">
          <h1>Direct From Farms</h1>
          <p>Connect directly with farmers. Get the freshest produce at fair prices, delivered with love from our local agricultural community.</p>
          <div className="marketplace-hero-actions">
            <button type="button" className="btn btn-primary" onClick={openCart}>
              My Shopping Cart ({itemCount})
            </button>
          </div>
        </header>

        <FilterBar filters={filters} categories={categories} onChange={handleFilterChange} />


        {isLoading ? <article className="card loader">Loading products...</article> : null}
        {error ? <article className="card">{error}</article> : null}
        {!isLoading && !error && (
          <>
            <ProductGrid products={paginatedProducts} onView={setSelectedProductId} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>

      <ProductDetailsModal productId={selectedProductId} onClose={() => setSelectedProductId(null)} />
      <CartDrawer />
    </DashboardLayout>
  );
}
