import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { createGrievance } from "../../api/grievanceApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useNotificationStore } from "../../store/notificationStore";
import { grievanceSchema } from "../../utils/validation";

interface GrievanceFormState {
  title: string;
  description: string;
  category: string;
}

export function SubmitGrievancePage() {
  const { t } = useTranslation();
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const [form, setForm] = useState<GrievanceFormState>({ title: "", description: "", category: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof GrievanceFormState, string>>>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = grievanceSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
        category: fieldErrors.category?.[0],
      });
      return;
    }

    setErrors({});
    await createGrievance(parsed.data);
    pushNotification(t("grievance.notifications.submitted"), "success");
    setForm({ title: "", description: "", category: "" });
  };

  return (
    <Card title={t("grievance.submitTitle")}>
      <form className="stack" onSubmit={onSubmit}>
        <Input
          label={t("grievance.form.title")}
          name="title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          error={errors.title}
        />
        <Input
          label={t("grievance.form.category")}
          name="category"
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          error={errors.category}
        />
        <Input
          label={t("grievance.form.description")}
          name="description"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          error={errors.description}
        />
        <Button type="submit">{t("grievance.form.submit")}</Button>
      </form>
    </Card>
  );
}
