import { motion } from "framer-motion";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { ConsultationRequests } from "./components/ConsultationRequests";
import { ExpertProfile } from "./components/ExpertProfile";
import { FarmerQueries } from "./components/FarmerQueries";
import { UpvotesPanel } from "./components/UpvotesPanel";

const expertItems = [
  { label: "Overview", href: "/dashboard/expert" },
  { label: "Consultation Request", href: "/expert/dashboard" },
  { label: "Profile", href: "/dashboard/expert" },
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

export function ExpertDashboard() {
  return (
    <DashboardLayout title="Expert Overview" items={expertItems}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={containerVariants} className="dashboard-grid">
          <motion.div variants={itemVariants}><ConsultationRequests /></motion.div>
          <motion.div variants={itemVariants}><FarmerQueries /></motion.div>
          <motion.div variants={itemVariants}><ExpertProfile /></motion.div>
          <motion.div variants={itemVariants}><UpvotesPanel /></motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
