import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function FloatingAssistant() {
  const { t } = useTranslation();

  return (
    <motion.div
      className="floating-assistant"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Link className="floating-assistant-link" to="/ai">
        {t("ai.floatingCta")}
      </Link>
    </motion.div>
  );
}
