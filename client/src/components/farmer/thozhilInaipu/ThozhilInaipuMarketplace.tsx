import { useMemo, useState } from "react";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { ThozhilInaipuProductGrid } from "./ThozhilInaipuProductGrid";
import type { ThozhilInaipuProduct } from "./ThozhilInaipuProductCard";

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Consultation", href: "/dashboard/farmer" },
  { label: "Chatbot", href: "/dashboard/farmer/chatbot" },
  { label: "🌾 Thozhil Inaipu", href: "/farmer/thozhil-inaipu" },
];

const thozhilInaipuProducts: ThozhilInaipuProduct[] = [
  {
    id: "1",
    name: "Coconut Shells",
    price: "₹12/kg",
    location: "Pollachi",
    seller: "Ramesh Coconut Farm",
    image: "/assets/coconut-shell.jpg",
  },
  {
    id: "2",
    name: "Coconut Fiber",
    price: "₹18/kg",
    location: "Coimbatore",
    seller: "Green Valley Farms",
    image: "/assets/coconut-fiber.jpg",
  },
  {
    id: "3",
    name: "Coir Waste",
    price: "₹9/kg",
    location: "Erode",
    seller: "Natural Coir Collective",
    image: "/assets/coir-waste.jpg",
  },
  {
    id: "4",
    name: "Agricultural Waste Bundle",
    price: "₹7/kg",
    location: "Tiruppur",
    seller: "Muthu Organic Farms",
    image: "/assets/agri-waste.jpg",
  },
  {
    id: "5",
    name: "Coir Pith Blocks",
    price: "₹14/kg",
    location: "Udumalpet",
    seller: "Nila Coir Works",
    image: "/assets/coir-pith.jpg",
  },
];

export function ThozhilInaipuMarketplace() {
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      return thozhilInaipuProducts;
    }
    return thozhilInaipuProducts.filter((item) =>
      `${item.name} ${item.location} ${item.seller}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <DashboardLayout title="Thozhil Inaipu" items={farmerItems}>
      <section className="dashboard-page stack">
        <article className="card">
          <h2>Farmer-to-Farmer Resource Marketplace</h2>
          <p className="muted">
            Buy and sell coconut byproducts, coir materials, and natural farming resources within the farmer network.
          </p>
        </article>

        <article className="card">
          <h3>Search Resources</h3>
          <input
            className="input"
            type="text"
            placeholder="Search products, location, seller..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </article>

        <ThozhilInaipuProductGrid products={filteredProducts} />
      </section>
    </DashboardLayout>
  );
}
