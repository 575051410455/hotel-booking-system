// src/lib/api.ts
import { hc } from "hono/client";
import type { ApiRoutes } from "@backend/app";

import {
  queryOptions,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import type { InferRequestType, InferResponseType } from "hono/client";

// ====== Shared Types from backend (แนะนำย้ายไป shared) ======
import type { CreateUserInput } from "@backend/types";

// =======================
// 1) Hono Client
// =======================
// ถ้า backend mount ที่ /api แล้ว export เป็น app.route("/api", ...)
// การใช้ base = "/" จะเรียก /api/... ถูกต้องผ่าน client.api
const client = hc<ApiRoutes>("/");
export const api = client.api;

// =======================
// 2) Helpers
// =======================
export const getAuthToken = (): string | null => {
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
};

export const authHeaders = (token?: string | null): HeadersInit =>
  token ? { Authorization: `Bearer ${token}` } : {};

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function handleResponse<T>(res: Response): Promise<T> {
  const body = await safeJson(res);

  if (!res.ok) {
    const msg =
      body?.error || body?.message || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return body as T;
}

// =======================
// 3) Query Keys (แนะนำให้รวม token กัน cache ข้าม user)
// =======================
export const qk = {
  me: (token: string | null) => ["me", token] as const,
  users: (token: string | null) => ["users", token] as const,

  bookings: (params: unknown, token: string | null) =>
    ["bookings", params, token] as const,
  booking: (id: string, token: string | null) =>
    ["booking", id, token] as const,

  roomTypes: (token: string | null) => ["room-types", token] as const,
  roomType: (id: string, token: string | null) => ["room-types", id, token] as const,

  companies: (params: unknown, token: string | null) =>
    ["companies", params, token] as const,
  company: (id: string, token: string | null) => ["company", id, token] as const,

  salesUsers: (token: string | null) => ["sales-users", token] as const,
  salesUser: (id: string, token: string | null) => ["sales-users", id, token] as const,

  blackoutDates: (token: string | null) => ["blackout-dates", token] as const,
  minimumStayRules: (token: string | null) => ["minimum-stay-rules", token] as const,
};

// =======================
// 4) AUTH (functions + queryOptions)
// =======================

export type LoginJson = InferRequestType<typeof api.auth.login.$post>["json"];
export type LoginRes = InferResponseType<typeof api.auth.login.$post>;

export const login = async (json: LoginJson) => {
  const res = await api.auth.login.$post({ json });
  return handleResponse<LoginRes>(res);
};

export type RegisterJson = InferRequestType<typeof api.auth.register.$post>["json"];
export type RegisterRes = InferResponseType<typeof api.auth.register.$post>;

export const register = async (json: RegisterJson) => {
  const res = await api.auth.register.$post({ json });
  return handleResponse<RegisterRes>(res);
};

export const logout = async () => {
  const res = await api.auth.logout.$post();
  return handleResponse<InferResponseType<typeof api.auth.logout.$post>>(res);
};

// current user (me)
export const userQueryOptions = () => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.me(token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api.users.me.$get(undefined, {
        headers: authHeaders(token),
      });
      // ปรับ type ตรงนี้ให้ตรง response จริงของคุณ
      return handleResponse<{ data: CreateUserInput }>(res);
    },
    staleTime: 1000 * 60 * 5,
  });
};

// =======================
// 5) USERS (Query + Mutations)
// =======================

export const usersQueryOptions = () => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.users(token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api.users.$get(undefined, {
        headers: authHeaders(token),
      });
      return handleResponse<{ users: CreateUserInput[] }>(res);
    },
    staleTime: 1000 * 60,
  });
};

export function useCreateUser() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.users.$post>["json"];
  type Res = InferResponseType<typeof api.users.$post>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api.users.$post({
        json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.users[":id"]["$patch"]>["json"];
  type Res = InferResponseType<typeof api.users[":id"]["$patch"]>;

  return useMutation({
    mutationFn: async (vars: { id: string; json: Json }) => {
      const res = await api.users[":id"].$patch({
        param: { id: vars.id },
        json: vars.json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["user", vars.id] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api.users[":id"]["$delete"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.users[":id"].$delete({
        param: { id },
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// =======================
// 6) BOOKINGS (Query + Mutations)  ✅ เลิกใช้ apiRequest
// =======================

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

export interface Booking {
  id: string;
  bookingId: string;
  customerName: string;
  company: string;
  saleOwner: string;
  phone: string;
  email: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  numberOfRooms: number;
  rate: number | string;
  paymentMethod: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "VOID";
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  amendmentLogs?: {
    timestamp: string;
    amendedBy: string;
    changes: {
      field: string;
      before: any;
      after: any;
    }[];
  }[];
}

export interface RoomType {
  id: string;
  name: string;
  totalRooms: number;
  baseRate: string;
}

export interface SalesUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export const getBookingQueryOptions = (params: ListBookingsParams = {}) => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: ["bookings", params, token],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.bookings.$get(
        { query: params },
        { headers: authHeaders(token) }
      );
      const json = await res.json();
      // Backend returns { success: true, data: { data: [...], pagination: {...} } }
      const result = json?.data;
      return {
        data: Array.isArray(result?.data) ? result.data : [],
        pagination: result?.pagination,
      };
    },
  });
};

export const bookingsQueryOptions = (params: ListBookingsParams = {}) => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: ["bookings", params, token],
    enabled: !!token,
    queryFn: async () => {
      const res = await api.bookings.$get(
        { query: params },
        { headers: authHeaders(token) }
      );
      const json = await res.json();
      const result = json?.data;
      return {
        data: Array.isArray(result?.data) ? result.data : [],
        pagination: result?.pagination,
      };
    },
  });
};

export const bookingQueryOptions = (id: string) => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.booking(id, token),
    enabled: !!token && !!id,
    queryFn: async () => {
      const res = await api.bookings[":id"].$get(
        { param: { id } },
        { headers: authHeaders(token) }
      );
      return handleResponse<InferResponseType<typeof api.bookings[":id"]["$get"]>>(res);
    },
  });
};

export function useCreateBooking() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.bookings.$post>["json"];
  type Res = InferResponseType<typeof api.bookings.$post>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api.bookings.$post({
        json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.bookings[":id"]["$patch"]>["json"];
  type Res = InferResponseType<typeof api.bookings[":id"]["$patch"]>;

  return useMutation({
    mutationFn: async (vars: { id: string; json: Json }) => {
      const res = await api.bookings[":id"].$patch({
        param: { id: vars.id },
        json: vars.json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", vars.id] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api.bookings[":id"]["$delete"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.bookings[":id"].$delete({
        param: { id },
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

// confirm/cancel/check-availability (ถ้ามี route ใน ApiRoutes)
export function useConfirmBooking() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api.bookings[":id"]["confirm"]["$post"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.bookings[":id"].confirm.$post(
        { param: { id } },
        { headers: authHeaders(token) }
      );
      return handleResponse<Res>(res);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", id] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.bookings[":id"]["cancel"]["$post"]>["json"];
  type Res = InferResponseType<typeof api.bookings[":id"]["cancel"]["$post"]>;

  return useMutation({
    mutationFn: async (vars: { id: string; json: Json }) => {
      const res = await api.bookings[":id"].cancel.$post(
        { param: { id: vars.id }, json: vars.json },
        { headers: authHeaders(token) }
      );
      return handleResponse<Res>(res);
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["booking", vars.id] });
    },
  });
}

export function useCheckAvailability() {
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.bookings["check-availability"]["$post"]>["json"];
  type Res = InferResponseType<typeof api.bookings["check-availability"]["$post"]>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api.bookings["check-availability"].$post(
        { json },
        { headers: authHeaders(token) }
      );
      return handleResponse<Res>(res);
    },
  });
}

// =======================
// 7) ROOM TYPES (Query + Mutations)
// =======================

export const roomTypesQueryOptions = () => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.roomTypes(token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api["room-types"].$get(undefined, {
        headers: authHeaders(token),
      });
      return handleResponse<InferResponseType<typeof api["room-types"]["$get"]>>(res);
    },
    staleTime: 1000 * 60 * 10,
  });
};

export function useCreateRoomType() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api["room-types"]["$post"]>["json"];
  type Res = InferResponseType<typeof api["room-types"]["$post"]>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api["room-types"].$post({
        json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-types"] }),
  });
}

export function useUpdateRoomType() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api["room-types"][":id"]["$patch"]>["json"];
  type Res = InferResponseType<typeof api["room-types"][":id"]["$patch"]>;

  return useMutation({
    mutationFn: async (vars: { id: string; json: Json }) => {
      const res = await api["room-types"][":id"].$patch({
        param: { id: vars.id },
        json: vars.json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["room-types"] });
      qc.invalidateQueries({ queryKey: ["room-types", vars.id] });
    },
  });
}

export function useDeleteRoomType() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api["room-types"][":id"]["$delete"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api["room-types"][":id"].$delete({
        param: { id },
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["room-types"] }),
  });
}

// =======================
// 8) COMPANIES (คุณทำถูกแล้ว แค่เติม auth + type ให้ชัด)
// =======================

export const companiesQueryOptions = (
  params: InferRequestType<typeof api.companies.$get>["query"] = {}
) => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.companies(params, token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api.companies.$get(
        { query: params },
        { headers: authHeaders(token) }
      );
      return handleResponse<InferResponseType<typeof api.companies.$get>>(res);
    },
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });
};

export const companyQueryOptions = (id: string) => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.company(id, token),
    enabled: !!token && !!id,
    queryFn: async () => {
      const res = await api.companies[":id"].$get(
        { param: { id } },
        { headers: authHeaders(token) }
      );
      return handleResponse<InferResponseType<typeof api.companies[":id"]["$get"]>>(res);
    },
  });
};

export function useCreateCompany() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.companies.$post>["json"];
  type Res = InferResponseType<typeof api.companies.$post>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api.companies.$post({
        json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api.companies[":id"]["$patch"]>["json"];
  type Res = InferResponseType<typeof api.companies[":id"]["$patch"]>;

  return useMutation({
    mutationFn: async (vars: { id: string; json: Json }) => {
      const res = await api.companies[":id"].$patch({
        param: { id: vars.id },
        json: vars.json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company", vars.id] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api.companies[":id"]["$delete"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.companies[":id"].$delete({
        param: { id },
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

// =======================
// 9) SALES USERS (แทน salesOwnersApi/list ที่ใช้ fetch เดิม)
// =======================

export const salesUsersQueryOptions = () => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.salesUsers(token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api["sales-users"].$get(undefined, {
        headers: authHeaders(token),
      });
      return handleResponse<InferResponseType<typeof api["sales-users"]["$get"]>>(res);
    },
    staleTime: 1000 * 60 * 10,
  });
};

// =======================
// 10) BLACKOUT DATES (เลิก apiRequest)
// =======================

export const blackoutDatesQueryOptions = () => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.blackoutDates(token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api["blackout-dates"].$get(undefined, {
        headers: authHeaders(token),
      });
      return handleResponse<InferResponseType<typeof api["blackout-dates"]["$get"]>>(res);
    },
    staleTime: 1000 * 60 * 10,
  });
};

export function useCreateBlackoutDate() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api["blackout-dates"]["$post"]>["json"];
  type Res = InferResponseType<typeof api["blackout-dates"]["$post"]>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api["blackout-dates"].$post({
        json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blackout-dates"] }),
  });
}

export function useDeleteBlackoutDate() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api["blackout-dates"][":id"]["$delete"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api["blackout-dates"][":id"].$delete({
        param: { id },
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blackout-dates"] }),
  });
}

// =======================
// 11) MINIMUM STAY RULES (เลิก apiRequest)
// =======================

export const minimumStayRulesQueryOptions = () => {
  const token = getAuthToken();
  return queryOptions({
    queryKey: qk.minimumStayRules(token),
    enabled: !!token,
    queryFn: async () => {
      const res = await api["minimum-stay-rules"].$get(undefined, {
        headers: authHeaders(token),
      });
      return handleResponse<InferResponseType<typeof api["minimum-stay-rules"]["$get"]>>(res);
    },
    staleTime: 1000 * 60 * 10,
  });
};

export function useCreateMinimumStayRule() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api["minimum-stay-rules"]["$post"]>["json"];
  type Res = InferResponseType<typeof api["minimum-stay-rules"]["$post"]>;

  return useMutation({
    mutationFn: async (json: Json) => {
      const res = await api["minimum-stay-rules"].$post({
        json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minimum-stay-rules"] }),
  });
}

export function useUpdateMinimumStayRule() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Json = InferRequestType<typeof api["minimum-stay-rules"][":id"]["$patch"]>["json"];
  type Res = InferResponseType<typeof api["minimum-stay-rules"][":id"]["$patch"]>;

  return useMutation({
    mutationFn: async (vars: { id: string; json: Json }) => {
      const res = await api["minimum-stay-rules"][":id"].$patch({
        param: { id: vars.id },
        json: vars.json,
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minimum-stay-rules"] }),
  });
}

export function useDeleteMinimumStayRule() {
  const qc = useQueryClient();
  const token = getAuthToken();

  type Res = InferResponseType<typeof api["minimum-stay-rules"][":id"]["$delete"]>;

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api["minimum-stay-rules"][":id"].$delete({
        param: { id },
        headers: authHeaders(token),
      });
      return handleResponse<Res>(res);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["minimum-stay-rules"] }),
  });
}
