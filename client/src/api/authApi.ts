import { http } from "./http";
import type { LoginInput, RegisterInput } from "../types/auth";

type BackendRole = "farmer" | "admin" | "taluk_admin" | "expert" | "consumer" | "delivery";

interface BackendAuthUser {
  id: string;
  fullName: string;
  email: string;
  role: BackendRole;
}

export async function login(input: LoginInput): Promise<BackendAuthUser> {
  await http<BackendAuthUser>("/auth/login", {
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
    },
  });

  return me();
}

export async function register(input: RegisterInput): Promise<BackendAuthUser> {
  const role = input.role === "customer" ? "consumer" : input.role;

  return http<BackendAuthUser>("/auth/register", {
    method: "POST",
    body: {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      role,
    },
  });
}

export async function me(): Promise<BackendAuthUser> {
  return http<BackendAuthUser>("/auth/me", {
    method: "GET",
  });
}

export async function logout(): Promise<void> {
  await http<unknown>("/auth/logout", {
    method: "POST",
  });
}
