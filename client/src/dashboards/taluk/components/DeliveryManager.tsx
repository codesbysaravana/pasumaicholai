import { ModuleCard } from "../../../components/ui/ModuleCard";

export function DeliveryManager() {
  return (
    <ModuleCard
      title="Manage Delivery Persons"
      description="Assign delivery staff and monitor task completion."
      ctaLabel="Open Delivery Manager"
      to="/dashboard/taluk"
    />
  );
}
