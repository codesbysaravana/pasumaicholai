import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { login as loginApi, logout as logoutApi, me, register as registerApi } from "../api/authApi";

export type UserRole = "FARMER" | "ADMIN" | "TALUK_ADMIN" | "EXPERT" | "CONSUMER" | "DELIVERY";

export interface AuthTokenPayload {
  token: string;
  role: UserRole;
  userId: string;
  name: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AuthContextValue {
  auth: AuthTokenPayload | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<UserRole>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AUTH_TOKEN_KEY = "auth_token";

const roleDashboardPathMap: Record<UserRole, string> = {
  FARMER: "/dashboard/farmer",
  ADMIN: "/dashboard/admin",
  TALUK_ADMIN: "/dashboard/taluk",
  EXPERT: "/dashboard/expert",
  CONSUMER: "/dashboard/consumer",
  DELIVERY: "/dashboard/delivery",
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const backendRoleToFrontendRoleMap = {
  farmer: "FARMER",
  admin: "ADMIN",
  taluk_admin: "TALUK_ADMIN",
  expert: "EXPERT",
  consumer: "CONSUMER",
  delivery: "DELIVERY",
} as const;

function mapBackendRoleToFrontend(
  role: "farmer" | "admin" | "taluk_admin" | "expert" | "consumer" | "delivery",
): UserRole {
  return backendRoleToFrontendRoleMap[role];
}

const frontendRoleToBackendRoleMap: Record<UserRole, "farmer" | "admin" | "taluk_admin" | "expert" | "consumer" | "delivery"> =
{
  FARMER: "farmer",
  ADMIN: "admin",
  TALUK_ADMIN: "taluk_admin",
  EXPERT: "expert",
  CONSUMER: "consumer",
  DELIVERY: "delivery",
};

function readStoredAuth(): AuthTokenPayload | null {
  const raw = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthTokenPayload;
  } catch {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [auth, setAuth] = useState<AuthTokenPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setAuth(stored);
    }

    const bootstrapSession = async () => {
      try {
        const profile = await me();
        const payload: AuthTokenPayload = {
          token: stored?.token ?? "cookie-session",
          role: mapBackendRoleToFrontend(profile.role),
          userId: profile.id,
          name: profile.fullName,
        };
        localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(payload));
        setAuth(payload);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuth(null);
      }
    };

    void bootstrapSession();
  }, []);

  const login = async ({ email, password }: LoginInput): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const profile = await loginApi({ email, password });
      const mappedRole = mapBackendRoleToFrontend(profile.role);

      const payload: AuthTokenPayload = {
        token: `cookie-session-${Date.now()}`,
        role: mappedRole,
        userId: profile.id,
        name: profile.fullName,
      };

      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(payload));
      setAuth(payload);
      return mappedRole;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async ({ fullName, email, password, role }: RegisterInput) => {
    setIsLoading(true);
    try {
      const profile = await registerApi({
        fullName,
        email,
        password,
        role: frontendRoleToBackendRoleMap[role],
      });

      const payload: AuthTokenPayload = {
        token: `cookie-session-${Date.now()}`,
        role: mapBackendRoleToFrontend(profile.role),
        userId: profile.id,
        name: profile.fullName,
      };

      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(payload));
      setAuth(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await logoutApi();
    } catch {
      // Logout should always clear local auth state.
    }
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuth(null);
    setIsLoading(false);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      auth,
      isAuthenticated: Boolean(auth?.token),
      isLoading,
      login,
      register,
      logout,
    }),
    [auth, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}

export function getDashboardPathByRole(role: UserRole): string {
  return roleDashboardPathMap[role];
}

export const allRoles: UserRole[] = ["FARMER", "ADMIN", "TALUK_ADMIN", "EXPERT", "CONSUMER", "DELIVERY"];
