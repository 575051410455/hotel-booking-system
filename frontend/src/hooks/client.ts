import { hc } from "hono/client";
import { useAuthStore } from "@/hooks/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Create a custom fetch that adds auth headers
const authFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const { accessToken, refreshToken, setTokens, logout } = useAuthStore.getState();
  
  const headers = new Headers(init?.headers);
  
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(input, {
    ...init,
    headers,
  });

  // If 401, try to refresh token
  if (response.status === 401 && refreshToken) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setTokens(data.data.accessToken, data.data.refreshToken);
        
        // Retry original request with new token
        headers.set("Authorization", `Bearer ${data.data.accessToken}`);
        response = await fetch(input, {
          ...init,
          headers,
        });
      } else {
        logout();
      }
    } catch {
      logout();
    }
  }

  return response;
};

// API helper functions
export const api = {
  get: async <T>(url: string): Promise<T> => {
    const response = await authFetch(`${API_BASE_URL}${url}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "เกิดข้อผิดพลาด");
    }
    return data;
  },

  post: async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await authFetch(`${API_BASE_URL}${url}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "เกิดข้อผิดพลาด");
    }
    return data;
  },

  put: async <T>(url: string, body?: unknown): Promise<T> => {
    const response = await authFetch(`${API_BASE_URL}${url}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "เกิดข้อผิดพลาด");
    }
    return data;
  },

  delete: async <T>(url: string): Promise<T> => {
    const response = await authFetch(`${API_BASE_URL}${url}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "เกิดข้อผิดพลาด");
    }
    return data;
  },
};

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "เกิดข้อผิดพลาด");
    }
    return data;
  },

  logout: async () => {
    return api.post("/api/auth/logout");
  },

  getMe: async () => {
    return api.get("/api/auth/me");
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    return api.post("/api/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  },
};

// Users API
export const usersApi = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return api.get(`/api/users${query ? `?${query}` : ""}`);
  },

  getUser: async (id: string) => {
    return api.get(`/api/users/${id}`);
  },

  createUser: async (data: {
    email: string;
    password: string;
    fullName: string;
    role?: string;
    department?: string;
    phone?: string;
  }) => {
    return api.post("/api/users", data);
  },

  updateUser: async (id: string, data: {
    email?: string;
    fullName?: string;
    role?: string;
    department?: string;
    phone?: string;
    isActive?: boolean;
  }) => {
    return api.put(`/api/users/${id}`, data);
  },

  deleteUser: async (id: string) => {
    return api.delete(`/api/users/${id}`);
  },

  resetPassword: async (id: string, newPassword: string) => {
    return api.post(`/api/users/${id}/reset-password`, { newPassword });
  },

  toggleActive: async (id: string) => {
    return api.post(`/api/users/${id}/toggle-active`);
  },
};

// Activity Logs API
export const logsApi = {
  getLogs: async (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return api.get(`/api/logs${query ? `?${query}` : ""}`);
  },

  getStats: async () => {
    return api.get("/api/logs/stats");
  },
};