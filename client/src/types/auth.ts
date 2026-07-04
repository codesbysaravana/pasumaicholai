export type UserRole = "farmer" | "admin" | "taluk_admin" | "expert" | "consumer" | "delivery" | "customer";

export interface AuthUser {
  userId: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  fullName: string;
  role: UserRole;
}
