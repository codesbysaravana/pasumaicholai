import { Navigate, Outlet } from "react-router-dom";
import { getDashboardPathByRole, useAuth, type UserRole } from "../context/AuthContext";

interface ProtectedRouteProps {
  requiredRole: UserRole;
}

export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { auth, isAuthenticated } = useAuth();

  if (!isAuthenticated || !auth) {
    return <Navigate to="/login" replace />;
  }

  if (auth.role !== requiredRole) {
    return <Navigate to={getDashboardPathByRole(auth.role)} replace />;
  }

  return <Outlet />;
}
