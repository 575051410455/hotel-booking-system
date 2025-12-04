import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "admin" | "manager" | "staff" | "user" | "sales" | "salescoordinator" | "frontoffice" | "housekeeping";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  department: string | null;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
        }),
      updateUser: (user) =>
        set({
          user,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);

// Role helpers
export const ROLE_LABELS: Record<Role, string> = {
  admin: "ผู้ดูแลระบบ",
  manager: "ผู้จัดการ",
  staff: "พนักงาน",
  user: "ผู้ใช้งาน",
  sales: "ฝ่ายขาย",
  salescoordinator: "Sales Coordinator",
  frontoffice: "Front Office",
  housekeeping: "Housekeeping",
};

export const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-purple-100 text-purple-800",
  manager: "bg-indigo-100 text-indigo-800",
  staff: "bg-teal-100 text-teal-800",
  user: "bg-gray-100 text-gray-800",
  sales: "bg-blue-100 text-blue-800",
  salescoordinator: "bg-orange-100 text-orange-800",
  frontoffice: "bg-green-100 text-green-800",
  housekeeping: "bg-yellow-100 text-yellow-800",
};