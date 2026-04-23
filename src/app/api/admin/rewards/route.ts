import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import type { AdminRewardRedemptionItem, RewardRedemptionStatus } from '@/types';

type StatusFilter = RewardRedemptionStatus | 'all';

type RewardUserRelation = {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  reward_points_available?: number | null;
  reward_points_pending?: number | null;
  reward_points_lifetime?: number | null;
};

type RewardProcessorRelation = {
  id: string;
  username: string;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function safeSearch(value: string | null) {
  return String(value || '')
    .replace(/[%,]/g, '')
    .trim()
    .toLowerCase();
}

function parseStatus(value: string | null): StatusFilter {
  if (value === 'pending' || value === 'processing' || value === 'completed' || value === 'rejected') {
    return value;
  }

  return 'all';
}

function toItem(row: Record<string, unknown>): AdminRewardRedemptionItem {
  const user = firstRelation(
    row.user as RewardUserRelation | RewardUserRelation[] | null | undefined
  );
  const processor = firstRelation(
    row.processor as RewardProcessorRelation | RewardProcessorRelation[] | null | undefined
  );

  return {
    id: row.id as string,
    user_id: row.user_id as string,
    catalog_id: row.catalog_id as string,
    game: row.game as AdminRewardRedemptionItem['game'],
    reward_amount_label: row.reward_amount_label as string,
    cost_kes: Number(row.cost_kes) || 0,
    cost_points: Number(row.cost_points) || 0,
    mpesa_number: row.mpesa_number as string,
    status: row.status as RewardRedemptionStatus,
    submitted_at: row.submitted_at as string,
    processing_at: (row.processing_at as string | null | undefined) ?? null,
    completed_at: (row.completed_at as string | null | undefined) ?? null,
    rejected_at: (row.rejected_at as string | null | undefined) ?? null,
    admin_note: (row.admin_note as string | null | undefined) ?? null,
    user: user
      ? {
          id: user.id,
          username: user.username,
          phone: user.phone ?? null,
          email: user.email ?? null,
          reward_points_available: Number(user.reward_points_available) || 0,
          reward_points_pending: Number(user.reward_points_pending) || 0,
          reward_points_lifetime: Number(user.reward_points_lifetime) || 0,
        }
      : null,
    processor: processor
      ? {
          id: processor.id,
          username: processor.username,
        }
      : null,
  };
}

export async function GET(request: NextRequest) {
  const admin = await getRequestAccessProfile(request);
  if (!admin || !hasModeratorAccess(admin) || admin.is_banned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = parseStatus(searchParams.get('status'));
    const search = safeSearch(searchParams.get('q'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '40'), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);
    const fetchSize = search ? Math.min(offset + limit + 80, 250) : limit;
    const supabase = createServiceClient();

    let query = supabase
      .from('reward_redemption_requests')
      .select(
        'id, user_id, catalog_id, game, reward_amount_label, cost_kes, cost_points, mpesa_number, status, submitted_at, processing_at, completed_at, rejected_at, admin_note, user:user_id(id, username, phone, email, reward_points_available, reward_points_pending, reward_points_lifetime), processor:processed_by(id, username)',
        { count: 'exact' }
      )
      .order('submitted_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (!search) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(fetchSize);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('[Admin Rewards GET] Failed to fetch redemption queue:', error);
      return NextResponse.json({ error: 'Failed to fetch reward redemptions' }, { status: 500 });
    }

    const items = ((data ?? []) as Array<Record<string, unknown>>).map(toItem);
    const filteredItems = search
      ? items.filter((item) =>
          [
            item.user?.username ?? '',
            item.user?.email ?? '',
            item.user?.phone ?? '',
            item.game,
            item.reward_amount_label,
            item.mpesa_number,
            item.status,
            item.admin_note ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(search)
        )
      : items;

    const pagedItems = search ? filteredItems.slice(offset, offset + limit) : filteredItems;

    const [pendingCount, processingCount, completedCount, rejectedCount] = await Promise.all([
      supabase
        .from('reward_redemption_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('reward_redemption_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'processing'),
      supabase
        .from('reward_redemption_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('reward_redemption_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'rejected'),
    ]);

    return NextResponse.json({
      items: pagedItems,
      total: search ? filteredItems.length : count ?? filteredItems.length,
      counts: {
        pending: pendingCount.count ?? 0,
        processing: processingCount.count ?? 0,
        completed: completedCount.count ?? 0,
        rejected: rejectedCount.count ?? 0,
      },
    });
  } catch (error) {
    console.error('[Admin Rewards GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
