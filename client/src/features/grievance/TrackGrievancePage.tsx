import { Card } from "../../components/ui/Card";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { getMyGrievances } from "../../api/grievanceApi";
import type { Grievance } from "../../types/grievance";

export function TrackGrievancePage() {
  const { t } = useTranslation();
  const [grievances, setGrievances] = useState<Grievance[]>([]);

  useEffect(() => {
    void getMyGrievances().then(setGrievances).catch(() => setGrievances([]));
  }, []);

  const grievanceTimeline = [
    { step: t("grievance.timeline.submitted"), status: t("grievance.status.completed") },
    { step: t("grievance.timeline.assigned"), status: t("grievance.status.completed") },
    { step: t("grievance.timeline.review"), status: t("grievance.status.active") },
    { step: t("grievance.timeline.resolution"), status: t("grievance.status.pending") },
  ];

  return (
    <Card title={t("grievance.trackTitle")}>
      {grievances[0] ? <p>{t("grievance.trackingId")}: {grievances[0].id}</p> : <p>{t("grievance.trackingId")}: -</p>}
      {grievanceTimeline.map((item) => (
        <p key={item.step}>
          {item.step}: <strong>{item.status}</strong>
        </p>
      ))}
    </Card>
  );
}
