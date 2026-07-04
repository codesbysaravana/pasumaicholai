import { useTranslation } from "react-i18next";

export function Loader() {
  const { t } = useTranslation();
  return <p className="loader">{t("common.loading")}</p>;
}
