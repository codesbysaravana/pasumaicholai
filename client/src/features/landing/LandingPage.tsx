import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { fadeInUp, staggerContainer } from "../../components/ui/motion";

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <motion.section className="landing-page" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div className="hero" variants={fadeInUp}>
        <span className="hero-badge">{t("landing.badge")}</span>
        <h1>{t("landing.heroTitle")}</h1>
        <p>{t("landing.headline")}</p>
        <div className="hero-actions">
          <Link to="/register" className="cta-link cta-primary">
            {t("landing.primaryCta")}
          </Link>
          <Link to="/marketplace" className="cta-link cta-secondary">
            {t("landing.secondaryCta")}
          </Link>
        </div>
      </motion.div>

      <motion.div className="hero-stats grid grid-3" variants={staggerContainer}>
        <Card title={t("landing.stats.farmers.title")}>
          <p className="kpi">{t("landing.stats.farmers.value")}</p>
        </Card>
        <Card title={t("landing.stats.experts.title")}>
          <p className="kpi">{t("landing.stats.experts.value")}</p>
        </Card>
        <Card title={t("landing.stats.buyers.title")}>
          <p className="kpi">{t("landing.stats.buyers.value")}</p>
        </Card>
      </motion.div>

      <motion.div className="grid grid-3" variants={staggerContainer}>
        <Card title={t("landing.cards.marketplace.title")}>
          <p>{t("landing.cards.marketplace.body")}</p>
          <Link to="/marketplace">{t("landing.cards.marketplace.cta")}</Link>
        </Card>
        <Card title={t("landing.cards.community.title")}>
          <p>{t("landing.cards.community.body")}</p>
          <Link to="/community">{t("landing.cards.community.cta")}</Link>
        </Card>
        <Card title={t("landing.cards.support.title")}>
          <p>{t("landing.cards.support.body")}</p>
          <Link to="/ai">{t("landing.cards.support.cta")}</Link>
        </Card>
      </motion.div>
    </motion.section>
  );
}
