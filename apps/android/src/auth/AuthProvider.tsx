import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login, register, type LoginPayload, type RegisterPayload } from '../api/mechi';
import { getConfiguredGameId } from '../config/games';
import { isTournamentGame } from '../config/tournament';
import { clearStoredToken, getStoredToken, setStoredToken } from '../lib/token-store';
import type { AuthUser } from '../types';

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  initializing: boolean;
  signIn: (payload: LoginPayload) => Promise<void>;
  signUp: (payload: RegisterPayload) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function isProfileComplete(user: AuthUser | null | undefined): boolean {
  const tournamentGame = user?.selected_games?.find(isTournamentGame);

  if (!tournamentGame) {
    return false;
  }

  return Boolean(getConfiguredGameId(tournamentGame, 'mobile', user?.game_ids ?? {}).trim());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getMe();
      setUser(response.user);
      return response.user;
    } catch {
      await clearStoredToken();
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const storedToken = await getStoredToken();

      if (!mounted) return;

      if (!storedToken) {
        setInitializing(false);
        return;
      }

      setToken(storedToken);
      await refreshUser();

      if (mounted) {
        setInitializing(false);
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const signIn = useCallback(async (payload: LoginPayload) => {
    const response = await login(payload);
    await setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const signUp = useCallback(async (payload: RegisterPayload) => {
    const response = await register(payload);
    await setStoredToken(response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [initializing, refreshUser, signIn, signOut, signUp, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
