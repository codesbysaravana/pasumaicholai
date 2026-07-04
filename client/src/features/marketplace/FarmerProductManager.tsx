import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useMarketStore } from "../../store/marketStore";
import { useNotificationStore } from "../../store/notificationStore";
import { productSchema } from "../../utils/validation";

interface ProductFormState {
  name: string;
  cropType: string;
  pricePerKg: string;
  quantityKg: string;
  location: string;
  description: string;
}

const initialState: ProductFormState = {
  name: "",
  cropType: "",
  pricePerKg: "",
  quantityKg: "",
  location: "",
  description: "",
};

export function FarmerProductManager() {
  const { t } = useTranslation();
  const [form, setForm] = useState<ProductFormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormState, string>>>({});
  const { auth } = useAuth();
  const { products, addProduct } = useMarketStore();
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const myProducts = products.filter((product) => product.sellerId === auth?.userId);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = productSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        name: fieldErrors.name?.[0],
        cropType: fieldErrors.cropType?.[0],
        pricePerKg: fieldErrors.pricePerKg?.[0],
        quantityKg: fieldErrors.quantityKg?.[0],
        location: fieldErrors.location?.[0],
        description: fieldErrors.description?.[0],
      });
      return;
    }

    if (!auth?.userId) {
      pushNotification(t("marketplace.notifications.loginFarmer"), "error");
      return;
    }

    await addProduct(parsed.data);
    pushNotification(t("marketplace.notifications.created"), "success");
    setForm(initialState);
    setErrors({});
  };

  return (
    <section className="stack">
      <Card title={t("marketplace.addListingTitle")}>
        <form className="stack" onSubmit={onSubmit}>
          <Input
            label={t("marketplace.form.productName")}
            name="name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            error={errors.name}
          />
          <Input
            label={t("marketplace.form.cropType")}
            name="cropType"
            value={form.cropType}
            onChange={(event) => setForm((prev) => ({ ...prev, cropType: event.target.value }))}
            error={errors.cropType}
          />
          <Input
            label={t("marketplace.form.pricePerKg")}
            name="pricePerKg"
            type="number"
            value={form.pricePerKg}
            onChange={(event) => setForm((prev) => ({ ...prev, pricePerKg: event.target.value }))}
            error={errors.pricePerKg}
          />
          <Input
            label={t("marketplace.form.quantity")}
            name="quantityKg"
            type="number"
            value={form.quantityKg}
            onChange={(event) => setForm((prev) => ({ ...prev, quantityKg: event.target.value }))}
            error={errors.quantityKg}
          />
          <Input
            label={t("marketplace.form.location")}
            name="location"
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
            error={errors.location}
          />
          <Input
            label={t("marketplace.form.description")}
            name="description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            error={errors.description}
          />
          <Button type="submit">{t("marketplace.form.create")}</Button>
        </form>
      </Card>

      <Card title={t("marketplace.myListings")}>
        {myProducts.length === 0 ? <p>{t("marketplace.noListings")}</p> : null}
        {myProducts.map((product) => (
          <p key={product.id}>
            {product.name} - {product.quantityKg} kg
          </p>
        ))}
      </Card>
    </section>
  );
}
