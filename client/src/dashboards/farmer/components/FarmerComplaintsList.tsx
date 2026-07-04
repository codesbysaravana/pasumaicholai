import { useEffect, useMemo, useState } from "react";
import { getFarmerComplaints, type ComplaintRecord } from "../../../api/complaintApi";
import { Pagination } from "../../../components/ui/Pagination";

const pollMs = 10000;
const ITEMS_PER_PAGE = 5;

function statusClass(status: ComplaintRecord["status"]): string {
  if (status === "COMPLETED") return "complaint-status complaint-status-completed";
  if (status === "ONGOING") return "complaint-status complaint-status-ongoing";
  return "complaint-status complaint-status-pending";
}

function statusProgress(status: ComplaintRecord["status"]): string {
  if (status === "PENDING") return "1/3 - Waiting for action";
  if (status === "ONGOING") return "2/3 - Under progress";
  return "3/3 - Resolved";
}

export function FarmerComplaintsList() {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await getFarmerComplaints();
        if (!mounted) {
          return;
        }
        setComplaints(data);
        setError(null);
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Failed to load complaints.");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    const interval = window.setInterval(() => void load(), pollMs);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const totalPages = Math.ceil(complaints.length / ITEMS_PER_PAGE);
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return complaints.slice(start, start + ITEMS_PER_PAGE);
  }, [complaints, currentPage]);

  return (
    <div className="complaint-list-container">
      <article className="card experts-table-card">
        <div className="experts-table-header">
          <h3>My Complaint History</h3>
          <span className="tag-chip">{complaints.length} records</span>
        </div>
        {isLoading ? <div className="card loader">Loading complaints...</div> : null}
        {error ? <div className="card experts-error">{error}</div> : null}
        {!isLoading && !error && complaints.length === 0 ? (
          <article className="card muted text-center p-8">
            <p className="muted">No complaints submitted yet.</p>
          </article>
        ) : null}
        {!isLoading && complaints.length > 0 ? (
          <div className="stack">
            <div className="experts-table-wrap">
              <table className="experts-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Status</th>
                    <th>Submitted Time</th>
                    <th>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComplaints.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code>{item.complaintId ?? item.id}</code>
                      </td>
                      <td>
                        <span className={statusClass(item.status)}>{item.status}</span>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                      <td>{statusProgress(item.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        ) : null}
      </article>
    </div>
  );
}
