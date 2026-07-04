import { motion } from "framer-motion";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { CropMarketplace } from "./components/CropMarketplace";
import { ExpertConsultation } from "./components/ExpertConsultation";
import { GrievanceForm } from "./components/GrievanceForm";
import { OrdersTracker } from "./components/OrdersTracker";
import { PaymentNotifications } from "./components/PaymentNotifications";

const farmerItems = [
  { label: "Overview", href: "/dashboard/farmer" },
  { label: "Marketplace", href: "/dashboard/farmer/marketplace" },
  { label: "Recommended Prices", href: "/dashboard/farmer/recommended-prices" },
  { label: "Uzhavar Aalosanai", href: "/dashboard/farmer" },
  { label: "Uzhavar Thunai", href: "/dashboard/farmer/chatbot" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

export function FarmerDashboard() {
  return (
    <DashboardLayout title="Farmer Overview" items={farmerItems}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <PaymentNotifications />

        <motion.div variants={containerVariants} className="dashboard-grid">
          <motion.div variants={itemVariants}><CropMarketplace /></motion.div>
          <motion.div variants={itemVariants}><OrdersTracker /></motion.div>
          <motion.div variants={itemVariants}><ExpertConsultation /></motion.div>
          <motion.div variants={itemVariants}><GrievanceForm /></motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
