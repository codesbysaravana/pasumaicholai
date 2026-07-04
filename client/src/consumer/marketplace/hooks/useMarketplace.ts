import { useEffect, useMemo, useState } from "react";
import { getMarketplaceProducts, type MarketplaceProduct, type ProductFilters } from "../services/marketplaceApi";

const initialFilters: ProductFilters = {
  search: "",
  category: "all",
  location: "",
  sort: "latest",
};

export function useMarketplace() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  useEffect(() => {
    let isDisposed = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMarketplaceProducts(filters);
        if (!isDisposed) {
          setProducts(data);
        }
      } catch (caughtError) {
        if (!isDisposed) {
          setError(caughtError instanceof Error ? caughtError.message : "Failed to load marketplace products.");
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    };
    void load();
    const interval = window.setInterval(() => {
      void load();
    }, 20000);

    return () => {
      isDisposed = true;
      window.clearInterval(interval);
    };
  }, [filters]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => set.add(product.category));
    return ["all", ...Array.from(set)];
  }, [products]);

  return {
    products,
    isLoading,
    error,
    filters,
    setFilters,
    categories,
  };
}
