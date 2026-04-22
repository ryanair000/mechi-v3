import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess } from '@/lib/access';
import type { AdminBounty, BountyRow, BountyWinnerAdmin } from '@/lib/bounties';
import { isE2EBountyFixture, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { createServiceClient } from '@/lib/supabase';

type BountyAction = 'activate' | 'cancel' | 'mark_paid';

type WinnerRelation = {
  username: string;
  avatar_url: string | null;
  phone: string | null;
};

type BountyQueryRow = BountyRow & {
  winner?: WinnerRelation | WinnerRelation[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isValidAction(value: unknown): value is BountyAction {
  return value === 'activate' || value === 'cancel' || value === 'mark_paid';
}

function toAdminBounty(row: BountyQueryRow): AdminBounty {
  const winner = firstRelation(row.winner) as WinnerRelation | null;
  const adminWinner: BountyWinnerAdmin = winner
    ? {
        username: winner.username,
        avatar_url: winner.avatar_url ?? null,
        phone: winner.phone ?? null,
      }
    : null;

  return {
    ...row,
    winner: adminWinner,
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: BountyAction };

    if (!isValidAction(body.action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createServiceClient();
    let bountyQuery = supabase
      .from('bounties')
      .select(
        'id, title, description, trigger_type, trigger_metadata, prize_kes, status, winner_id, claimed_at, paid_at, activated_at, week_label, created_at, updated_at, winner:winner_id(username, avatar_url, phone)'
      )
      .eq('id', id);

    if (shouldHideE2EFixtures()) {
      bountyQuery = bountyQuery
        .not('title', 'ilike', '%e2e%')
        .not('description', 'ilike', '%e2e%');
    }

    const { data: bountyRaw, error: bountyError } = await bountyQuery.maybeSingle();

    const bounty = bountyRaw as BountyQueryRow | null;

    if (bountyError || !bounty || isE2EBountyFixture(bounty)) {
      return NextResponse.json({ error: 'Bounty not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updatePayload: Partial<BountyRow> & { updated_at: string } = {
      updated_at: now,
    };

    if (body.action === 'activate') {
      if (bounty.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft bounties can go live' }, { status: 400 });
      }

      updatePayload.status = 'active';
      updatePayload.activated_at = now;
    }

    if (body.action === 'cancel') {
      if (bounty.status !== 'draft' && bounty.status !== 'active') {
        return NextResponse.json(
          { error: 'Only draft or active bounties can be cancelled' },
          { status: 400 }
        );
      }

      updatePayload.status = 'cancelled';
    }

    if (body.action === 'mark_paid') {
      if (bounty.status !== 'claimed') {
        return NextResponse.json({ error: 'Only claimed bounties can be marked paid' }, { status: 400 });
      }

      if (bounty.paid_at) {
        return NextResponse.json({ error: 'Bounty is already marked paid' }, { status: 400 });
      }

      updatePayload.paid_at = now;
    }

    const { data: updatedBountyRaw, error: updateError } = await supabase
      .from('bounties')
      .update(updatePayload)
      .eq('id', id)
      .select(
        'id, title, description, trigger_type, trigger_metadata, prize_kes, status, winner_id, claimed_at, paid_at, activated_at, week_label, created_at, updated_at, winner:winner_id(username, avatar_url, phone)'
      )
      .single();

    if (updateError || !updatedBountyRaw) {
      console.error('[Admin Bounties PATCH] Failed to update bounty:', updateError);
      return NextResponse.json({ error: 'Failed to update bounty' }, { status: 500 });
    }

    return NextResponse.json({ bounty: toAdminBounty(updatedBountyRaw as BountyQueryRow) });
  } catch (error) {
    console.error('[Admin Bounties PATCH] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
