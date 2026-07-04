import { motion } from "framer-motion";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { adminNavItems } from "./adminNav";
import { BlogModeration } from "./components/BlogModeration";
import { ExpertManager } from "./components/ExpertManager";
import { PlatformAnalytics } from "./components/PlatformAnalytics";
import { SchemesManager } from "./components/SchemesManager";
import { TalukAdminManager } from "./components/TalukAdminManager";

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

export function AdminDashboard() {
  return (
    <DashboardLayout title="Admin Overview" items={adminNavItems}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={containerVariants} className="dashboard-grid">
          <motion.div variants={itemVariants}><PlatformAnalytics /></motion.div>
          <motion.div variants={itemVariants}><TalukAdminManager /></motion.div>
          <motion.div variants={itemVariants}><ExpertManager /></motion.div>
          <motion.div variants={itemVariants}><BlogModeration /></motion.div>
          <motion.div variants={itemVariants}><SchemesManager /></motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
