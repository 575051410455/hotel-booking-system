import { hc } from "hono/client";
import { type ApiRoutes } from "@backend/app"; // Import Type จาก Backend โดยตรง
import { 
  queryOptions, 
  useMutation, 
  useQueryClient 
} from "@tanstack/react-query";
import type {
  CreateUserInput,
} from '@backend/types'


// 1. Setup Client
// ข้อควรระวัง: ใส่ URL backend ให้ถูกต้อง (เช่น http://localhost:3000 หรือ /)
const client = hc<ApiRoutes>("/");

export const api = client.api;


export interface AuthResponse {
  user: CreateUserInput;
  token: string;
}

// Helper function to handle RPC responses
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

// ============================================
// Auth API
// ============================================

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.auth.login.$post({
    json: { email, password },
  });
  console.log("show email user:", email)
  return handleResponse<AuthResponse>(res);
}

export async function register(
  email: string,
  password: string,
  username: string,
  lastname: string,
): Promise<AuthResponse> {
  const res = await api.auth.register.$post({
    json: { email, password, username, lastname },
  });
  return handleResponse<AuthResponse>(res);
}

// ============================================
// User API with Query Options
// ============================================

export const getMeQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await api.users.me.$get(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ user: CreateUserInput }>(res);
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const getAllUsersQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await api.users.$get(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ users: CreateUserInput[] }>(res);
    },
    enabled: !!token,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

// Legacy functions for backward compatibility
export async function getMe(token: string): Promise<{ user: CreateUserInput }> {
  const res = await api.users.me.$get(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: CreateUserInput }>(res);
}

export async function getAllUsers(token: string): Promise<{ users: CreateUserInput[] }> {
  const res = await api.users.$get(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ users: CreateUserInput[] }>(res);
}

// ============================================
// User Mutation Hooks
// ============================================

export function useCreateUser(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; username: string; lastname: string; role: "user" | "admin" }) => {
      const res = await api.users.$post({
        json: data,
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ user: CreateUserInput }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      data
    }: {
      userId: string;
      data: { email?: string; password?: string; username?: string; lastname?: string; role?: "user" | "admin" }
    }) => {
      const res = await api.users[":id"].$patch({
        param: { id: userId },
        json: data,
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ user: CreateUserInput }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useDeleteUser(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.users[":id"].$delete({
        param: { id: userId },
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ message: string }>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Legacy functions for backward compatibility
export async function createUser(
  token: string,
  data: { email: string; password: string; username: string; lastname: string; role: "user" | "admin" }
): Promise<{ user: CreateUserInput }> {
  const res = await api.users.$post({
    json: data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: CreateUserInput }>(res);
}

export async function updateUser(
  token: string,
  userId: string,
  data: { email?: string; password?: string; username?: string; lastname?: string; role?: "user" | "admin" }
): Promise<{ user: CreateUserInput }> {
  const res = await api.users[":id"].$patch({
    param: { id: userId },
    json: data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: CreateUserInput }>(res);
}

export async function deleteUser(token: string, userId: string): Promise<{ message: string }> {
  const res = await api.users[":id"].$delete({
    param: { id: userId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ message: string }>(res);
}

// Export the client for direct use if needed
export { client }



// ============================================



// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Get auth token from store or localStorage
const getAuthToken = (): string | null => {
  // Try to get from localStorage first (or your auth store)
  return localStorage.getItem('accessToken');
};

// ============ Types ============

export interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  company: string;
  saleOwner: string;
  saleOwnerId?: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  numberOfRooms: number;
  rate: string | number;
  paymentMethod: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VOID';
  createdAt: string;
  holdExpiry?: string;
  documents?: string[];
  cancelReason?: string;
  cancelDocuments?: string[];
  cancelledAt?: string;
  cancelledBy?: string;
  lastAmendedAt?: string;
  lastAmendedBy?: string;
  amendmentLogs?: {
    timestamp: string;
    amendedBy: string;
    changes: {
      field: string;
      before: any;
      after: any;
    }[];
  }[];
  notes?: string;
}

export interface RoomType {
  id: string;
  name: string;
  totalRooms: number;
  baseRate: string;
  description?: string;
  amenities?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Sales User จากตาราง users (role: sales, salescoordinator)
export interface SalesUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'sales' | 'salescoordinator';
  department?: string;
  isActive: boolean;
}

// Legacy SalesOwner type (for backward compatibility)
export interface SalesOwner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  creditTerms?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlackoutDate {
  id: string;
  date: string;
  reason?: string;
  createdAt?: string;
}

export interface MinimumStayRule {
  id: string;
  startDate: string;
  endDate: string;
  minNights: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationInfo;
}

export interface CreateBookingPayload {
  customerName: string;
  company: string;
  saleOwner: string;
  saleOwnerId?: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  numberOfRooms: number;
  rate: number;
  paymentMethod: string;
  documents?: string[];
  notes?: string;
}

export interface UpdateBookingPayload {
  customerName?: string;
  company?: string;
  saleOwner?: string;
  saleOwnerId?: string;
  phone?: string;
  email?: string;
  checkIn?: string;
  checkOut?: string;
  roomType?: string;
  numberOfRooms?: number;
  rate?: number;
  paymentMethod?: string;
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'VOID';
  notes?: string;
}

export interface CancelBookingPayload {
  reason: string;
  cancelledBy: string;
  cancelDocuments?: string[];
}

export interface ListBookingsParams {
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "VOID";
  checkInFrom?: string;
  checkInTo?: string;
  checkIn?: string;
  checkOut?: string;
  search?: string;
  company?: string;
  roomType?: string;
  saleOwner?: string;
  page?: number;
  limit?: number;
}

export interface CheckAvailabilityPayload {
  checkIn: string;
  checkOut: string;
  roomType: string;
}

// ============ API Helper ============

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = getAuthToken();
  if (token) {
    (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP error ${response.status}`,
      };
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
}

// ============ Bookings API ============

export const bookingsApi = {
  list: (params: ListBookingsParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const query = searchParams.toString();
    return apiRequest<Booking[]>(query ? `/bookings?${query}` : "/bookings");
  },

  get: async (bookingId: string): Promise<ApiResponse<Booking>> => {
    return apiRequest<Booking>(`/bookings/${bookingId}`);
  },

  create: async (payload: CreateBookingPayload): Promise<ApiResponse<Booking>> => {
    return apiRequest<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (bookingId: string, payload: UpdateBookingPayload): Promise<ApiResponse<Booking>> => {
    return apiRequest<Booking>(`/bookings/${bookingId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete: async (bookingId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/bookings/${bookingId}`, {
      method: 'DELETE',
    });
  },

  confirm: async (bookingId: string): Promise<ApiResponse<Booking>> => {
    return apiRequest<Booking>(`/bookings/${bookingId}/confirm`, {
      method: 'POST',
    });
  },

  cancel: async (bookingId: string, payload: CancelBookingPayload): Promise<ApiResponse<Booking>> => {
    return apiRequest<Booking>(`/bookings/${bookingId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  checkAvailability: async (payload: CheckAvailabilityPayload): Promise<ApiResponse<{ available: number }>> => {
    return apiRequest<{ available: number }>('/bookings/check-availability', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ============ Room Types API ============

export const roomTypesApi = {
  list: async (): Promise<ApiResponse<RoomType[]>> => {
    return apiRequest<RoomType[]>('/room-types');
  },

  get: async (id: string): Promise<ApiResponse<RoomType>> => {
    return apiRequest<RoomType>(`/room-types/${id}`);
  },

  create: async (payload: Omit<RoomType, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<RoomType>> => {
    return apiRequest<RoomType>('/room-types', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: Partial<RoomType>): Promise<ApiResponse<RoomType>> => {
    return apiRequest<RoomType>(`/room-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/room-types/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ Sales Users API (NEW - จากตาราง users) ============
// ดึง users ที่มี role เป็น sales หรือ salescoordinator

export const salesUsersApi = {
  // ดึงรายชื่อ Sales ทั้งหมด (active only)
  list: async (): Promise<ApiResponse<SalesUser[]>> => {
    return apiRequest<SalesUser[]>('/sales-users');
  },

  // ดึงข้อมูล Sales คนเดียว
  get: async (id: string): Promise<ApiResponse<SalesUser>> => {
    return apiRequest<SalesUser>(`/sales-users/${id}`);
  },
};

// ============ Sales Owners API (Legacy - ถ้ายังใช้ตาราง sales_owners) ============

export const salesOwnersApi = {
  list: async (includeInactive: boolean = false): Promise<ApiResponse<SalesOwner[]>> => {
    // ใช้ salesUsersApi แทน (จากตาราง users)
    const response = await salesUsersApi.list();
    
    // Map SalesUser to SalesOwner format for backward compatibility
    if (response.success && response.data) {
      const mappedData: SalesOwner[] = response.data.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
      }));
      return { ...response, data: mappedData };
    }
    
    return response as ApiResponse<SalesOwner[]>;
  },

  get: async (id: string): Promise<ApiResponse<SalesOwner>> => {
    const response = await salesUsersApi.get(id);
    
    if (response.success && response.data) {
      const mappedData: SalesOwner = {
        id: response.data.id,
        name: response.data.name,
        email: response.data.email,
        phone: response.data.phone,
        isActive: response.data.isActive,
      };
      return { ...response, data: mappedData };
    }
    
    return response as ApiResponse<SalesOwner>;
  },

  // Note: create, update, delete should go through users API with admin permission
  create: async (payload: Omit<SalesOwner, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<SalesOwner>> => {
    console.warn('salesOwnersApi.create is deprecated. Use users API to create sales users.');
    return { success: false, error: 'Use users API to create sales users' };
  },

  update: async (id: string, payload: Partial<SalesOwner>): Promise<ApiResponse<SalesOwner>> => {
    console.warn('salesOwnersApi.update is deprecated. Use users API to update sales users.');
    return { success: false, error: 'Use users API to update sales users' };
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    console.warn('salesOwnersApi.delete is deprecated. Use users API to delete sales users.');
    return { success: false, error: 'Use users API to delete sales users' };
  },
};

// ============ Companies API ============

export const companiesApi = {
  list: async (includeInactive: boolean = false): Promise<ApiResponse<Company[]>> => {
    const endpoint = includeInactive ? '/companies?includeInactive=true' : '/companies';
    return apiRequest<Company[]>(endpoint);
  },

  get: async (id: string): Promise<ApiResponse<Company>> => {
    return apiRequest<Company>(`/companies/${id}`);
  },

  create: async (payload: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Company>> => {
    return apiRequest<Company>('/companies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: Partial<Company>): Promise<ApiResponse<Company>> => {
    return apiRequest<Company>(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/companies/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ Blackout Dates API ============

export const blackoutDatesApi = {
  list: async (): Promise<ApiResponse<BlackoutDate[]>> => {
    return apiRequest<BlackoutDate[]>('/blackout-dates');
  },

  create: async (payload: Omit<BlackoutDate, 'id' | 'createdAt'>): Promise<ApiResponse<BlackoutDate>> => {
    return apiRequest<BlackoutDate>('/blackout-dates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/blackout-dates/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ Minimum Stay Rules API ============

export const minimumStayRulesApi = {
  list: async (): Promise<ApiResponse<MinimumStayRule[]>> => {
    return apiRequest<MinimumStayRule[]>('/minimum-stay-rules');
  },

  create: async (payload: Omit<MinimumStayRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<MinimumStayRule>> => {
    return apiRequest<MinimumStayRule>('/minimum-stay-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (id: string, payload: Partial<MinimumStayRule>): Promise<ApiResponse<MinimumStayRule>> => {
    return apiRequest<MinimumStayRule>(`/minimum-stay-rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  delete: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiRequest<{ message: string }>(`/minimum-stay-rules/${id}`, {
      method: 'DELETE',
    });
  },
};



// ============ Query Options ============

export const getBookingsQueryOptions = (params: ListBookingsParams = {}) =>
  queryOptions({
    queryKey: ["bookings", params],
    queryFn: () => bookingsApi.list(params),
    staleTime: 1000 * 60 * 5,
  });

export const getBookingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["booking", id],
    queryFn: () => bookingsApi.get(id),
    enabled: !!id,
  });

export const getRoomTypesQueryOptions = queryOptions({
  queryKey: ["room-types"],
  queryFn: () => roomTypesApi.list(),
  staleTime: 1000 * 60 * 10,
});

export const getCompaniesQueryOptions = queryOptions({
  queryKey: ["companies"],
  queryFn: () => companiesApi.list(),
  staleTime: 1000 * 60 * 10,
});

export const getSalesOwnersQueryOptions = queryOptions({
  queryKey: ["sales-owners"],
  queryFn: () => salesOwnersApi.list(),
  staleTime: 1000 * 60 * 10,
});

export const getBlackoutDatesQueryOptions = queryOptions({
  queryKey: ["blackout-dates"],
  queryFn: () => blackoutDatesApi.list(),
  staleTime: 1000 * 60 * 10,
});

export const getMinimumStayRulesQueryOptions = queryOptions({
  queryKey: ["minimum-stay-rules"],
  queryFn: () => minimumStayRulesApi.list(),
  staleTime: 1000 * 60 * 10,
});
