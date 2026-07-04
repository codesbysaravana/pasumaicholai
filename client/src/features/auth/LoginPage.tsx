import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Loader } from "../../components/ui/Loader";
import { useAuthStore } from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import { loginSchema } from "../../utils/validation";

interface LoginFormState {
  email: string;
  password: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginUser, isLoading } = useAuthStore();
  const pushNotification = useNotificationStore((state) => state.pushNotification);

  const [form, setForm] = useState<LoginFormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormState, string>>>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      });
      return;
    }

    setErrors({});
    await loginUser(parsed.data);
    pushNotification(t("auth.notifications.loginSuccess"), "success");
    navigate("/dashboard");
  };

  return (
    <Card title={t("auth.login")}>
      <form onSubmit={onSubmit} className="stack">
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("auth.loggingIn") : t("auth.login")}
        </Button>
        {isLoading ? <Loader /> : null}
      </form>
    </Card>
  );
}
