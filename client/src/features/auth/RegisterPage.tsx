import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { registerSchema } from "../../utils/validation";
import type { UserRole } from "../../types/auth";

interface RegisterFormState {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { registerUser, isLoading } = useAuthStore();
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const [form, setForm] = useState<RegisterFormState>({
    fullName: "",
    email: "",
    password: "",
    role: "farmer",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterFormState, string>>>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = registerSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        fullName: fieldErrors.fullName?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        role: fieldErrors.role?.[0],
      });
      return;
    }

    setErrors({});
    await registerUser(parsed.data);
    pushNotification(t("auth.notifications.registerSuccess"), "success");
    navigate("/dashboard");
  };

  return (
    <Card title={t("auth.signup")}>
      <form onSubmit={onSubmit} className="stack">
        <Input
          label={t("auth.fullName")}
          name="fullName"
          value={form.fullName}
          onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          error={errors.fullName}
        />
        <Input
          label={t("auth.email")}
          name="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          error={errors.email}
        />
        <Input
          label={t("auth.password")}
          name="password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          error={errors.password}
        />
        <label className="field">
          <span className="field-label">{t("auth.role")}</span>
          <select
            className="input"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
          >
            <option value="farmer">{t("auth.farmer")}</option>
            <option value="customer">{t("auth.customer")}</option>
          </select>
          {errors.role ? <span className="field-error">{errors.role}</span> : null}
        </label>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("auth.registering") : t("auth.signup")}
        </Button>
      </form>
    </Card>
  );
}
