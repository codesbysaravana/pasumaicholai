import { ModuleCard } from "../../../components/ui/ModuleCard";

export function PlatformAnalytics() {
  return (
    <ModuleCard
      title="Analytics Overview"
      description="Track users, order trends, and engagement metrics."
      ctaLabel="View Analytics"
      to="/dashboard/admin/crop-prices"
    />
  );
}
