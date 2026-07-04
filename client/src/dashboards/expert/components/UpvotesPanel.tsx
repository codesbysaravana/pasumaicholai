import { ModuleCard } from "../../../components/ui/ModuleCard";

export function UpvotesPanel() {
  return (
    <ModuleCard
      title="Receive Upvotes"
      description="Track community trust and top-rated guidance posts."
      ctaLabel="View Upvotes"
      to="/community"
    />
  );
}
