import type { ExpertRecord } from "../../../api/usersApi";

interface ExpertRecordsTableProps {
  experts: ExpertRecord[];
  selectedExpertId?: string;
  onSelectExpert: (expert: ExpertRecord) => void;
}

export function ExpertRecordsTable({ experts, selectedExpertId, onSelectExpert }: ExpertRecordsTableProps) {
  return (
    <div className="card experts-table-card">
      <div className="experts-table-header">
        <h3>Available Experts</h3>
        <span className="tag-chip">{experts.length} records</span>
      </div>

      <div className="experts-table-wrap">
        <table className="experts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Specialization</th>
              <th>Status</th>
              <th>Expert ID</th>
            </tr>
          </thead>
          <tbody>
            {experts.map((expert) => (
              <tr
                key={expert.id}
                className={selectedExpertId === expert.id ? "experts-row-active" : ""}
                onClick={() => onSelectExpert(expert)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectExpert(expert);
                  }
                }}
              >
                <td>{expert.fullName}</td>
                <td>{expert.email}</td>
                <td>{expert.phone ?? "N/A"}</td>
                <td>{expert.specialization ?? "Agriculture Expert"}</td>
                <td>
                  <span className={`expert-status expert-status-${expert.status}`}>{expert.status}</span>
                </td>
                <td>
                  <code>{expert.id}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
