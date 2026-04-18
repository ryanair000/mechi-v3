'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getScopedRoleForHost } from '@/lib/admin-access';
import type { AuthUser } from '@/types';

const TOKEN_STORAGE_KEY = 'mechi_token';
const USER_STORAGE_KEY = 'mechi_user';
const AUTH_REFRESH_TIMEOUT_MS = 8000;

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeUserForCurrentHost = useCallback((candidate: AuthUser | null): AuthUser | null => {
    if (!candidate) {
      return null;
    }

    const scopedRole = getScopedRoleForHost(candidate, window.location.host);
    if ((candidate.role ?? 'user') === scopedRole) {
      return candidate;
    }

    return {
      ...candidate,
      role: scopedRole,
    };
  }, []);

  const refresh = useCallback(async () => {
    const clearStoredAuth = () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    };

    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    let cachedUser: AuthUser | null = null;

    if (storedUser) {
      try {
        cachedUser = normalizeUserForCurrentHost(JSON.parse(storedUser) as AuthUser);
      } catch {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }

    if (cachedUser) {
      setUser(cachedUser);
      setToken(storedToken ?? null);
      setLoading(false);
    }

    if (!storedToken && !cachedUser) {
      clearStoredAuth();
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), AUTH_REFRESH_TIMEOUT_MS);

    try {
      const res = await fetch('/api/auth/me', {
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        credentials: 'include',
        signal: controller.signal,
      });

      if (res.ok) {
        const data = await res.json();
        const nextUser = normalizeUserForCurrentHost(data.user as AuthUser);
        setUser(nextUser);
        setToken(storedToken ?? null);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
      } else {
        clearStoredAuth();
        setUser(null);
        setToken(null);
      }
    } catch {
      if (!cachedUser) {
        clearStoredAuth();
        setUser(null);
        setToken(null);
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [normalizeUserForCurrentHost]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    const normalizedUser = normalizeUserForCurrentHost(newUser);
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    setToken(newToken);
    setUser(normalizedUser);
  }, [normalizeUserForCurrentHost]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
    // Clear cookie via fetch (best-effort)
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for auth-protected API calls
export function useAuthFetch() {
  const { token } = useAuth();

  return useCallback(
    async (url: string, options: RequestInit = {}) => {
      return fetch(url, {
        ...options,
        credentials: options.credentials ?? 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
    },
    [token]
  );
}
