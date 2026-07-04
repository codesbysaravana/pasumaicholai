import { motion, AnimatePresence } from "framer-motion";
import type { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { SidebarNav, type SidebarItem } from "./SidebarNav";
import { TopNavbar } from "./TopNavbar";
import { FarmerChatbotWidget } from "../../features/farmer/chatbot/components/FarmerChatbotWidget";
import { useAuth } from "../../context/AuthContext";

interface DashboardLayoutProps {
  title: string;
  items: SidebarItem[];
}

export function DashboardLayout({ title, items, children }: PropsWithChildren<DashboardLayoutProps>) {
  const location = useLocation();
  const { auth } = useAuth();

  return (
    <div className="role-shell">
      <SidebarNav items={items} />
      <section className="role-main">
        <TopNavbar title={title} />
        <div className="role-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      {auth?.role === "FARMER" && <FarmerChatbotWidget />}
    </div>
  );
}
