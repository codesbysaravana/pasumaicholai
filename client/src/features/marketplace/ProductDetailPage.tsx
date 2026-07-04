import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { getProductById } from "../../api/marketApi";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import type { Product } from "../../types/market";

export function ProductDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      if (!id) {
        setLoading(false);
        return;
      }

      const data = await getProductById(id);
      if (mounted) {
        setProduct(data);
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

  if (!product) {
    return (
      <Card title={t("marketplace.notFound")}>
        <Link to="/marketplace">{t("marketplace.backToMarketplace")}</Link>
      </Card>
    );
  }

  return (
    <Card title={product.name}>
      <p>
        {t("marketplace.crop")}: {product.cropType}
      </p>
      <p>
        {t("marketplace.price")}: Rs.{product.pricePerKg}/kg | {t("marketplace.quantity")}: {product.quantityKg} kg
      </p>
      <p>
        {t("marketplace.location")}: {product.location}
      </p>
      <p>{product.description}</p>
      <Link to="/marketplace">{t("marketplace.backToMarketplace")}</Link>
    </Card>
  );
}
