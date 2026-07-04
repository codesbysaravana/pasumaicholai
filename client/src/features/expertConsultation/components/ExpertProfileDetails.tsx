import type { ExpertChatExpert } from "../../../services/expertChatApi";

interface ExpertProfileDetailsProps {
  expert: ExpertChatExpert | null;
}

export function ExpertProfileDetails({ expert }: ExpertProfileDetailsProps) {
  if (!expert) {
    return (
      <article className="card expert-profile-panel">
        <h3>Expert Profile</h3>
        <p className="muted">Select an expert to see phone, specialization, and status.</p>
      </article>
    );
  }

  return (
    <article className="card expert-profile-panel">
      <h3>{expert.name}</h3>
      <p className="muted">{expert.email}</p>
      <div className="expert-meta-grid">
        <div>
          <span className="muted">Specialization</span>
          <p>{expert.specialization || "Agriculture Expert"}</p>
        </div>
        <div>
          <span className="muted">Phone</span>
          <p>{expert.phone || "Not available"}</p>
        </div>
        <div>
          <span className="muted">Status</span>
          <p className={`expert-status expert-status-${expert.status}`}>{expert.status}</p>
        </div>
      </div>
    </article>
  );
}
