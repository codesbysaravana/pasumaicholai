import { ModuleCard } from "../../../components/ui/ModuleCard";

export function BlogModeration() {
  return (
    <ModuleCard
      title="Moderate Blogs"
      description="Moderate posts, reports, and quality flags."
      ctaLabel="Moderate Content"
      to="/community"
    />
  );
}
