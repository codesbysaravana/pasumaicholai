import { useEffect, useState } from "react";
import { deleteTalukAdmin, getTalukAdmins, type TalukAdminRecord } from "../../api/talukAdminApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { adminNavItems } from "./adminNav";
import { CreateTalukAdminForm } from "./components/CreateTalukAdminForm";
import { EditTalukAdminForm } from "./components/EditTalukAdminForm";

export function TalukAdminsPage() {
  const [records, setRecords] = useState<TalukAdminRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<TalukAdminRecord | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // New UI States
  const [showTable, setShowTable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const loadTalukAdmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getTalukAdmins();
      setRecords(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch Taluk Admins.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTalukAdmins();
  }, []);

  const removeTalukAdmin = async (record: TalukAdminRecord) => {
    const ok = window.confirm(`Delete taluk admin ${record.username}?`);
    if (!ok) return;

    setIsDeletingId(record.id);
    setError(null);
    try {
      await deleteTalukAdmin(record.id);
      setRecords((prev) => prev.filter((entry) => entry.id !== record.id));
      if (editing?.id === record.id) setEditing(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete Taluk Admin.");
    } finally {
      setIsDeletingId(null);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const paginatedRecords = records.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <DashboardLayout title="Taluk Admin Management" items={adminNavItems}>
      <section className="dashboard-page stack">
        {/* Header Card with Toggle */}
        <article className="card">
          <div className="flex justify-between items-start">
            <div>
              <h2>Manage Taluk Admins</h2>
              <p className="muted">Configure login credentials and regional assignments for Taluk administrators.</p>
            </div>
            <button
              className={`btn ${showTable ? "btn-secondary" : "btn-primary"}`}
              onClick={() => {
                setShowTable(!showTable);
                setCurrentPage(1);
              }}
            >
              {showTable ? "Hide Admin List" : "View All Taluk Admins"}
            </button>
          </div>
        </article>

        {error && <div className="card experts-error">{error}</div>}

        {/* Unified Tab/Form Card */}
        <article className="card pt-4">
          <div className="tab-group mb-6">
            <button
              className={`tab-btn active`}
            >
              {editing ? `Editing: ${editing.username}` : "Create New Admin"}
            </button>
          </div>

          <div className="tab-content">
            {editing ? (
              <EditTalukAdminForm
                talukAdmin={editing}
                onUpdated={() => {
                  setEditing(null);
                  void loadTalukAdmins();
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <CreateTalukAdminForm onCreated={loadTalukAdmins} />
            )}
          </div>
        </article>

        {/* Paginated Table Section */}
        {showTable && (
          <article className="card experts-table-card">
            <div className="experts-table-header">
              <h3>Taluk Admin Records</h3>
              <span className="muted">{records.length} administrators found</span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center loader">Syncing taluk data...</div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center muted">No records available. Create one above.</div>
            ) : (
              <>
                <div className="experts-table-wrap">
                  <table className="experts-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Taluk Name</th>
                        <th>Created At</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <div className="flex flex-col">
                              <span className="font-bold">{record.username}</span>
                              <span className="text-[10px] opacity-40 uppercase tracking-widest">{record.id}</span>
                            </div>
                          </td>
                          <td>
                            <span className="tag-chip">{record.talukName}</span>
                          </td>
                          <td className="text-sm opacity-60">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex justify-end gap-3">
                              <button
                                type="button"
                                className="btn btn-secondary text-xs"
                                onClick={() => {
                                  setEditing(record);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger text-xs"
                                onClick={() => void removeTalukAdmin(record)}
                                disabled={isDeletingId === record.id}
                              >
                                {isDeletingId === record.id ? "..." : "Delete"}
                              </button>
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
              </>
            )}
          </article>
        )}
      </section>
    </DashboardLayout>
  );
}
