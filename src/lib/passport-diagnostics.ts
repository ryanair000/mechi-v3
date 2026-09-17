import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase';

export type PassportRouteName =
  | 'passport_public_api'
  | 'passport_public_page'
  | 'passport_card'
  | 'passport_comparison'
  | 'passport_cv_page'
  | 'passport_cv_pdf';

export type PassportRouteResultClass =
  | 'success'
  | 'not_found'
  | 'restricted'
  | 'invalid'
  | 'unauthorized'
  | 'rate_limited'
  | 'storage_error'
  | 'render_fallback'
  | 'internal_error';

type DiagnosticInput = {
  routeName: PassportRouteName;
  requestId?: string | null;
  subjectId?: string | null;
  operation?: string | null;
  responseStatus: number;
  durationMs: number;
  resultClass: PassportRouteResultClass;
  cacheState?: string | null;
};

function hash(value: string, length: number) {
  return createHash('sha256').update(value).digest('hex').slice(0, length);
}

export function startPassportRouteTimer(): () => number {
  const startedAt = process.hrtime.bigint();
  return () => Number((process.hrtime.bigint() - startedAt) / BigInt(1_000_000));
}

export function passportDiagnosticRequestId(request: Request): string {
  return request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id') ?? randomUUID();
}

export async function capturePassportRouteDiagnostic(input: DiagnosticInput): Promise<void> {
  const occurredAt = new Date();
  const { error } = await createServiceClient().from('passport_route_diagnostics').insert({
    route_name: input.routeName,
    request_id_hash: hash(input.requestId ?? randomUUID(), 64),
    subject_hash: input.subjectId ? hash(`passport-subject-v1:${input.subjectId}`, 20) : null,
    operation: input.operation?.slice(0, 40) ?? null,
    response_status: Math.max(100, Math.min(599, Math.trunc(input.responseStatus))),
    duration_ms: Math.max(0, Math.min(600_000, Math.trunc(input.durationMs))),
    result_class: input.resultClass,
    cache_state: input.cacheState?.slice(0, 40) ?? null,
    occurred_at: occurredAt.toISOString(),
    expires_at: new Date(occurredAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
  if (error) console.warn('[Passport Diagnostics]', JSON.stringify({ route: input.routeName, error_class: error.code ?? 'storage_error' }));
}

export function passportResultClass(status: number, state?: string | null): PassportRouteResultClass {
  if (state?.includes('fallback')) return 'render_fallback';
  if (status >= 500) return status === 503 ? 'storage_error' : 'internal_error';
  if (status === 404) return 'not_found';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'restricted';
  if (status === 429) return 'rate_limited';
  if (status >= 400) return 'invalid';
  return 'success';
}
