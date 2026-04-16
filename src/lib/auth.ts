import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import type { JWTPayload, AuthUser, UserRole } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: {
  sub: string;
  username: string;
  role?: UserRole;
  is_banned?: boolean;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function getAuthUser(request: NextRequest): JWTPayload | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const headerUser = verifyToken(token);
    if (headerUser) {
      return headerUser;
    }
  }

  // Fallback to cookie
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const headerToken = authHeader.slice(7);
    if (verifyToken(headerToken)) {
      return headerToken;
    }
  }
  const cookieToken = request.cookies.get('auth_token')?.value;
  if (cookieToken && verifyToken(cookieToken)) {
    return cookieToken;
  }
  return null;
}

export function profileToAuthUser(profile: Record<string, unknown>): AuthUser {
  return {
    id: profile.id as string,
    username: profile.username as string,
    phone: profile.phone as string,
    email: profile.email as string | undefined,
    invite_code: (profile.invite_code as string | undefined) ?? undefined,
    invited_by: (profile.invited_by as string | null | undefined) ?? null,
    avatar_url: (profile.avatar_url as string | null | undefined) ?? null,
    cover_url: (profile.cover_url as string | null | undefined) ?? null,
    region: profile.region as string,
    platforms: ((profile.platforms as string[]) ?? []) as import('@/types').PlatformKey[],
    game_ids: (profile.game_ids as Record<string, string>) ?? {},
    selected_games: ((profile.selected_games as string[]) ?? []) as import('@/types').GameKey[],
    role: (profile.role as UserRole | undefined) ?? 'user',
    is_banned: (profile.is_banned as boolean | undefined) ?? false,
    whatsapp_number: (profile.whatsapp_number as string | null | undefined) ?? null,
    whatsapp_notifications: (profile.whatsapp_notifications as boolean | undefined) ?? false,
    xp: (profile.xp as number | undefined) ?? 0,
    level: (profile.level as number | undefined) ?? 1,
    mp: (profile.mp as number | undefined) ?? 0,
    win_streak: (profile.win_streak as number | undefined) ?? 0,
    max_win_streak: (profile.max_win_streak as number | undefined) ?? 0,
    plan: (profile.plan as import('@/types').Plan | undefined) ?? 'free',
    plan_since: (profile.plan_since as string | null | undefined) ?? null,
    plan_expires_at: (profile.plan_expires_at as string | null | undefined) ?? null,
  };
}

export function isModerator(user: JWTPayload | null): boolean {
  return user?.role === 'moderator' || user?.role === 'admin';
}

export function isAdmin(user: JWTPayload | null): boolean {
  return user?.role === 'admin';
}
