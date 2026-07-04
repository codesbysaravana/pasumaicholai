import type { ProductFilters } from "../services/marketplaceApi";

interface FilterBarProps {
  filters: ProductFilters;
  categories: string[];
  onChange: (filters: ProductFilters) => void;
}

export function FilterBar({ filters, categories, onChange }: FilterBarProps) {
  return (
    <article className="marketplace-premium-filter" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
      <div className="premium-input-group">
        <label className="premium-input-label">Search</label>
        <input
          className="premium-marketplace-input"
          placeholder="Search products..."
          value={filters.search ?? ""}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </div>

      <div className="premium-input-group">
        <label className="premium-input-label">Category</label>
        <select className="premium-marketplace-input" value={filters.category ?? "all"} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="premium-input-group">
        <label className="premium-input-label">Location</label>
        <input
          className="premium-marketplace-input"
          placeholder="Location"
          value={filters.location ?? ""}
          onChange={(event) => onChange({ ...filters, location: event.target.value })}
        />
      </div>

      <div className="premium-input-group">
        <label className="premium-input-label">Min Price (₹)</label>
        <input
          className="premium-marketplace-input"
          type="number"
          min={0}
          placeholder="Min price"
          value={filters.price_min ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              price_min: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        />
      </div>

      <div className="premium-input-group">
        <label className="premium-input-label">Max Price (₹)</label>
        <input
          className="premium-marketplace-input"
          type="number"
          min={0}
          placeholder="Max price"
          value={filters.price_max ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              price_max: event.target.value ? Number(event.target.value) : undefined,
            })
          }
        />
      </div>

      <div className="premium-input-group">
        <label className="premium-input-label">Sort By</label>
        <select className="premium-marketplace-input" value={filters.sort ?? "latest"} onChange={(event) => onChange({ ...filters, sort: event.target.value as ProductFilters["sort"] })}>
          <option value="latest">Latest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="quantity_desc">Quantity: High to Low</option>
        </select>
      </div>
    </article>

  );
}
