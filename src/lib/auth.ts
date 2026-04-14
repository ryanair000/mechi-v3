import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import type { JWTPayload, AuthUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = '7d';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { sub: string; username: string }): string {
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
    return verifyToken(token);
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
    return authHeader.slice(7);
  }
  return request.cookies.get('auth_token')?.value ?? null;
}

export function profileToAuthUser(profile: Record<string, unknown>): AuthUser {
  return {
    id: profile.id as string,
    username: profile.username as string,
    phone: profile.phone as string,
    email: profile.email as string | undefined,
    region: profile.region as string,
    platforms: ((profile.platforms as string[]) ?? []) as import('@/types').PlatformKey[],
    game_ids: (profile.game_ids as Record<string, string>) ?? {},
    selected_games: ((profile.selected_games as string[]) ?? []) as import('@/types').GameKey[],
  };
}
