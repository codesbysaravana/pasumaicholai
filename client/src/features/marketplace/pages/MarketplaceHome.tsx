import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { getCropListings } from "../api";
import { MarketplaceGrid } from "../components/MarketplaceGrid";
import type { CropCategory, CropListing } from "../types";
import { Pagination } from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 6;

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Complaints", href: "/dashboard/farmer/complaints" },
];

const allCategories: Array<CropCategory | "all"> = ["all", "fruit", "vegetable", "grain", "other"];

export function MarketplaceHome() {
  const [listings, setListings] = useState<CropListing[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CropCategory | "all">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCropListings();
        setListings(data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Failed to load marketplace listings.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return listings.filter((listing) => {
      const categoryMatch = category === "all" ? true : listing.category === category;
      const queryMatch =
        normalizedQuery.length === 0
          ? true
          : listing.cropName.toLowerCase().includes(normalizedQuery) ||
          listing.location.toLowerCase().includes(normalizedQuery) ||
          listing.description.toLowerCase().includes(normalizedQuery);

      return categoryMatch && queryMatch;
    });
  }, [category, listings, query]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    setCurrentPage(1);
  };

  const handleCategoryChange = (cat: CropCategory | "all") => {
    setCategory(cat);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Open Marketplace" items={farmerItems}>
      <section className="marketplace-page">
        <header className="marketplace-premium-hero">
          <h1>Open Marketplace</h1>
          <p>The bridge between farm-fresh produce and nationwide buyers. Publish your listings and get the best value for your hard work.</p>
          <div className="marketplace-hero-actions">
            <Link className="btn btn-primary" to="/dashboard/farmer/marketplace/create">
              Create New Listing
            </Link>
            <Link className="btn btn-secondary" to="/dashboard/farmer/marketplace/my-listings">
              Manage My Listings
            </Link>
          </div>
        </header>

        <article className="marketplace-premium-filter">
          <div className="premium-input-group">
            <label className="premium-input-label">Search Listings</label>
            <div className="premium-input-wrapper">
              <input
                className="premium-marketplace-input"
                placeholder="Search crops, location, quality..."
                value={query}
                onChange={(event) => handleQueryChange(event.target.value)}
              />
            </div>
          </div>

          <div className="premium-input-group">
            <label className="premium-input-label">Category</label>
            <select
              className="premium-marketplace-input"
              value={category}
              onChange={(event) => handleCategoryChange(event.target.value as CropCategory | "all")}
              style={{ minWidth: "160px" }}
            >
              {allCategories.map((item) => (
                <option key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </article>


        {isLoading ? <div className="card loader">Loading listings...</div> : null}
        {error ? <div className="card">{error}</div> : null}
        {!isLoading && !error && (
          <>
            <MarketplaceGrid listings={paginatedListings} emptyMessage="No listings match your filters yet." />
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
