import { create } from "zustand";
import { login, logout, register } from "../api/authApi";
import type { LoginInput, RegisterInput, UserRole } from "../types/auth";

interface AuthState {
  userId: string | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (payload: LoginInput) => Promise<void>;
  registerUser: (payload: RegisterInput) => Promise<void>;
  logoutUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  loginUser: async (payload) => {
    set({ isLoading: true });
    try {
      const user = await login(payload);
      set({
        userId: user.id,
        role: user.role,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  registerUser: async (payload) => {
    set({ isLoading: true });
    try {
      const user = await register(payload);
      set({
        userId: user.id,
        role: user.role,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },
  logoutUser: async () => {
    set({ isLoading: true });
    try {
      await logout();
      set({
        userId: null,
        role: null,
        isAuthenticated: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
