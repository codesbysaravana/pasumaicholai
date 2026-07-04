import { motion } from "framer-motion";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { useTranslation } from "react-i18next";
import { fadeInUp, staggerContainer } from "../../components/ui/motion";

export function ChatPage() {
  const { t } = useTranslation();

  return (
    <motion.section variants={staggerContainer} initial="hidden" animate="visible">
      <motion.div variants={fadeInUp}>
        <Card title={t("chat.title")} className="chat-card">
          <p>{t("chat.subtitle")}</p>
          <div className="chat-window">
            <div className="chat-bubble ai-bubble">{t("chat.expertConnected")}</div>
            <div className="chat-bubble user-bubble">{t("chat.placeholder")}</div>
          </div>
          <div className="chat-actions">
            <Input label={t("chat.messageLabel")} name="chatMessage" placeholder={t("chat.placeholder")} />
            <div className="inline-actions">
              <Button variant="secondary">{t("chat.voice")}</Button>
              <Button>{t("chat.send")}</Button>
            </div>
          </div>
          <p className="muted">{t("chat.note")}</p>
        </Card>
      </motion.div>
    </motion.section>
  );
}
