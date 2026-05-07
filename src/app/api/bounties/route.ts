import { NextRequest, NextResponse } from 'next/server';
import { requireActiveAccessProfile } from '@/lib/access';
import type { BountyRow, BountyWinnerPublic, EnrichedBounty } from '@/lib/bounties';
import { filterVisibleBounties, shouldHideE2EFixtures } from '@/lib/e2e-fixtures';
import { createServiceClient } from '@/lib/supabase';

type WinnerRelation = {
  username: string;
  avatar_url: string | null;
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

export async function GET(request: NextRequest) {
  const access = await requireActiveAccessProfile(request);
  if (access.response) {
    return access.response;
  }

  try {
    const supabase = createServiceClient();
    let bountyQuery = supabase
      .from('bounties')
      .select(
        'id, title, description, trigger_type, trigger_metadata, prize_kes, status, winner_id, claimed_at, paid_at, activated_at, week_label, created_at, updated_at, winner:winner_id(username, avatar_url)'
      )
      .in('status', ['active', 'claimed'])
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (shouldHideE2EFixtures()) {
      bountyQuery = bountyQuery
        .not('title', 'ilike', '%e2e%')
        .not('description', 'ilike', '%e2e%');
    }

    const { data: bountyRows, error: bountyError } = await bountyQuery;

    if (bountyError) {
      console.error('[Bounties GET] Failed to fetch bounties:', bountyError);
      return NextResponse.json({ error: 'Failed to load bounties' }, { status: 500 });
    }

    const rows = filterVisibleBounties((bountyRows ?? []) as BountyQueryRow[]);
    const bountyIds = rows.map((row) => row.id);
    const { data: claimRows, error: claimError } = bountyIds.length
      ? await supabase
          .from('bounty_claim_attempts')
          .select('bounty_id')
          .eq('user_id', access.profile.id)
          .eq('won', true)
          .in('bounty_id', bountyIds)
      : { data: [], error: null };

    if (claimError) {
      console.error('[Bounties GET] Failed to fetch claim attempts:', claimError);
      return NextResponse.json({ error: 'Failed to load bounties' }, { status: 500 });
    }

    const claimedByMe = new Set(
      ((claimRows as Array<{ bounty_id: string }> | null) ?? []).map((row) => row.bounty_id)
    );

    const bounties: EnrichedBounty[] = rows.map((row) => {
      const winner = firstRelation(row.winner) as WinnerRelation | null;
      const publicWinner: BountyWinnerPublic = winner
        ? {
            username: winner.username,
            avatar_url: winner.avatar_url ?? null,
          }
        : null;

      return {
        ...row,
        winner: publicWinner,
        claimed_by_me: claimedByMe.has(row.id),
      };
    });

    return NextResponse.json({ bounties });
  } catch (error) {
    console.error('[Bounties GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
