import { ModuleCard } from "../../../components/ui/ModuleCard";

export function GrievanceForm() {
  return (
    <ModuleCard
      title="Submit Grievance"
      description="Register complaints and service issues quickly."
      ctaLabel="Submit New Grievance"
      to="/dashboard/farmer/complaints"
    />
  );
}
