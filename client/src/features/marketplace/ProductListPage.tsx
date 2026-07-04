import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Loader } from "../../components/ui/Loader";
import { useAuth } from "../../context/AuthContext";
import { useMarketStore } from "../../store/marketStore";
import { FarmerProductManager } from "./FarmerProductManager";
import { fadeInUp, staggerContainer } from "../../components/ui/motion";

export function ProductListPage() {
  const { t } = useTranslation();
  const { products, isLoading, loadProducts } = useMarketStore();
  const { auth } = useAuth();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "quantity">("price");

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const visible = products.filter((product) => {
      if (!normalizedQuery) {
        return true;
      }

      return (
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.cropType.toLowerCase().includes(normalizedQuery) ||
        product.location.toLowerCase().includes(normalizedQuery)
      );
    });

    return [...visible].sort((a, b) => (sortBy === "price" ? a.pricePerKg - b.pricePerKg : b.quantityKg - a.quantityKg));
  }, [products, query, sortBy]);

  return (
    <motion.section className="marketplace-page" variants={staggerContainer} initial="hidden" animate="visible">
      <motion.h1 variants={fadeInUp}>{t("marketplace.title")}</motion.h1>
      <motion.p className="section-lead" variants={fadeInUp}>
        {t("marketplace.subtitle")}
      </motion.p>
      <motion.div className="market-controls" variants={fadeInUp}>
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("marketplace.searchPlaceholder")}
        />
        <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value as "price" | "quantity")}>
          <option value="price">{t("marketplace.sort.price")}</option>
          <option value="quantity">{t("marketplace.sort.quantity")}</option>
        </select>
      </motion.div>

      {auth?.role === "FARMER" ? <FarmerProductManager /> : null}

      {isLoading ? <Loader /> : null}
      {!isLoading && filteredProducts.length === 0 ? <p className="muted">{t("marketplace.noResults")}</p> : null}
      <motion.div className="grid grid-2" variants={staggerContainer}>
        {filteredProducts.map((product) => (
          <Card key={product.id} title={product.name}>
            <p className="muted">{product.cropType}</p>
            <p>
              Rs.{product.pricePerKg}/kg - {product.quantityKg} kg
            </p>
            <p>{product.location}</p>
            <Link className="inline-link" to={`/product/${product.id}`}>
              {t("marketplace.viewDetails")}
            </Link>
          </Card>
        ))}
      </motion.div>
    </motion.section>
  );
}
