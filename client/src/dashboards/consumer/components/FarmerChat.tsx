import { ModuleCard } from "../../../components/ui/ModuleCard";

export function FarmerChat() {
  return (
    <ModuleCard
      title="Chat With Farmers"
      description="Discuss crop quality and delivery timelines directly."
      ctaLabel="Start Chat"
      to="/chat"
    />
  );
}
