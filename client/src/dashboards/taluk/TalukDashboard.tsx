import { motion } from "framer-motion";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { DeliveryManager } from "./components/DeliveryManager";
import { ExpertCoordination } from "./components/ExpertCoordination";
import { FarmersOverview } from "./components/FarmersOverview";
import { GrievanceManager } from "./components/GrievanceManager";

const talukItems = [
  { label: "Overview", href: "/dashboard/taluk" },
  { label: "Grievances", href: "/dashboard/taluk/complaints" },
  { label: "Delivery", href: "/dashboard/taluk" },
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
      stiffness: 100,
      damping: 15,
    },
  },
};

export function TalukDashboard() {
  return (
    <DashboardLayout title="Taluk Overview" items={talukItems}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={containerVariants} className="dashboard-grid">
          <motion.div variants={itemVariants}><GrievanceManager /></motion.div>
          <motion.div variants={itemVariants}><DeliveryManager /></motion.div>
          <motion.div variants={itemVariants}><FarmersOverview /></motion.div>
          <motion.div variants={itemVariants}><ExpertCoordination /></motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
