import { useEffect, useMemo, useState } from "react";
import { getEscalatedComplaints, type EscalatedComplaintRecord } from "../../api/complaintApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { adminNavItems } from "./adminNav";

const ITEMS_PER_PAGE = 10;

function statusClass(status: EscalatedComplaintRecord["status"]): string {
  if (status === "COMPLETED") return "complaint-status complaint-status-completed";
  if (status === "ONGOING") return "complaint-status complaint-status-ongoing";
  return "complaint-status complaint-status-pending";
}

export function EscalatedComplaintsPage() {
  const [complaints, setComplaints] = useState<EscalatedComplaintRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const loadComplaints = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getEscalatedComplaints();
        setComplaints(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to fetch escalated complaints.");
      } finally {
        setIsLoading(false);
      }
    };

    void loadComplaints();
  }, []);

  const totalPages = Math.ceil(complaints.length / ITEMS_PER_PAGE);
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return complaints.slice(start, start + ITEMS_PER_PAGE);
  }, [complaints, currentPage]);

  return (
    <DashboardLayout title="Escalated Complaints" items={adminNavItems}>
      <section className="dashboard-page stack">
        <article className="card">
          <div className="flex justify-between items-start">
            <div>
              <h2>Escalated Complaints (20+ Hours)</h2>
              <p className="muted">Monitoring critical grievances that require immediate administrative attention.</p>
            </div>
            <button
              className={`btn ${showTable ? "btn-secondary" : "btn-primary"}`}
              onClick={() => {
                setShowTable(!showTable);
                setCurrentPage(1);
              }}
            >
              {showTable ? "Hide Escalations" : "View Escalated Records"}
            </button>
          </div>
        </article>

        {error && <div className="card experts-error">{error}</div>}

        {!showTable && !isLoading && complaints.length > 0 && (
          <article className="card taluk-success flex items-center justify-between">
            <div>
              <span className="font-bold">{complaints.length} complaints</span> require urgent review.
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowTable(true)}
            >
              Inspect Now
            </button>
          </article>
        )}

        {showTable && (
          <article className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Critical Escalations</h3>
              <span className="tag-chip">{complaints.length} overdue records</span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center loader">Analyzing response times...</div>
            ) : complaints.length === 0 ? (
              <div className="p-12 text-center muted">Excellent! No complaints have been pending for over 20 hours.</div>
            ) : (
              <div className="stack">
                <div className="experts-table-wrap">
                  <table className="experts-table">
                    <thead>
                      <tr>
                        <th>Complaint ID</th>
                        <th>Ward/Taluk</th>
                        <th>Pending Time</th>
                        <th>Status</th>
                        <th>Assigned Admin</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedComplaints.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="flex flex-col">
                              <code className="text-xs">{item.complaintId ?? item.id.substring(0, 8)}</code>
                              <span className="text-[10px] opacity-40">{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-sm">{item.wardId || item.farmerLocation || "N/A"}</span>
                              <span className="text-[10px] opacity-50 uppercase tracking-tighter">{item.talukId || "Unknown Taluk"}</span>
                            </div>
                          </td>
                          <td>
                            <span className="text-accent-amber font-bold">{item.hoursPending.toFixed(1)}h</span>
                          </td>
                          <td>
                            <span className={statusClass(item.status)}>{item.status}</span>
                          </td>
                          <td className="text-sm">{item.assignedWardAdmin || "Unassigned"}</td>
                          <td>
                            <div className="max-w-[200px] truncate text-xs muted" title={item.description}>
                              {item.description}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-6 p-6 border-t border-white/5">
                    <button
                      className="btn btn-secondary px-6"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Prev
                    </button>
                    <span className="text-sm font-medium">
                      Page <span className="text-accent-green">{currentPage}</span> of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary px-6"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </article>
        )}
      </section>
    </DashboardLayout>
  );
}
