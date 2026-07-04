import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { setLanguage } from "../../i18n";

const languages = [
  { code: "en", label: "English" },
  { code: "ta", label: "தமிழ்" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "ml", label: "മലയാളം" },
  { code: "mr", label: "मराठी" },
  { code: "gu", label: "ગુજરાતી" },
  { code: "bn", label: "বাংলা" },
  { code: "pa", label: "ਪੰਜਾਬੀ" },
  { code: "or", label: "ଓଡ଼ିଆ" },
  { code: "as", label: "অসমীয়া" },
  { code: "ur", label: "اردو" },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="language-selector-container notranslate" translate="no">
      <Globe size={18} className="lang-icon" />
      <select
        className="lang-select"
        value={i18n.language}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Language"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
