import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getSchemes, upvoteScheme } from "../../api/schemeApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { useNotificationStore } from "../../store/notificationStore";
import type { GovernmentScheme } from "../../types/scheme";

export function SchemesPage() {
  const { t } = useTranslation();
  const [schemes, setSchemes] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      const data = await getSchemes();
      if (mounted) {
        setSchemes(data);
        setLoading(false);
      }
    }
    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpvote = async (schemeId: string) => {
    await upvoteScheme(schemeId);
    setSchemes((current) =>
      current.map((scheme) => (scheme.id === schemeId ? { ...scheme, upvotes: scheme.upvotes + 1 } : scheme)),
    );
    pushNotification(t("schemes.notifications.upvoted"), "success");
  };

  if (loading) {
    return <Loader />;
  }

  return (
    <section>
      <h1>{t("schemes.title")}</h1>
      <div className="grid grid-2">
        {schemes.map((scheme) => (
          <Card key={scheme.id} title={scheme.title}>
            <p>{scheme.summary}</p>
            <p>
              {t("schemes.upvotes")}: {scheme.upvotes}
            </p>
            <div className="inline-actions">
              <Link to={`/schemes/${scheme.id}`}>{t("schemes.viewDetails")}</Link>
              <Button variant="secondary" onClick={() => void handleUpvote(scheme.id)}>
                {t("schemes.upvote")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
