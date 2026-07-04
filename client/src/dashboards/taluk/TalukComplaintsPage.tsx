import { useEffect, useMemo, useState } from "react";
import { getTalukComplaints, updateComplaintStatus, type ComplaintRecord, type ComplaintStatus } from "../../api/complaintApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { Pagination } from "../../components/ui/Pagination";

const ITEMS_PER_PAGE = 10;

const talukItems = [
  { label: "Overview", href: "/dashboard/taluk" },
  { label: "Grievances", href: "/dashboard/taluk/complaints" },
  { label: "Delivery", href: "/dashboard/taluk" },
];

const statusFilters: Array<ComplaintStatus | "ALL"> = ["ALL", "PENDING", "ONGOING", "COMPLETED"];

function statusClass(status: ComplaintStatus): string {
  if (status === "COMPLETED") return "complaint-status complaint-status-completed";
  if (status === "ONGOING") return "complaint-status complaint-status-ongoing";
  return "complaint-status complaint-status-pending";
}

function nextStatusOptions(status: ComplaintStatus): ComplaintStatus[] {
  if (status === "PENDING") return ["PENDING", "ONGOING"];
  if (status === "ONGOING") return ["ONGOING", "COMPLETED"];
  return ["COMPLETED"];
}

export function TalukComplaintsPage() {
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | "ALL">("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await getTalukComplaints();
      setComplaints(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load complaints.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const changeStatus = async (id: string, status: ComplaintStatus) => {
    setUpdatingId(id);
    try {
      const updated = await updateComplaintStatus(id, status);
      setComplaints((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update complaint status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredComplaints = useMemo(() => {
    return complaints.filter((item) => statusFilter === "ALL" || item.status === statusFilter);
  }, [complaints, statusFilter]);

  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredComplaints.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredComplaints, currentPage]);

  const handleFilterChange = (filter: ComplaintStatus | "ALL") => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  return (
    <DashboardLayout title="Taluk Complaints" items={talukItems}>
      <section className="dashboard-page stack">
        <article className="card">
          <h2>Incoming Complaints</h2>
          <p className="muted">Review and update complaint status for your assigned region.</p>
        </article>

        {isLoading ? <div className="card loader">Loading complaints...</div> : null}
        {error ? <div className="card experts-error">{error}</div> : null}
        {!isLoading && !error && complaints.length === 0 ? <div className="card muted">No complaints assigned yet.</div> : null}

        {!isLoading && complaints.length > 0 ? (
          <article className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Assigned Complaints</h3>
              <div className="inline-actions">
                <span className="tag-chip">{filteredComplaints.length} records</span>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(event) => handleFilterChange(event.target.value as ComplaintStatus | "ALL")}
                >
                  {statusFilters.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="stack">
              <div className="experts-table-wrap">
                <table className="experts-table">
                  <thead>
                    <tr>
                      <th>Complaint ID</th>
                      <th>Farmer Name</th>
                      <th>Farmer Contact</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Location</th>
                      <th>Attachment</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedComplaints.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <code>{item.complaintId ?? item.id}</code>
                        </td>
                        <td>{item.farmerName}</td>
                        <td>{item.farmerPhone || "N/A"}</td>
                        <td>{item.complaintType}</td>
                        <td>{item.description}</td>
                        <td>{item.farmerLocation}</td>
                        <td>
                          {item.attachmentUrl ? (
                            <a href={item.attachmentUrl} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td>{new Date(item.createdAt).toLocaleString()}</td>
                        <td>
                          <div className="stack">
                            <span className={statusClass(item.status)}>{item.status}</span>
                            <select
                              className="input"
                              value={item.status}
                              disabled={updatingId === item.id}
                              onChange={(event) => void changeStatus(item.id, event.target.value as ComplaintStatus)}
                            >
                              {nextStatusOptions(item.status).map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            {item.escalated ? <span className="tag-chip">Escalated</span> : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
            {!filteredComplaints.length ? <div className="card muted">No complaints in selected status.</div> : null}
          </article>
        ) : null}
      </section>

    </DashboardLayout>
  );
}
