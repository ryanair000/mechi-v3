import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasAdminAccess } from '@/lib/access';
import {
  getWeekLabel,
  isBountyPrizeKes,
  isBountyTriggerType,
  type AdminBounty,
  type BountyRow,
  type BountyWinnerAdmin,
} from '@/lib/bounties';
import { createServiceClient } from '@/lib/supabase';

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

function isValidWeekLabel(value: string) {
  return /^\d{4}-W\d{2}$/.test(value);
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

export async function GET(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('bounties')
      .select(
        'id, title, description, trigger_type, trigger_metadata, prize_kes, status, winner_id, claimed_at, paid_at, activated_at, week_label, created_at, updated_at, winner:winner_id(username, avatar_url, phone)'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Admin Bounties GET] Failed to fetch bounties:', error);
      return NextResponse.json({ error: 'Failed to load bounties' }, { status: 500 });
    }

    return NextResponse.json({
      bounties: ((data ?? []) as BountyQueryRow[]).map(toAdminBounty),
    });
  } catch (error) {
    console.error('[Admin Bounties GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasAdminAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      trigger_type?: string;
      prize_kes?: number;
      week_label?: string;
    };

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const weekLabel =
      typeof body.week_label === 'string' && body.week_label.trim()
        ? body.week_label.trim()
        : getWeekLabel();

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }

    if (!isBountyTriggerType(body.trigger_type)) {
      return NextResponse.json({ error: 'trigger_type is invalid' }, { status: 400 });
    }

    if (!isBountyPrizeKes(body.prize_kes)) {
      return NextResponse.json({ error: 'prize_kes must be 50, 100, or 200' }, { status: 400 });
    }

    if (!isValidWeekLabel(weekLabel)) {
      return NextResponse.json({ error: 'week_label must look like 2026-W17' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('bounties')
      .insert({
        title,
        description,
        trigger_type: body.trigger_type,
        prize_kes: body.prize_kes,
        week_label: weekLabel,
        status: 'draft',
      })
      .select(
        'id, title, description, trigger_type, trigger_metadata, prize_kes, status, winner_id, claimed_at, paid_at, activated_at, week_label, created_at, updated_at, winner:winner_id(username, avatar_url, phone)'
      )
      .single();

    if (error || !data) {
      console.error('[Admin Bounties POST] Failed to create bounty:', error);
      return NextResponse.json({ error: 'Failed to create bounty' }, { status: 500 });
    }

    return NextResponse.json({ bounty: toAdminBounty(data as BountyQueryRow) });
  } catch (error) {
    console.error('[Admin Bounties POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
