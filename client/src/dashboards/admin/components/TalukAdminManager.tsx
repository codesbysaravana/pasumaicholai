import { ModuleCard } from "../../../components/ui/ModuleCard";

export function TalukAdminManager() {
  return (
    <ModuleCard
      title="Create Taluk Admins"
      description="Assign and manage taluk-level administrators."
      ctaLabel="Manage Taluk Admins"
      to="/dashboard/admin/taluk-admins"
    />
  );
}
