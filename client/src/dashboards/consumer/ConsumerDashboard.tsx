import { motion } from "framer-motion";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { BlogsFeed } from "./components/BlogsFeed";
import { FarmerChat } from "./components/FarmerChat";
import { FollowFarmers } from "./components/FollowFarmers";
import { Marketplace } from "./components/Marketplace";

const consumerItems = [
  { label: "Overview", href: "/dashboard/consumer" },
  { label: "Marketplace", href: "/dashboard/consumer/marketplace" },
  { label: "Follows", href: "/community" },
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

export function ConsumerDashboard() {
  return (
    <DashboardLayout title="Consumer Overview" items={consumerItems}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={containerVariants} className="dashboard-grid">
          <motion.div variants={itemVariants}><Marketplace /></motion.div>
          <motion.div variants={itemVariants}><FarmerChat /></motion.div>
          <motion.div variants={itemVariants}><BlogsFeed /></motion.div>
          <motion.div variants={itemVariants}><FollowFarmers /></motion.div>
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
