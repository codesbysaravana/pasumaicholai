import { useAuth } from "../../context/AuthContext";
import { RoleBadge } from "../auth/RoleBadge";

interface TopNavbarProps {
  title: string;
}

export function TopNavbar({ title }: TopNavbarProps) {
  const { auth, logout } = useAuth();

  return (
    <header className="role-topbar">
      <div>
        <h1>{title}</h1>
        <p className="role-meta">
          {auth?.name} · {auth ? <RoleBadge role={auth.role} /> : null}
        </p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={() => void logout()}>
        Logout
      </button>
    </header>
  );
}
