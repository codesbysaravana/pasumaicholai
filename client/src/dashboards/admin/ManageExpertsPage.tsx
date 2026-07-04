import { useEffect, useState } from "react";
import { getExperts, type ExpertRecord } from "../../api/usersApi";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { adminNavItems } from "./adminNav";
import { ExpertRecordsTable } from "./components/ExpertRecordsTable";

export function ManageExpertsPage() {
  const [experts, setExperts] = useState<ExpertRecord[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<ExpertRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExperts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getExperts();
        setExperts(result);
        setSelectedExpert(result[0] ?? null);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to fetch experts.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadExperts();
  }, []);

  return (
    <DashboardLayout title="Manage Experts" items={adminNavItems}>
      <section className="dashboard-page stack">
        <article className="card">
          <h2>Expert Registry</h2>
          <p className="muted">Review all available experts fetched directly from the database records.</p>
        </article>

        {isLoading ? <div className="card loader">Loading experts...</div> : null}
        {!isLoading && error ? <div className="card experts-error">{error}</div> : null}
        {!isLoading && !error && experts.length === 0 ? (
          <div className="card muted">No expert records are currently available.</div>
        ) : null}
        {!isLoading && !error && experts.length > 0 ? (
          <>
            <ExpertRecordsTable
              experts={experts}
              selectedExpertId={selectedExpert?.id}
              onSelectExpert={(expert) => setSelectedExpert(expert)}
            />
            <article className="card expert-profile-panel">
              <h3>Expert Profile Details</h3>
              {selectedExpert ? (
                <div className="expert-meta-grid">
                  <div>
                    <span className="muted">Name</span>
                    <p>{selectedExpert.fullName}</p>
                  </div>
                  <div>
                    <span className="muted">Phone</span>
                    <p>{selectedExpert.phone ?? "Not available"}</p>
                  </div>
                  <div>
                    <span className="muted">Specialization</span>
                    <p>{selectedExpert.specialization ?? "Agriculture Expert"}</p>
                  </div>
                  <div>
                    <span className="muted">Status</span>
                    <p className={`expert-status expert-status-${selectedExpert.status}`}>{selectedExpert.status}</p>
                  </div>
                </div>
              ) : (
                <p className="muted">Select an expert record to view profile details.</p>
              )}
            </article>
          </>
        ) : null}
      </section>
    </DashboardLayout>
  );
}
