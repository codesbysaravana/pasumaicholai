import type { TalukAdminRecord } from "../../../api/talukAdminApi";

interface TalukAdminTableProps {
  records: TalukAdminRecord[];
  isDeletingId: string | null;
  onEdit: (record: TalukAdminRecord) => void;
  onDelete: (record: TalukAdminRecord) => void;
}

export function TalukAdminTable({ records, isDeletingId, onEdit, onDelete }: TalukAdminTableProps) {
  return (
    <article className="card experts-table-card">
      <div className="experts-table-header">
        <h3>Taluk Admins</h3>
        <span className="tag-chip">{records.length} records</span>
      </div>
      <div className="experts-table-wrap">
        <table className="experts-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Taluk Name</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  <code>{record.id}</code>
                </td>
                <td>{record.username}</td>
                <td>{record.talukName}</td>
                <td>{new Date(record.createdAt).toLocaleString()}</td>
                <td>
                  <div className="inline-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => onEdit(record)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => onDelete(record)}
                      disabled={isDeletingId === record.id}
                    >
                      {isDeletingId === record.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
