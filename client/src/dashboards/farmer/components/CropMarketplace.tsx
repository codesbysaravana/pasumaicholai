import { ModuleCard } from "../../../components/ui/ModuleCard";

export function CropMarketplace() {
  return (
    <ModuleCard
      title="Sell Crops"
      description="Create and manage crop listings for buyers."
      ctaLabel="Open Marketplace"
      to="/dashboard/farmer/marketplace"
    />
  );
}
