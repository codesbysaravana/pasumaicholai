import { useEffect, useMemo, useState } from "react";
import { getFarmerRecommendedCropPrices, type CropPriceRecord } from "../../api/cropPricingApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Pagination } from "../../components/ui/Pagination";

const ITEMS_PER_PAGE = 8;

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Complaints", href: "/dashboard/farmer/complaints" },
];

function demandLabel(score: number): { text: string; className: string } {
  if (score >= 0.8) {
    return { text: "High", className: "demand-chip demand-high" };
  }
  if (score >= 0.6) {
    return { text: "Medium", className: "demand-chip demand-medium" };
  }
  return { text: "Low", className: "demand-chip demand-low" };
}

export function FarmerRecommendedPricesPage() {
  const [records, setRecords] = useState<CropPriceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getFarmerRecommendedCropPrices();
        setRecords(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load recommended crop prices.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => b.demand_score - a.demand_score || a.crop.localeCompare(b.crop));
  }, [records]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  return (
    <DashboardLayout title="Recommended Market Prices" items={farmerItems}>
      <section className="marketplace-page">
        <header className="marketplace-premium-hero">
          <h1>Price Analytics</h1>
          <p>Optimize your profits by comparing base prices with our AI-recommended market pricing based on real-time demand across the region.</p>
        </header>

        {isLoading && <div className="card loader">Analyzing market trends...</div>}
        {error && <div className="card experts-error">{error}</div>}

        {!isLoading && !error && (
          <>
            <div className="pricing-modern-grid">
              {paginatedRecords.map((item) => {
                const demand = demandLabel(item.demand_score);
                const priceHigher = item.recommended_price > item.base_price;
                const diffPercent = ((item.recommended_price - item.base_price) / item.base_price) * 100;

                return (
                  <article key={item.crop} className="pricing-card">
                    <header className="pricing-header">
                      <div className="pricing-crop-info">
                        <span className="pricing-category-badge">{item.category}</span>
                        <h3 className="pricing-crop-name">{item.crop}</h3>
                      </div>
                      <span className={demand.className}>{demand.text} Demand</span>
                    </header>

                    <div className="pricing-body">
                      <span className="price-label-small">Recommended Price</span>
                      <span className="price-value-large">₹{item.recommended_price.toFixed(0)}</span>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>per kilogram</span>
                    </div>

                    <div className="price-comparison-row">
                      <div className="base-price-info">
                        <span className="price-label-small">Base Price</span>
                        <span className="price-value-mid">₹{item.base_price.toFixed(2)}</span>
                      </div>
                      <div className="price-diff-indicator" style={{
                        background: priceHigher ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: priceHigher ? "#22c55e" : "#ef4444",
                        borderColor: priceHigher ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"
                      }}>
                        {priceHigher ? "+" : ""}{diffPercent.toFixed(1)}%
                      </div>
                    </div>

                    <footer className="pricing-footer">
                      <span className="muted" style={{ fontSize: "0.75rem" }}>
                        Updated: {new Date(item.last_updated).toLocaleDateString()}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} style={{
                            width: "12px",
                            height: "4px",
                            borderRadius: "2px",
                            background: i < (item.demand_score * 3) ? "#22c55e" : "rgba(255,255,255,0.1)"
                          }} />
                        ))}
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>


    </DashboardLayout>
  );
}
