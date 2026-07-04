import { ModuleCard } from "../../../components/ui/ModuleCard";

export function ExpertManager() {
  return (
    <ModuleCard
      title="Manage Experts"
      description="Review available agriculture experts and maintain clean expert records."
      ctaLabel="Open Expert Manager"
      to="/dashboard/admin/experts"
    />
  );
}
