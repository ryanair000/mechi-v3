import { createServiceClient } from '@/lib/supabase';
import type { MatchEscalation, MatchEscalationReason, MatchEscalationStatus, Profile } from '@/types';

export const MATCH_ESCALATION_DETAIL_MAX_LENGTH = 400;

export const MATCH_ESCALATION_REASON_LABELS: Record<MatchEscalationReason, string> = {
  setup_issue: 'Setup issue',
  stalling: 'Stalling',
  wrong_result: 'Wrong result',
  abuse: 'Abuse',
  other: 'Other',
};

type MatchEscalationRow = {
  id: string;
  match_id: string;
  requested_by: string;
  reason: MatchEscalationReason;
  details?: string | null;
  status: MatchEscalationStatus;
  resolution_note?: string | null;
  resolved_by?: string | null;
  created_at: string;
  resolved_at?: string | null;
  updated_at: string;
};

function getSupabase() {
  return createServiceClient();
}

export function normalizeEscalationDetails(details: string) {
  return details.replace(/\s+/g, ' ').trim();
}

async function mapEscalations(rows: MatchEscalationRow[]): Promise<MatchEscalation[]> {
  const profileIds = [
    ...new Set(
      rows.flatMap((row) => [row.requested_by, row.resolved_by].filter(Boolean))
    ),
  ] as string[];

  let profiles = new Map<string, Pick<Profile, 'id' | 'username' | 'avatar_url' | 'role'>>();

  if (profileIds.length > 0) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, role')
      .in('id', profileIds);

    profiles = new Map(
      (
        (data ?? []) as Array<Pick<Profile, 'id' | 'username' | 'avatar_url' | 'role'>>
      ).map((profile) => [profile.id, profile])
    );
  }

  return rows.map((row) => ({
    ...row,
    details: row.details ?? null,
    resolution_note: row.resolution_note ?? null,
    resolved_by: row.resolved_by ?? null,
    resolved_at: row.resolved_at ?? null,
    requester: profiles.get(row.requested_by) ?? null,
    resolver: row.resolved_by ? profiles.get(row.resolved_by) ?? null : null,
  }));
}

export async function listMatchEscalations(matchId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('match_escalations')
    .select(
      'id, match_id, requested_by, reason, details, status, resolution_note, resolved_by, created_at, resolved_at, updated_at'
    )
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });

  return mapEscalations(((data ?? []) as MatchEscalationRow[]) ?? []);
}

export async function countOpenMatchEscalations(matchIds: string[]) {
  if (matchIds.length === 0) {
    return new Map<string, number>();
  }

  return listOpenMatchEscalationCounts(matchIds);
}

export async function listOpenMatchEscalationCounts(matchIds?: string[]) {
  if (matchIds && matchIds.length === 0) {
    return new Map<string, number>();
  }

  const supabase = getSupabase();
  let query = supabase.from('match_escalations').select('match_id').eq('status', 'open');

  if (matchIds) {
    query = query.in('match_id', matchIds);
  }

  const { data } = await query;

  const counts = new Map<string, number>();
  (((data ?? []) as Array<{ match_id: string }>) ?? []).forEach((row) => {
    counts.set(row.match_id, (counts.get(row.match_id) ?? 0) + 1);
  });
  return counts;
}

export async function createMatchEscalation(params: {
  matchId: string;
  requestedBy: string;
  reason: MatchEscalationReason;
  details?: string;
}) {
  const normalizedDetails = normalizeEscalationDetails(params.details ?? '');

  if (normalizedDetails.length > MATCH_ESCALATION_DETAIL_MAX_LENGTH) {
    return { ok: false as const, reason: 'too_long' as const };
  }

  const supabase = getSupabase();
  const { data: existingOpenEscalation } = await supabase
    .from('match_escalations')
    .select('id')
    .eq('match_id', params.matchId)
    .eq('status', 'open')
    .limit(1)
    .maybeSingle();

  if (existingOpenEscalation?.id) {
    return { ok: false as const, reason: 'already_open' as const };
  }

  const { data, error } = await supabase
    .from('match_escalations')
    .insert({
      match_id: params.matchId,
      requested_by: params.requestedBy,
      reason: params.reason,
      details: normalizedDetails || null,
      status: 'open',
      updated_at: new Date().toISOString(),
    })
    .select(
      'id, match_id, requested_by, reason, details, status, resolution_note, resolved_by, created_at, resolved_at, updated_at'
    )
    .single();

  if (error || !data) {
    return { ok: false as const, reason: 'insert_failed' as const };
  }

  const [escalation] = await mapEscalations([data as MatchEscalationRow]);
  return { ok: true as const, escalation };
}

export async function updateMatchEscalation(params: {
  escalationId: string;
  matchId?: string;
  status: Extract<MatchEscalationStatus, 'resolved' | 'dismissed'>;
  resolvedBy: string;
  resolutionNote?: string;
}) {
  const normalizedNote = normalizeEscalationDetails(params.resolutionNote ?? '');
  if (normalizedNote.length > MATCH_ESCALATION_DETAIL_MAX_LENGTH) {
    return { ok: false as const, reason: 'too_long' as const };
  }

  const supabase = getSupabase();
  let query = supabase
    .from('match_escalations')
    .update({
      status: params.status,
      resolution_note: normalizedNote || null,
      resolved_by: params.resolvedBy,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.escalationId)
    .eq('status', 'open');

  if (params.matchId) {
    query = query.eq('match_id', params.matchId);
  }

  const { data, error } = await query
    .select(
      'id, match_id, requested_by, reason, details, status, resolution_note, resolved_by, created_at, resolved_at, updated_at'
    )
    .single();

  if (error || !data) {
    return { ok: false as const, reason: 'update_failed' as const };
  }

  const [escalation] = await mapEscalations([data as MatchEscalationRow]);
  return { ok: true as const, escalation };
}
