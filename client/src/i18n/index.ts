import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import all translations statically
import en from "../locales/en/translation.json";
import ta from "../locales/ta/translation.json";
import hi from "../locales/hi/translation.json";
import te from "../locales/te/translation.json";
import kn from "../locales/kn/translation.json";
import ml from "../locales/ml/translation.json";
import bn from "../locales/bn/translation.json";
import mr from "../locales/mr/translation.json";
import gu from "../locales/gu/translation.json";
import pa from "../locales/pa/translation.json";
import or from "../locales/or/translation.json";
import as from "../locales/as/translation.json";
import ur from "../locales/ur/translation.json";

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
  te: { translation: te },
  kn: { translation: kn },
  ml: { translation: ml },
  bn: { translation: bn },
  mr: { translation: mr },
  gu: { translation: gu },
  pa: { translation: pa },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: Object.keys(resources),
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

document.documentElement.lang = "en";

i18n.on("languageChanged", (lng: string) => {
  document.documentElement.lang = lng;
});

export function setLanguage(lng: string): void {
  i18n.changeLanguage(lng);
}

export const getCurrentLanguage = () => i18n.language;
export const translate = (key: string) => i18n.t(key);

export default i18n;
