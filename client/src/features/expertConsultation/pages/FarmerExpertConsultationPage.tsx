import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
import {
  getExperts,
  startSession,
  type ExpertChatExpert,
  type ExpertChatSession,
} from "../../../services/expertChatApi";
import { ChatWindow } from "../components/ChatWindow";
import { ExpertList } from "../components/ExpertList";
import { Pagination } from "../../../components/ui/Pagination";

const ITEMS_PER_PAGE = 6;

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Complaints", href: "/dashboard/farmer/complaints" },
];

export function FarmerExpertConsultationPage() {
  const { auth } = useAuth();
  const [experts, setExperts] = useState<ExpertChatExpert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<ExpertChatExpert | null>(null);
  const [session, setSession] = useState<ExpertChatSession | null>(null);
  const [isLoadingExperts, setIsLoadingExperts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadExperts = async () => {
      setIsLoadingExperts(true);
      setError(null);
      try {
        const items = await getExperts();
        setExperts(items);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load experts");
      } finally {
        setIsLoadingExperts(false);
      }
    };

    void loadExperts();
  }, []);

  const totalPages = Math.ceil(experts.length / ITEMS_PER_PAGE);
  const paginatedExperts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return experts.slice(start, start + ITEMS_PER_PAGE);
  }, [experts, currentPage]);

  const selectExpert = async (expert: ExpertChatExpert) => {
    if (!auth?.userId) {
      return;
    }
    setSelectedExpert(expert);
    setError(null);
    try {
      const createdSession = await startSession(expert.id);
      setSession(createdSession);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Failed to start chat session");
      setSession(null);
    }
  };


  return (
    <DashboardLayout title="Expert Consultation" items={farmerItems}>
      <section className="marketplace-page">
        <header className="marketplace-premium-hero">
          <h1>Expert Consultation</h1>
          <p>Connect with agriculture specialists for professional guidance, pest management strategies, and crop optimization tips.</p>
        </header>

        {isLoadingExperts ? <div className="card loader">Discovering specialists...</div> : null}
        {error ? <div className="card experts-error">{error}</div> : null}

        {!isLoadingExperts && (
          <>
            <ExpertList
              experts={paginatedExperts}
              onSelectExpert={(expert) => void selectExpert(expert)}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {session && selectedExpert && (
          <div className="expert-chat-overlay" onClick={() => { setSession(null); setSelectedExpert(null); }}>
            <div className="expert-chat-modal" onClick={(e) => e.stopPropagation()}>
              <header className="expert-chat-modal-header">
                <div className="expert-chat-modal-title">
                  <div className="expert-avatar-circle" style={{ width: "40px", height: "40px", fontSize: "1rem" }}>
                    {selectedExpert.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{selectedExpert.name}</h3>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>{selectedExpert.specialization}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="expert-chat-modal-close"
                  onClick={() => { setSession(null); setSelectedExpert(null); }}
                >
                  ✕
                </button>
              </header>
              <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <ChatWindow sessionId={session.session_id} title="" senderRole="farmer" />
              </div>
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>

  );
}
