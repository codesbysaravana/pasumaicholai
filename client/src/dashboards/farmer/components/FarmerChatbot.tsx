import { Link } from "react-router-dom";

export function FarmerChatbot() {
  return (
    <article className="module-card">
      <div className="module-card-header">
        <h3>Uzhavar Thunai</h3>
        <p>Get instant guidance and crop suggestions.</p>
      </div>
      <Link to="/dashboard/farmer/chatbot" className="btn btn-primary mt-auto">
        Start Chatbot
      </Link>
    </article>
  );
}
