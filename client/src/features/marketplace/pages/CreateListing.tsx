import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import { CropListingForm } from "../components/CropListingForm";

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Consultation", href: "/dashboard/farmer/expert-consultation" },
  { label: "Chatbot", href: "/dashboard/farmer/chatbot" },
];

export function CreateListingPage() {
  return (
    <DashboardLayout title="Create Crop Listing" items={farmerItems}>
      <CropListingForm />
    </DashboardLayout>
  );
}
