import { ThozhilInaipuProductCard, type ThozhilInaipuProduct } from "./ThozhilInaipuProductCard";

interface ThozhilInaipuProductGridProps {
  products: ThozhilInaipuProduct[];
}

export function ThozhilInaipuProductGrid({ products }: ThozhilInaipuProductGridProps) {
  if (!products.length) {
    return <div className="card muted">No Thozhil Inaipu products match your search.</div>;
  }

  return (
    <section
      className="stack"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: "1rem",
      }}
    >
      {products.map((product) => (
        <ThozhilInaipuProductCard key={product.id} product={product} />
      ))}
    </section>
  );
}
