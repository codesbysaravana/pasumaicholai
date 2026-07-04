import { ModuleCard } from "../../../components/ui/ModuleCard";

export function SchemesManager() {
  return (
    <ModuleCard
      title="Manage Schemes"
      description="Create and maintain government scheme visibility."
      ctaLabel="Open Schemes"
      to="/schemes"
    />
  );
}
