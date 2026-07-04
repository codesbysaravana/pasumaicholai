import { ModuleCard } from "../../../components/ui/ModuleCard";

export function GrievanceManager() {
  return (
    <ModuleCard
      title="Manage Grievances"
      description="Review and resolve grievances from assigned regions."
      ctaLabel="Review Grievances"
      to="/dashboard/taluk/complaints"
    />
  );
}
