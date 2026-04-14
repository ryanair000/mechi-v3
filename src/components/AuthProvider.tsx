'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { AuthUser } from '@/types';

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

  const refresh = useCallback(async () => {
    const storedToken = localStorage.getItem('mechi_token');
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setToken(storedToken);
      } else {
        localStorage.removeItem('mechi_token');
        setUser(null);
        setToken(null);
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('mechi_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('mechi_token');
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
