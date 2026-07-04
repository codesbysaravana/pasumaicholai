import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { useAuthStore } from "../../store/authStore";
import { fadeInUp, staggerContainer } from "../../components/ui/motion";

export function DashboardPage() {
  const { t } = useTranslation();
  const { isAuthenticated, role, userId } = useAuthStore();

  if (!isAuthenticated) {
    return (
      <Card title={t("dashboard.accessTitle")}>
        <p>{t("dashboard.accessBody")}</p>
        <Link to="/login">{t("dashboard.goLogin")}</Link>
      </Card>
    );
  }

  return (
    <motion.section className="dashboard-page" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div className="dashboard-header" variants={fadeInUp}>
        <h1>{t("dashboard.title")}</h1>
        <p>
          {t("dashboard.loggedInAs")} <strong>{role ? t(`auth.${role}`) : "-"}</strong> ({userId})
        </p>
      </motion.div>

      <motion.div className="grid grid-2" variants={staggerContainer}>
        <Card title={t("dashboard.widgets.cropInsights")}>
          <p>{t("dashboard.widgets.cropInsightsBody")}</p>
          <p className="kpi">+12.8%</p>
        </Card>
        <Card title={t("dashboard.widgets.weatherUpdates")}>
          <p>{t("dashboard.widgets.weatherBody")}</p>
          <p className="kpi">31 C</p>
        </Card>
        <Card title={t("dashboard.widgets.marketPrices")}>
          <p>{t("dashboard.widgets.marketBody")}</p>
          <p className="kpi">Rs. 42/kg</p>
        </Card>
        <Card title={t("dashboard.widgets.notifications")}>
          <p>{t("dashboard.widgets.notificationsBody")}</p>
          <p className="kpi">3</p>
        </Card>
      </motion.div>

      <motion.div className="grid grid-2" variants={staggerContainer}>
        <Card title={t("dashboard.marketCardTitle")}>
          <p>{t("dashboard.marketCardBody")}</p>
          <Link className="inline-link" to="/marketplace">
            {t("dashboard.marketCardCta")}
          </Link>
        </Card>
        <Card title={t("dashboard.communityCardTitle")}>
          <p>{t("dashboard.communityCardBody")}</p>
          <Link className="inline-link" to="/community">
            {t("dashboard.communityCardCta")}
          </Link>
        </Card>
      </motion.div>
    </motion.section>
  );
}
