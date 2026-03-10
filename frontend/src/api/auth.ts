import apiClient from './client';
import type { User, AuthTokens, Product } from '../types';

export interface RegisterData {
  username?: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  city?: string;
  address?: string;
}

export const register = async (
  data: RegisterData
): Promise<AuthTokens & { user: User }> => {
  const response = await apiClient.post<AuthTokens & { user: User }>(
    '/auth/register/',
    data
  );
  return response.data;
};

export const login = async (
  data: LoginData
): Promise<AuthTokens & { user: User }> => {
  const response = await apiClient.post<AuthTokens & { user: User }>(
    '/auth/login/',
    data
  );
  return response.data;
};

export const refreshToken = async (
  refresh: string
): Promise<{ access: string; refresh?: string }> => {
  const response = await apiClient.post<{ access: string; refresh?: string }>(
    '/auth/token/refresh/',
    { refresh }
  );
  return response.data;
};

export const getProfile = async (): Promise<User> => {
  const response = await apiClient.get<User>('/auth/profile/');
  return response.data;
};

export const updateProfile = async (
  data: ProfileUpdateData
): Promise<User> => {
  const response = await apiClient.put<User>('/auth/profile/', data);
  return response.data;
};

export const getWishlist = async (): Promise<Product[]> => {
  const response = await apiClient.get<Product[]>('/auth/wishlist/');
  return response.data;
};

export const addToWishlist = async (
  productId: number
): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    `/auth/wishlist/${productId}/`
  );
  return response.data;
};

export const removeFromWishlist = async (
  productId: number
): Promise<void> => {
  await apiClient.delete(`/auth/wishlist/${productId}/`);
};

export const changePassword = async (
  data: { old_password: string; new_password: string }
): Promise<{ detail: string }> => {
  const response = await apiClient.post<{ detail: string }>(
    '/auth/change-password/',
    data
  );
  return response.data;
};
