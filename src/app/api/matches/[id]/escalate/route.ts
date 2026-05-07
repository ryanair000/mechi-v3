import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import { createMatchChatMessage } from '@/lib/match-chat';
import {
  createMatchEscalation,
  MATCH_ESCALATION_DETAIL_MAX_LENGTH,
  MATCH_ESCALATION_REASON_LABELS,
} from '@/lib/match-escalations';
import { createNotification } from '@/lib/notifications';
import { createServiceClient } from '@/lib/supabase';
import type { MatchEscalationReason } from '@/types';

const ACTIVE_MATCH_STATUSES = new Set(['pending', 'disputed']);
const VALID_REASONS = new Set<MatchEscalationReason>([
  'setup_issue',
  'stalling',
  'wrong_result',
  'abuse',
  'other',
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  const authUser = access.profile;
  const { id } = await params;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const reason = String(body.reason ?? '').trim() as MatchEscalationReason;
    const details = String(body.details ?? '');

    if (!VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Choose a valid admin-help reason' }, { status: 400 });
    }

    if (details.trim().length > MATCH_ESCALATION_DETAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Keep the admin-help note under ${MATCH_ESCALATION_DETAIL_MAX_LENGTH} characters` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { data: match } = await supabase
      .from('matches')
      .select('id, status, player1_id, player2_id')
      .eq('id', id)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.player1_id !== authUser.id && match.player2_id !== authUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!ACTIVE_MATCH_STATUSES.has(String(match.status ?? ''))) {
      return NextResponse.json(
        { error: 'Admin help can only be requested while the match is still active' },
        { status: 400 }
      );
    }

    const escalationResult = await createMatchEscalation({
      matchId: id,
      requestedBy: authUser.id,
      reason,
      details,
    });

    if (!escalationResult.ok) {
      if (escalationResult.reason === 'already_open') {
        return NextResponse.json(
          { error: 'Admin help is already open for this match' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Could not request admin help' }, { status: 500 });
    }

    const reasonLabel = MATCH_ESCALATION_REASON_LABELS[reason];
    const trimmedDetails = details.trim();
    await createMatchChatMessage({
      matchId: id,
      senderType: 'system',
      body: trimmedDetails
        ? `${authUser.username} requested admin help for ${reasonLabel.toLowerCase()}: ${trimmedDetails}`
        : `${authUser.username} requested admin help for ${reasonLabel.toLowerCase()}.`,
      meta: {
        event: 'admin_help_requested',
        escalation_id: escalationResult.escalation.id,
        requested_by: authUser.id,
        reason,
        details: trimmedDetails || null,
      },
    });

    const opponentId = match.player1_id === authUser.id ? match.player2_id : match.player1_id;
    await createNotification({
      user_id: opponentId,
      type: 'match_chat_message',
      title: `${authUser.username} requested admin help`,
      body: trimmedDetails
        ? `${reasonLabel}: ${trimmedDetails}`
        : `Open the match thread to see the ${reasonLabel.toLowerCase()} request.`,
      href: `/match/${id}`,
      metadata: {
        match_id: id,
        escalation_id: escalationResult.escalation.id,
        reason,
      },
    });

    return NextResponse.json({
      escalation: escalationResult.escalation,
    });
  } catch (error) {
    console.error('[Match Escalate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
