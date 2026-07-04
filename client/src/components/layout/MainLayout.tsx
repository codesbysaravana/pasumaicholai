import { AnimatePresence, motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Footer } from "./Footer";
import { FloatingAssistant } from "./FloatingAssistant";
import { Navbar } from "./Navbar";
import { NotificationCenter } from "./NotificationCenter";

export function MainLayout() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <FloatingAssistant />
      <NotificationCenter />
    </div>
  );
}
