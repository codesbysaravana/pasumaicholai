import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createBlog } from "../../api/communityApi";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useNotificationStore } from "../../store/notificationStore";
import { blogSchema } from "../../utils/validation";

interface BlogFormState {
  title: string;
  content: string;
}

export function CreateBlogPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pushNotification = useNotificationStore((state) => state.pushNotification);
  const [form, setForm] = useState<BlogFormState>({ title: "", content: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof BlogFormState, string>>>({});

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = blogSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({
        title: fieldErrors.title?.[0],
        content: fieldErrors.content?.[0],
      });
      return;
    }

    await createBlog(parsed.data);
    pushNotification(t("community.notifications.created"), "success");
    navigate("/community");
  };

  return (
    <Card title={t("community.createTitle")}>
      <form className="stack" onSubmit={onSubmit}>
        <Input
          label={t("community.form.title")}
          name="title"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          error={errors.title}
        />
        <Input
          label={t("community.form.content")}
          name="content"
          value={form.content}
          onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
          error={errors.content}
        />
        <Button type="submit">{t("community.form.publish")}</Button>
      </form>
    </Card>
  );
}
