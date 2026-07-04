import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
import {
  getExpertSessions,
  getExperts,
  type ExpertChatExpert,
  type ExpertChatSession,
} from "../../../services/expertChatApi";
import { ChatWindow } from "../components/ChatWindow";
import { Pagination } from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 5;

const expertItems = [
  { label: "Overview", href: "/dashboard/expert" },
  { label: "Consultations", href: "/expert/dashboard" },
  { label: "Profile", href: "/dashboard/expert" },
];

export function ExpertChatDashboard() {
  const { auth } = useAuth();
  const [sessions, setSessions] = useState<ExpertChatSession[]>([]);
  const [expertsById, setExpertsById] = useState<Record<string, ExpertChatExpert>>({});
  const [selectedSession, setSelectedSession] = useState<ExpertChatSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadData = async () => {
      if (!auth?.userId) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [sessionItems, expertItemsList] = await Promise.all([getExpertSessions(auth.userId), getExperts()]);
        const expertMap = expertItemsList.reduce<Record<string, ExpertChatExpert>>((acc, expert) => {
          acc[expert.id] = expert;
          return acc;
        }, {});

        setExpertsById(expertMap);
        setSessions(sessionItems);
        setSelectedSession(sessionItems[0] ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load consultation sessions");
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [auth?.userId]);

  const totalPages = Math.ceil(sessions.length / ITEMS_PER_PAGE);
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sessions.slice(start, start + ITEMS_PER_PAGE);
  }, [sessions, currentPage]);

  const selectedExpertName = useMemo(() => {
    if (!selectedSession) {
      return "Farmer Session";
    }
    return expertsById[selectedSession.expert_id]?.name ?? "Farmer Session";
  }, [expertsById, selectedSession]);

  return (
    <DashboardLayout title="Expert Consultation Dashboard" items={expertItems}>
      <section className="dashboard-page stack">
        {isLoading ? <div className="card loader">Loading sessions...</div> : null}
        {error ? <div className="card experts-error">{error}</div> : null}

        {!isLoading ? (
          <article className="card stack">
            <header className="flex justify-between items-center">
              <h2>Active Farmer Sessions</h2>
              <span className="badge">{sessions.length} TOTAL</span>
            </header>

            {sessions.length === 0 ? (
              <p className="muted">No active requests yet.</p>
            ) : (
              <>
                <div className="consult-session-list">
                  {paginatedSessions.map((session) => (
                    <button
                      key={session.session_id}
                      type="button"
                      className={`consult-session-btn ${selectedSession?.session_id === session.session_id ? "consult-session-btn-active" : ""}`}
                      onClick={() => setSelectedSession(session)}
                    >
                      Farmer {session.farmer_id.substring(0, 8)}...
                    </button>
                  ))}
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </article>
        ) : null}

        {selectedSession ? (
          <ChatWindow sessionId={selectedSession.session_id} title={`Consultation - ${selectedExpertName}`} senderRole="expert" />
        ) : null}
      </section>
    </DashboardLayout>
  );
}
