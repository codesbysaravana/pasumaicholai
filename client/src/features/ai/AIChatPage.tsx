import { motion } from "framer-motion";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useTranslation } from "react-i18next";
import { fadeInUp, staggerContainer } from "../../components/ui/motion";

export function AIChatPage() {
  const { t } = useTranslation();

  return (
    <motion.section variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeInUp}>
        <Card title={t("ai.title")} className="chat-card">
          <p>{t("ai.subtitle")}</p>
          <div className="chat-window">
            <div className="chat-bubble ai-bubble">{t("ai.samplePrompt")}</div>
            <div className="chat-bubble user-bubble">{t("ai.sampleAnswer")}</div>
          </div>
          <div className="chat-actions">
            <Input label={t("ai.inputLabel")} name="aiPrompt" placeholder={t("ai.placeholder")} />
            <div className="inline-actions">
              <Button variant="secondary">{t("ai.voice")}</Button>
              <Button>{t("ai.send")}</Button>
            </div>
          </div>
          <p className="muted">{t("ai.note")}</p>
        </Card>
      </motion.div>
    </motion.section>
  );
}
