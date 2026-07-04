import { ModuleCard } from "../../../components/ui/ModuleCard";

export function FarmerQueries() {
  return (
    <ModuleCard
      title="Respond to Farmer Queries"
      description="Answer crop and field-level issues from farmers."
      ctaLabel="Open Queries"
      to="/expert/dashboard"
    />
  );
}
