import { NextRequest, NextResponse } from 'next/server';
import { getRequestAccessProfile, hasModeratorAccess } from '@/lib/access';
import { createServiceClient } from '@/lib/supabase';
import type { AdminRewardReviewItem, RewardReviewStatus } from '@/types';

type ReviewStatusFilter = RewardReviewStatus | 'all';

type RewardReviewUserRelation = {
  id: string;
  username: string;
  phone: string | null;
  email: string | null;
  invite_code?: string | null;
  invited_by?: string | null;
  chezahub_user_id?: string | null;
  reward_points_available?: number | null;
  reward_points_pending?: number | null;
  reward_points_lifetime?: number | null;
};

type RewardReviewAdminRelation = {
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

function parseStatus(value: string | null): ReviewStatusFilter {
  if (
    value === 'open' ||
    value === 'reviewing' ||
    value === 'resolved' ||
    value === 'dismissed'
  ) {
    return value;
  }

  return 'all';
}

function toReviewItem(row: Record<string, unknown>): AdminRewardReviewItem {
  const user = firstRelation(
    row.user as RewardReviewUserRelation | RewardReviewUserRelation[] | null | undefined
  );
  const reviewer = firstRelation(
    row.reviewer as RewardReviewAdminRelation | RewardReviewAdminRelation[] | null | undefined
  );

  return {
    id: row.id as string,
    user_id: (row.user_id as string | null | undefined) ?? null,
    reason: row.reason as string,
    status: row.status as RewardReviewStatus,
    dedupe_key: (row.dedupe_key as string | null | undefined) ?? null,
    resolution_note: (row.resolution_note as string | null | undefined) ?? null,
    created_at: row.created_at as string,
    reviewed_at: (row.reviewed_at as string | null | undefined) ?? null,
    resolved_at: (row.resolved_at as string | null | undefined) ?? null,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null,
    user: user
      ? {
          id: user.id,
          username: user.username,
          phone: user.phone ?? null,
          email: user.email ?? null,
          invite_code: user.invite_code ?? null,
          invited_by: user.invited_by ?? null,
          chezahub_user_id: user.chezahub_user_id ?? null,
          reward_points_available: user.reward_points_available ?? 0,
          reward_points_pending: user.reward_points_pending ?? 0,
          reward_points_lifetime: user.reward_points_lifetime ?? 0,
        }
      : null,
    reviewer: reviewer
      ? {
          id: reviewer.id,
          username: reviewer.username,
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
    const reason = String(searchParams.get('reason') ?? '').trim();
    const search = safeSearch(searchParams.get('q'));
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '40'), 1), 100);
    const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);
    const fetchSize = search ? Math.min(offset + limit + 80, 250) : limit;
    const supabase = createServiceClient();

    let query = supabase
      .from('reward_review_queue')
      .select(
        'id, user_id, reason, status, dedupe_key, resolution_note, created_at, reviewed_at, resolved_at, metadata, user:user_id(id, username, phone, email, invite_code, invited_by, chezahub_user_id, reward_points_available, reward_points_pending, reward_points_lifetime), reviewer:reviewed_by(id, username)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (reason) {
      query = query.eq('reason', reason);
    }

    if (!search) {
      query = query.range(offset, offset + limit - 1);
    } else {
      query = query.limit(fetchSize);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('[Admin Rewards GET] Failed to fetch review queue:', error);
      return NextResponse.json({ error: 'Failed to fetch reward review items' }, { status: 500 });
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const items = rows.map(toReviewItem);
    const filteredItems = search
      ? items.filter((item) => {
          const metadataText = item.metadata ? JSON.stringify(item.metadata).toLowerCase() : '';
          const values = [
            item.reason,
            item.status,
            item.user?.username ?? '',
            item.user?.email ?? '',
            item.user?.phone ?? '',
            metadataText,
          ]
            .join(' ')
            .toLowerCase();

          return values.includes(search);
        })
      : items;

    const pagedItems = search ? filteredItems.slice(offset, offset + limit) : filteredItems;

    const [openCount, reviewingCount, resolvedCount, dismissedCount] = await Promise.all([
      supabase
        .from('reward_review_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabase
        .from('reward_review_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'reviewing'),
      supabase
        .from('reward_review_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolved'),
      supabase
        .from('reward_review_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'dismissed'),
    ]);

    return NextResponse.json({
      items: pagedItems,
      total: search ? filteredItems.length : count ?? filteredItems.length,
      counts: {
        open: openCount.count ?? 0,
        reviewing: reviewingCount.count ?? 0,
        resolved: resolvedCount.count ?? 0,
        dismissed: dismissedCount.count ?? 0,
      },
    });
  } catch (error) {
    console.error('[Admin Rewards GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
