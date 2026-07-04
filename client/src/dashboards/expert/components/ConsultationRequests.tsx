import { Link } from "react-router-dom";

export function ConsultationRequests() {
  return (
    <article className="module-card">
      <h3>Provide Consultation</h3>
      <p>Accept and handle consultation requests from farmers.</p>
      <Link to="/expert/dashboard" className="btn btn-primary">
        View Requests
      </Link>
    </article>
  );
}
