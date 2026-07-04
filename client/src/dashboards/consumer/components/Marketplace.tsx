import { Link } from "react-router-dom";

export function Marketplace() {
  return (
    <article className="module-card">
      <h3>Purchase Crops</h3>
      <p>Browse and purchase crop listings from farmers.</p>
      <Link className="btn btn-primary" to="/dashboard/consumer/marketplace">
        Browse Marketplace
      </Link>
    </article>
  );
}
