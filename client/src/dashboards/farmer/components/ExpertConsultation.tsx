import { ModuleCard } from "../../../components/ui/ModuleCard";

export function ExpertConsultation() {
  return (
    <ModuleCard
      title="Ask Experts"
      description="Get professional agricultural advice and help."
      ctaLabel="Consult Experts"
      to="/dashboard/farmer/expert-consultation"
    />
  );
}
