import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { getSchemeById } from "../../api/schemeApi";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import type { GovernmentScheme } from "../../types/scheme";

export function SchemeDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [scheme, setScheme] = useState<GovernmentScheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!id) {
        setLoading(false);
        return;
      }

      const data = await getSchemeById(id);
      if (mounted) {
        setScheme(data);
        setLoading(false);
      }
    }
    void loadData();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <Loader />;
  }

  if (!scheme) {
    return (
      <Card title={t("schemes.notFound")}>
        <Link to="/schemes">{t("schemes.backToSchemes")}</Link>
      </Card>
    );
  }

  return (
    <Card title={scheme.title}>
      <p>{scheme.summary}</p>
      <p>
        {t("schemes.eligibility")}: {scheme.eligibility}
      </p>
      <p>
        {t("schemes.communityUpvotes")}: {scheme.upvotes}
      </p>
      <Link to="/schemes">{t("schemes.backToSchemes")}</Link>
    </Card>
  );
}
