import { create } from 'zustand';
import type { User, AuthTokens } from '../types';
import * as authApi from '../api/auth';
import { setTokens, clearTokens, getAccessToken } from '../api/client';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: authApi.RegisterData) => Promise<void>;
  logout: () => void;
  loadProfile: () => Promise<void>;
  updateProfile: (data: authApi.ProfileUpdateData) => Promise<void>;
  clearError: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: () => {
    const accessToken = getAccessToken();
    if (accessToken) {
      set({ isAuthenticated: true });
      // Attempt to load profile in the background
      get().loadProfile();
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      const tokens: AuthTokens = {
        access: response.access,
        refresh: response.refresh,
      };
      setTokens(tokens.access, tokens.refresh);
      set({
        user: response.user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Ошибка входа. Проверьте email и пароль.');
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (data: authApi.RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register(data);
      const tokens: AuthTokens = {
        access: response.access,
        refresh: response.refresh,
      };
      setTokens(tokens.access, tokens.refresh);
      set({
        user: response.user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Ошибка регистрации. Попробуйте снова.');
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: () => {
    clearTokens();
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const user = await authApi.getProfile();
      set({ user, isLoading: false, isAuthenticated: true });
    } catch {
      // If profile load fails, the token may be invalid
      clearTokens();
      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  updateProfile: async (data: authApi.ProfileUpdateData) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authApi.updateProfile(data);
      set({ user, isLoading: false });
    } catch (err: unknown) {
      const message = extractErrorMessage(err, 'Ошибка обновления профиля.');
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

// Listen for forced logout events from the API client (e.g., refresh token expired)
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    useAuthStore.getState().logout();
  });
}

/**
 * Extract a human-readable error message from an API error response.
 */
function extractErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { data?: unknown } }).response?.data
  ) {
    const data = (err as { response: { data: unknown } }).response.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      // DRF often returns { field: [errors] } or { detail: "..." }
      if ('detail' in data && typeof (data as Record<string, unknown>).detail === 'string') {
        return (data as Record<string, string>).detail;
      }
      // Concatenate all field errors
      const messages: string[] = [];
      for (const value of Object.values(data as Record<string, unknown>)) {
        if (Array.isArray(value)) {
          messages.push(...value.map(String));
        } else if (typeof value === 'string') {
          messages.push(value);
        }
      }
      if (messages.length > 0) return messages.join(' ');
    }
  }
  return fallback;
}
