import { hc } from 'hono/client'
import type { ApiRoutes } from '../../../backend/app'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'

// Create the RPC client

const client = hc<ApiRoutes>('http://localhost:3000/')

export interface User {
  id: string;
  email: string;
  username: string;
  lastname: string;
  role: "user" | "admin";
  avater: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
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
  const res = await client.api.auth.login.$post({
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
  const res = await client.api.auth.register.$post({
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
      const res = await client.api.users.me.$get(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ user: User }>(res);
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

export const getAllUsersQueryOptions = (token: string) =>
  queryOptions({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await client.api.users.$get(undefined, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ users: User[] }>(res);
    },
    enabled: !!token,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

// Legacy functions for backward compatibility
export async function getMe(token: string): Promise<{ user: User }> {
  const res = await client.api.users.me.$get(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: User }>(res);
}

export async function getAllUsers(token: string): Promise<{ users: User[] }> {
  const res = await client.api.users.$get(undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ users: User[] }>(res);
}

// ============================================
// User Mutation Hooks
// ============================================

export function useCreateUser(token: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; username: string; lastname: string; role: "user" | "admin" }) => {
      const res = await client.api.users.$post({
        json: data,
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ user: User }>(res);
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
      const res = await client.api.users[":id"].$patch({
        param: { id: userId },
        json: data,
        headers: { Authorization: `Bearer ${token}` },
      });
      return handleResponse<{ user: User }>(res);
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
      const res = await client.api.users[":id"].$delete({
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
): Promise<{ user: User }> {
  const res = await client.api.users.$post({
    json: data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: User }>(res);
}

export async function updateUser(
  token: string,
  userId: string,
  data: { email?: string; password?: string; username?: string; lastname?: string; role?: "user" | "admin" }
): Promise<{ user: User }> {
  const res = await client.api.users[":id"].$patch({
    param: { id: userId },
    json: data,
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ user: User }>(res);
}

export async function deleteUser(token: string, userId: string): Promise<{ message: string }> {
  const res = await client.api.users[":id"].$delete({
    param: { id: userId },
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse<{ message: string }>(res);
}

// Export the client for direct use if needed
export { client }