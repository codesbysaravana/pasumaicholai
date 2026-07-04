import { ModuleCard } from "../../../components/ui/ModuleCard";

export function FarmersOverview() {
  return (
    <ModuleCard
      title="Monitor Farmers"
      description="Track onboarding, activity, and support requirements."
      ctaLabel="View Farmers"
      to="/community"
    />
  );
}
