import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase';

interface RateLimitEntry {
  count: number;
  windowStart: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const store = new Map<string, RateLimitEntry>();

function cleanupStore(now = Date.now()) {
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > Math.max(entry.windowMs, 15 * 60 * 1000)) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupStore(now);

  const entry = store.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterSeconds: 0 };
  }

  if (entry.count >= limit) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - entry.count), retryAfterSeconds: 0 };
}

function hashRateLimitKey(key: string) {
  return `rate:${createHash('sha256').update(key).digest('hex')}`;
}

function getPersistentRateLimitResult(
  row: Record<string, unknown> | null | undefined,
  fallback: RateLimitResult
): RateLimitResult {
  if (!row) {
    return fallback;
  }

  return {
    allowed: Boolean(row.allowed),
    remaining: Math.max(0, Number(row.remaining ?? fallback.remaining) || 0),
    retryAfterSeconds: Math.max(
      0,
      Number(row.retry_after_seconds ?? fallback.retryAfterSeconds) || 0
    ),
  };
}

export async function checkPersistentRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const fallback = checkRateLimit(`memory:${key}`, limit, windowMs);
  if (!fallback.allowed) {
    return fallback;
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc('check_rate_limit_attempt', {
      p_key: hashRateLimitKey(key),
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error) {
      console.warn('[RateLimit] Persistent rate limit unavailable:', error.message);
      return fallback;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return getPersistentRateLimitResult(row as Record<string, unknown> | null, fallback);
  } catch (error) {
    console.warn('[RateLimit] Falling back to in-memory rate limit:', error);
    return fallback;
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'Cache-Control': 'no-store',
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }

  return headers;
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Remaining': '0',
        'Cache-Control': 'no-store',
      },
    }
  );
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('true-client-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}
