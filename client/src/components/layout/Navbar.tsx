import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { Button } from "../ui/Button";
import { LanguageSwitcher } from "../ui/LanguageSwitcher";

export function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, role, logoutUser } = useAuthStore();
  const navItems = [
    { to: "/marketplace", label: t("nav.marketplace") },
    { to: "/community", label: t("nav.community") },
    { to: "/schemes", label: t("nav.schemes") },
    { to: "/grievances", label: t("nav.grievances") },
    { to: "/chat", label: t("nav.expertChat") },
    { to: "/ai", label: t("nav.aiAssistant") },
  ];

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        {t("brand.title")}
      </Link>
      <nav className="nav-links">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-link">
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="nav-actions">
        <LanguageSwitcher />
        {isAuthenticated ? (
          <>
            <span className="role-pill">{role ? t(`auth.${role}`) : "-"}</span>
            <Button variant="secondary" onClick={() => void logoutUser()}>
              {t("common.logout")}
            </Button>
          </>
        ) : (
          <>
            <NavLink to="/login" className="nav-link">
              {t("nav.login")}
            </NavLink>
            <NavLink to="/register" className="nav-link">
              {t("nav.register")}
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
}
