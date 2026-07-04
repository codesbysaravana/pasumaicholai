import type { ExpertChatExpert } from "../../../services/expertChatApi";

interface ExpertListProps {
  experts: ExpertChatExpert[];
  onSelectExpert: (expert: ExpertChatExpert) => void;
}

export function ExpertList({ experts, onSelectExpert }: ExpertListProps) {
  return (
    <section className="expert-modern-grid">
      {experts.map((expert) => {
        const initials = expert.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

        return (
          <article key={expert.id} className="expert-premium-card">
            <header className="expert-card-header">
              <div className="expert-avatar-circle">
                {initials}
              </div>
              <div className="expert-info">
                <h3 className="expert-name">{expert.name}</h3>
                <span className="expert-spec">{expert.specialization || "Agriculture Expert"}</span>
              </div>
            </header>

            <div className="expert-card-body">
              <div className="expert-detail-item">
                <span className="expert-detail-label">Email</span>
                <span className="expert-detail-value">{expert.email}</span>
              </div>
              <div className="expert-detail-item">
                <span className="expert-detail-label">Phone</span>
                <span className="expert-detail-value">{expert.phone || "N/A"}</span>
              </div>
              <div className="expert-detail-item">
                <span className="expert-detail-label">Status</span>
                <span className="expert-detail-value" style={{
                  color: expert.status === "active" ? "#22c55e" : "#ef4444"
                }}>{expert.status.toUpperCase()}</span>
              </div>
            </div>

            <div className="expert-action-row">
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={() => onSelectExpert(expert)}
                style={{ padding: "1rem" }}
              >
                Start Consultation
              </button>
            </div>
          </article>
        );
      })}
    </section>

  );
}
