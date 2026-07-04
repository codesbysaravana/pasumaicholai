export interface ThozhilInaipuProduct {
  id: string;
  name: string;
  price: string;
  location: string;
  seller: string;
  image: string;
}

interface ThozhilInaipuProductCardProps {
  product: ThozhilInaipuProduct;
}

export function ThozhilInaipuProductCard({ product }: ThozhilInaipuProductCardProps) {
  return (
    <article className="card">
      <div
        style={{
          width: "100%",
          height: "160px",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "0.75rem",
          background: "#edf7f1",
          border: "1px solid #d7eade",
        }}
      >
        <img
          src={product.image}
          alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      </div>

      <h3 style={{ marginBottom: "0.35rem" }}>{product.name}</h3>
      <p className="muted" style={{ marginBottom: "0.35rem" }}>
        Seller: {product.seller}
      </p>
      <p className="muted" style={{ marginBottom: "0.35rem" }}>
        Location: {product.location}
      </p>
      <p style={{ margin: 0, fontWeight: 700 }}>{product.price}</p>
    </article>
  );
}


//for pushing