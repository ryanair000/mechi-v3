# Rewards System — Full Redesign Spec

Redesign the Mechi rewards system end-to-end.
This touches: DB schema additions, `src/lib/rewards.ts`, API routes, and two page files.
Do not touch the ChezaHub codebase — all integration changes are on the Mechi side.
Read `src/app/globals.css` for tokens before writing any styles.

---

## Why this exists

The current system has five problems:

1. **Catalog fragility.** `fetchChezahubRewardCatalog()` makes a live signed POST to ChezaHub on every `/rewards` page load. If ChezaHub is down, the entire catalog section breaks — even though the catalog changes at most weekly.

2. **Monolithic page.** `src/app/(app)/rewards/page.tsx` is ~720 lines mixing six concerns: balance display, ChezaHub linking, ways to earn, active codes, catalog, and activity log. It loads everything in parallel and fails loudly if any one thing is slow.

3. **Thin earn mechanics.** The current earn events are oriented around ChezaHub shopping (link, first order, referral buyer). A gamer who never touches ChezaHub has a ceiling of ~830 RP lifetime (link + profile + daily matches + streaks + share). That is not enough to motivate behavior.

4. **Hardcoded ways to earn.** `REWARD_WAYS_TO_EARN` is a `const` in `lib/rewards.ts`. Adding a new earn method requires a code deploy.

5. **Duplicate RP display.** The hero section shows Available / Pending / Lifetime / Referrals in four stat boxes. Then the ChezaHub panel immediately below repeats Available and Pending in two more boxes. Six number displays for three numbers.

---

## What changes and what stays

### Keep exactly as-is (do not touch)
- `apply_reward_event` Supabase RPC function signature
- `handleChezahubOrderEvent` logic — referral, reversal, abuse-review wiring is correct
- `createChezahubLinkToken`, `verifyChezahubLinkToken`, `buildChezahubLinkUrl` — link flow works
- `createSignedActionHeaders`, `hasValidSignedAction` — HMAC auth pattern is correct
- `processMatchRewardMilestones` — match reward trigger works
- `maybeAwardProfileCompletion`, `applyRewardEvent`, `rewardEventExists` utilities
- All existing API routes: `/api/rewards/summary`, `/api/rewards/redeem`, `/api/rewards/link/start`, `/api/rewards/catalog`, `/api/challenges/*`
- `src/types/rewards.ts` — extend only, do not remove existing types
- `src/components/ChallengesPanel.tsx` — untouched

### Change
- Add `ways_to_earn` DB table (admin-managed earn events)
- Add `reward_catalog_cache` DB table (decoupled catalog)
- Add new event types to `REWARD_RULES` and `getRewardEventTitle`
- Add new earn methods to `processMatchRewardMilestones` and new trigger functions
- Replace `REWARD_WAYS_TO_EARN` const with a DB fetch
- Split `src/app/(app)/rewards/page.tsx` into two files
- Add `src/app/(app)/rewards/catalog/page.tsx`

---

## 1. DB schema additions

Run these migrations. They add tables only — no drops, no column changes.

### `ways_to_earn` table

```sql
create table public.ways_to_earn (
  id           text primary key,                  -- e.g. 'first_match_of_day'
  title        text not null,
  description  text not null,
  rp_amount    integer not null,
  category     text not null default 'general',   -- 'general' | 'match' | 'social' | 'chezahub'
  frequency    text not null default 'once',      -- 'once' | 'daily' | 'weekly' | 'per_event'
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Seed with current hardcoded values + new events
insert into public.ways_to_earn (id, title, description, rp_amount, category, frequency, sort_order) values
  ('account_link',         'Link ChezaHub',                       'One-time bonus when you link your ChezaHub account.',          200,  'chezahub', 'once',      10),
  ('profile_completion',   'Complete your profile',               'Fill in username, phone, country, games, and game IDs.',        200,  'general',  'once',      20),
  ('first_match_of_day',   'Play your first match of the day',    '+30 RP once per calendar day.',                                  30,  'match',    'daily',     30),
  ('streak_three',         'Win 3 in a row',                      '+75 RP once per day when your streak hits 3.',                   75,  'match',    'daily',     40),
  ('streak_five',          'Win 5 in a row',                      '+150 RP once per week when your streak hits 5.',                150,  'match',    'weekly',    50),
  ('streak_ten',           'Win 10 in a row',                     '+400 RP once per week when your streak hits 10.',               400,  'match',    'weekly',    55),
  ('ranked_tier_up',       'Advance a rank tier',                 '+100 RP each time your rank tier increases (Bronze→Silver etc).', 100, 'match',   'per_event', 60),
  ('daily_login',          'Log in today',                        '+10 RP once per calendar day for any app visit.',                10,  'general',  'daily',     70),
  ('share_page_action',    'Share from your Share page',          '+25 RP once per day for a verified share action.',               25,  'social',   'daily',     80),
  ('invitee_starter',      'Join as an invited player',           '+500 RP after linking ChezaHub and finishing your first match.', 500, 'general',  'once',      90),
  ('referral_main',        'Refer a buyer',                       '+3,000 RP when your invite completes a ChezaHub order ≥ KES 2,000.', 3000, 'chezahub', 'per_event', 100),
  ('chezahub_first_order', 'Place your first ChezaHub order',     '+250 RP when you complete your first paid ChezaHub order.',     250,  'chezahub', 'once',      110);
```

Enable RLS, read-only for authenticated users:

```sql
alter table public.ways_to_earn enable row level security;
create policy "authenticated read" on public.ways_to_earn
  for select to authenticated using (active = true);
```

### `reward_catalog_cache` table

```sql
create table public.reward_catalog_cache (
  id                        text primary key,
  title                     text not null,
  description               text not null,
  reward_type               text not null,   -- 'discount_code' | 'reward_claim' | 'mechi_perk'
  points_cost               integer not null,
  phase                     text not null default 'live',
  active                    boolean not null default true,
  expires_in_hours          integer,
  discount_amount_kes       integer,
  max_order_coverage_percent integer,
  sku_name                  text,
  margin_class              text,
  source                    text not null default 'chezahub',  -- 'chezahub' | 'mechi_native'
  synced_at                 timestamptz,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.reward_catalog_cache enable row level security;
create policy "authenticated read" on public.reward_catalog_cache
  for select to authenticated using (active = true);
```

The `source = 'mechi_native'` rows are Mechi-only perks (see §3). The `source = 'chezahub'` rows are synced from ChezaHub's catalog.

---

## 2. New earn methods

### Constants to add to `REWARD_RULES` in `src/lib/rewards.ts`

```ts
export const REWARD_RULES = {
  // existing — do not change
  accountLink: 200,
  profileCompletion: 200,
  firstMatchOfDay: 30,
  streak3Daily: 75,
  streak5Weekly: 150,
  shareActionDaily: 25,
  inviteeStarter: 500,
  inviterMain: 3000,
  linkedFirstPaidOrder: 250,
  qualifiedReferralMinimumKes: 2000,
  maxOrderCoveragePercent: 25,

  // NEW
  streak10Weekly: 400,
  rankedTierUp: 100,
  dailyLogin: 10,
} as const;
```

### `getRewardEventTitle` additions

Add these cases to the switch in `getRewardEventTitle`:

```ts
case 'streak_ten_weekly':    return '10-win streak';
case 'ranked_tier_up':       return 'Rank tier advanced';
case 'daily_login':          return 'Daily login bonus';
```

### `processMatchRewardMilestones` additions

After the existing `streak_five` block, add:

```ts
// 10-win streak — once per week per player
if (params.winner.newStreak >= 10) {
  operations.push(
    applyRewardEvent(supabase, {
      userId: params.winner.id,
      eventKey: `reward:streak-ten:${params.winner.id}:${weekStamp}`,
      eventType: 'streak_ten_weekly',
      availableDelta: REWARD_RULES.streak10Weekly,
      lifetimeDelta: REWARD_RULES.streak10Weekly,
      source: 'mechi_match',
      relatedMatchId: params.matchId,
      metadata: { streak: params.winner.newStreak, week: weekStamp },
    })
  );
}
```

### New function: `maybeAwardRankedTierUp`

Add to `src/lib/rewards.ts`. Called by the rank-update API route when a player's tier increases.

```ts
export async function maybeAwardRankedTierUp(
  supabase: SupabaseClient,
  params: {
    userId: string;
    previousTier: string;
    newTier: string;
    stamp: string;           // ISO date stamp from getNairobiDateStamp()
  }
) {
  // One award per tier-per-user — not per day. The event_key encodes both.
  return applyRewardEvent(supabase, {
    userId: params.userId,
    eventKey: `reward:ranked-tier-up:${params.userId}:${params.newTier}`,
    eventType: 'ranked_tier_up',
    availableDelta: REWARD_RULES.rankedTierUp,
    lifetimeDelta: REWARD_RULES.rankedTierUp,
    source: 'mechi_rank',
    metadata: {
      previous_tier: params.previousTier,
      new_tier: params.newTier,
      stamp: params.stamp,
    },
  });
}
```

Wire this into the existing rank-update API route (wherever player tier changes are written to `profiles`). Call it after a successful tier change, wrapped in `.catch(() => null)` so it never blocks the rank update.

### New function: `maybeAwardDailyLogin`

```ts
export async function maybeAwardDailyLogin(
  supabase: SupabaseClient,
  userId: string
) {
  const stamp = getNairobiDateStamp();
  return applyRewardEvent(supabase, {
    userId,
    eventKey: `reward:daily-login:${userId}:${stamp}`,
    eventType: 'daily_login',
    availableDelta: REWARD_RULES.dailyLogin,
    lifetimeDelta: REWARD_RULES.dailyLogin,
    source: 'mechi_login',
    metadata: { stamp },
  });
}
```

Wire this into the `/api/auth/session` or profile-load route — wherever the app already runs on every authenticated page visit. Use `.catch(() => null)`. The `event_key` uniqueness guarantees idempotency: calling it 50 times per day does nothing after the first.

---

## 3. New reward types (native Mechi perks)

Seed these rows into `reward_catalog_cache` as `source = 'mechi_native'`. They do not require a ChezaHub code — redemption is handled by Mechi directly.

| id | title | reward_type | points_cost | description |
|---|---|---|---|---|
| `mechi_pro_7day` | 7-Day Pro Trial | `mechi_perk` | 800 | Unlock Pro features for 7 days. Applied instantly to your account. |
| `mechi_priority_queue` | Priority Matchmaking Pass | `mechi_perk` | 300 | Skip to the top of the matchmaking queue for 24 hours. |
| `mechi_badge_trailblazer` | Trailblazer Badge | `mechi_perk` | 500 | Permanent cosmetic badge on your public profile. Early adopter recognition. |
| `mechi_badge_centurion` | Centurion Badge | `mechi_perk` | 1500 | Permanent badge: 100+ matches played milestone marker. |

These require a new redemption handler in `/api/rewards/redeem`. When `reward_type === 'mechi_perk'`:

1. Deduct RP via `applyRewardEvent` with negative `availableDelta` (same as current discount flow)
2. For `mechi_pro_7day`: set `profiles.plan = 'pro'` and `profiles.plan_expires_at = now() + 7 days`. If user already has Pro/Elite, extend by 7 days instead.
3. For `mechi_priority_queue`: set `profiles.priority_queue_until = now() + 24 hours` (add this column if it does not exist).
4. For badge perks: upsert a row in a `profile_badges` table (add if needed: `user_id, badge_id, awarded_at`). The badge renders on the profile page.
5. Write to `reward_redemptions` with `status = 'claimed'` immediately — no ChezaHub code, no external call.

Do not call `issueChezahubRewardCode` for `mechi_native` rewards.

---

## 4. Catalog decoupling — replace live API call with cache

### New function in `src/lib/rewards.ts`: `getRewardCatalogFromCache`

```ts
export async function getRewardCatalogFromCache(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('reward_catalog_cache')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as RewardCatalogItem[];
}
```

### New function: `syncChezahubCatalogToCache`

```ts
export async function syncChezahubCatalogToCache(supabase: SupabaseClient) {
  const items = await fetchChezahubRewardCatalog();   // existing function — keep as-is
  const now = new Date().toISOString();

  // Upsert fetched items
  if (items.length > 0) {
    const rows = items.map((item) => ({
      ...item,
      source: 'chezahub',
      synced_at: now,
      updated_at: now,
    }));

    await supabase
      .from('reward_catalog_cache')
      .upsert(rows, { onConflict: 'id' });
  }

  // Deactivate ChezaHub items that are no longer in the response
  const fetchedIds = items.map((i) => i.id);
  if (fetchedIds.length > 0) {
    await supabase
      .from('reward_catalog_cache')
      .update({ active: false, updated_at: now })
      .eq('source', 'chezahub')
      .not('id', 'in', `(${fetchedIds.map((id) => `'${id}'`).join(',')})`);
  }

  return items.length;
}
```

### Update `/api/rewards/catalog` route

Replace the live `fetchChezahubRewardCatalog()` call with `getRewardCatalogFromCache(supabase)`.

Add a `?sync=1` query param handler (admin only, checked via service-role or a separate admin guard):

```ts
if (url.searchParams.get('sync') === '1' && isAdminRequest(request)) {
  await syncChezahubCatalogToCache(supabase);
}
const items = await getRewardCatalogFromCache(supabase);
```

This means:
- Normal page loads: fast Supabase query, no external HTTP call
- Catalog sync: admin hits `/api/rewards/catalog?sync=1` or a cron pings it

### `ways_to_earn` — replace hardcoded array with DB fetch

Update `getRewardSummaryForUser` in `src/lib/rewards.ts`:

Remove the line that returns `REWARD_WAYS_TO_EARN` (currently passed as `ways_to_earn` in the summary API). Replace with:

```ts
const { data: waysToEarnRows } = await supabase
  .from('ways_to_earn')
  .select('id, title, description, rp_amount, category, frequency')
  .eq('active', true)
  .order('sort_order', { ascending: true });

// In the returned summary:
ways_to_earn: waysToEarnRows ?? [],
```

Update `RewardSummary` type to match:

```ts
ways_to_earn: Array<{
  id: string;
  title: string;
  description: string;
  rp_amount: number;
  category: string;
  frequency: string;
}>;
```

---

## 5. Page split

Delete all JSX from `src/app/(app)/rewards/page.tsx` (keep the file, rewrite its content).
Create `src/app/(app)/rewards/catalog/page.tsx` (new file).

Both are `'use client'`.

---

## 6. Page 1: `/rewards` — Balance & Activity

**File:** `src/app/(app)/rewards/page.tsx`

Single concern: your RP balance, ChezaHub link status, ways to earn, and recent activity.

### Layout

```
page-container  max-w-[52rem]
├── PageHeader
├── ErrorBanner         (conditional)
└── Body
    ├── Skeleton        (loading)
    └── Content
        ├── BalanceRow          (Available + Pending + Lifetime — inline, no cards)
        ├── ChezaHubLinkBanner  (conditional — only when not linked)
        ├── WaysToEarn          (collapsible list, default collapsed if user has earned RP before)
        └── ActivityLog         (recent events — flat rows with dividers)
```

No catalog on this page. No stat boxes in cards. No "Next Page" promo card.

### Imports

```ts
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowRight, CheckCircle2, ChevronDown, Clock3, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardSummary } from '@/types/rewards';
```

No `Gift`, `Coins`, `ShieldCheck`, `Copy`, `ArrowUpRight` on this page — those move to catalog.

### State

```ts
const [summary, setSummary] = useState<RewardSummary | null>(null);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);
const [linkingAccount, setLinkingAccount] = useState(false);
const [earnExpanded, setEarnExpanded] = useState(false);
```

### Page header

```tsx
<div className="flex items-center justify-between gap-4 pb-5">
  <div className="flex items-center gap-3">
    <h1 className="text-xl font-black text-[var(--text-primary)]">Rewards</h1>
    {!loading && (summary?.balances.available ?? 0) > 0 && (
      <span className="brand-chip px-2.5 py-1">
        {summary!.balances.available.toLocaleString()} RP
      </span>
    )}
  </div>
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => void load({ silent: true })}
      disabled={loading || refreshing}
      className="icon-button h-9 w-9"
      aria-label="Refresh"
    >
      <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
    </button>
    <Link href="/rewards/catalog" className="btn-ghost text-sm">
      Redeem RP
      <ArrowRight size={13} />
    </Link>
  </div>
</div>
```

### BalanceRow

Not a card grid. Three numbers in a single `flex` row separated by dividers.

```tsx
function BalanceRow({ balances }: { balances: RewardSummary['balances'] }) {
  return (
    <div className="mb-6 flex divide-x divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)]">
      {[
        { label: 'Available', value: balances.available, note: 'Ready to redeem' },
        { label: 'Pending',   value: balances.pending,   note: 'Awaiting vesting' },
        { label: 'Lifetime',  value: balances.lifetime,  note: 'Total earned'     },
      ].map((item) => (
        <div key={item.label} className="flex-1 px-4 py-4 text-center">
          <p className="text-2xl font-black text-[var(--text-primary)]">
            {item.value.toLocaleString()}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">
            {item.label}
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">{item.note}</p>
        </div>
      ))}
    </div>
  );
}
```

### ChezaHubLinkBanner

Only shown when `!summary.linked`. Not a full card — a slim inline banner with a single CTA.

```tsx
{!summary.linked && (
  <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--accent-secondary)]/20 bg-[var(--accent-secondary)]/5 px-4 py-3">
    <p className="text-sm text-[var(--text-secondary)]">
      Link ChezaHub to unlock catalog redemptions and referral rewards.
    </p>
    <button
      type="button"
      onClick={() => void handleLink()}
      disabled={linkingAccount}
      className="btn-primary shrink-0 text-xs"
    >
      {linkingAccount ? 'Opening…' : 'Link now'}
    </button>
  </div>
)}
```

When `summary.linked`: show nothing (link status is visible on `/rewards/catalog`).

### WaysToEarn

Collapsible. Default: expanded when `summary.balances.lifetime === 0`, collapsed otherwise.

```tsx
function WaysToEarn({ items, expanded, onToggle }: {
  items: RewardSummary['ways_to_earn'];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2"
      >
        <span className="text-xs font-semibold text-[var(--text-soft)]">Ways to earn RP</span>
        <ChevronDown
          size={14}
          className={`text-[var(--text-soft)] transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-1 border-t border-[var(--border-color)]">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-4 py-3 ${
                i < items.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-0.5 text-xs text-[var(--text-soft)]">{item.description}</p>
              </div>
              <span className="brand-chip shrink-0 px-2 py-0.5 text-[10px]">
                +{item.rp_amount} RP
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### ActivityLog

```tsx
function ActivityLog({ events }: { events: RewardSummary['recent_activity'] }) {
  if (events.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-[var(--text-soft)]">No reward activity yet.</p>
        <Link
          href="/rewards/catalog"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-secondary-text)] hover:text-[var(--text-primary)]"
        >
          Browse the catalog
          <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-soft)]">Recent activity</span>
      </div>
      <div className="border-t border-[var(--border-color)]">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] py-3 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{event.title}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                {new Date(event.created_at).toLocaleString('en-KE', {
                  day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
                })}
              </p>
            </div>
            <div className="text-right">
              {event.available_delta !== 0 && (
                <p className={`text-sm font-black ${event.available_delta > 0 ? 'text-[var(--accent-secondary-text)]' : 'text-red-400'}`}>
                  {event.available_delta > 0 ? '+' : ''}{event.available_delta.toLocaleString()}
                </p>
              )}
              {event.pending_delta !== 0 && (
                <p className="text-[11px] text-[var(--text-soft)]">
                  {event.pending_delta > 0 ? '+' : ''}{event.pending_delta.toLocaleString()} pending
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Skeleton for `/rewards`

Three rows matching balance + activity layout:

```tsx
function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="h-24 w-full rounded-2xl shimmer" />
      <div className="h-4 w-32 rounded shimmer" />
      {[0, 1, 2, 4].map((n) => (
        <div key={n} className="flex items-center gap-3 border-b border-[var(--border-color)] py-3 last:border-0">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-44 rounded shimmer" />
            <div className="h-3 w-24 rounded shimmer" />
          </div>
          <div className="h-4 w-12 rounded shimmer" />
        </div>
      ))}
    </div>
  );
}
```

### Data fetch

```ts
const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
  silent ? setRefreshing(true) : setLoading(true);
  setLoadError(null);
  try {
    const res = await authFetch('/api/rewards/summary');
    const data = (await res.json()) as { error?: string; summary?: RewardSummary; ways_to_earn?: RewardSummary['ways_to_earn'] };
    if (!res.ok || !data.summary) {
      setLoadError(data.error ?? 'Could not load rewards.');
      return;
    }
    setSummary({ ...data.summary, ways_to_earn: data.ways_to_earn ?? [] });
  } catch {
    setLoadError('Could not load rewards.');
  } finally {
    silent ? setRefreshing(false) : setLoading(false);
  }
}, [authFetch]);
```

The `chezahub_link` query-param success handler stays identical to the current page.

### Page container

```tsx
<div className="page-container max-w-[52rem]">
```

---

## 7. Page 2: `/rewards/catalog` — Catalog & Redemption

**File:** `src/app/(app)/rewards/catalog/page.tsx`

Single concern: browse the catalog, see active codes, redeem.

### Layout

```
page-container  max-w-[52rem]
├── PageHeader
├── ErrorBanner         (conditional)
└── Body
    ├── Skeleton
    └── Content
        ├── AccountStatus       (ChezaHub link + available RP — compact, one row)
        ├── ActiveCodes         (conditional — only when codes exist)
        └── CatalogList
            ├── Section: "ChezaHub rewards"  (source === 'chezahub')
            └── Section: "Mechi perks"        (source === 'mechi_native')
```

### Imports

```ts
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Clock3, Copy, RefreshCw } from 'lucide-react';
import { useAuthFetch } from '@/components/AuthProvider';
import type { RewardCatalogItem, RewardSummary } from '@/types/rewards';
```

### State

```ts
const [summary, setSummary] = useState<RewardSummary | null>(null);
const [catalog, setCatalog] = useState<RewardCatalogItem[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [catalogError, setCatalogError] = useState<string | null>(null);
const [redeemingId, setRedeemingId] = useState<string | null>(null);
const [linkingAccount, setLinkingAccount] = useState(false);
```

Load both in parallel using `Promise.allSettled` — same pattern as current page. Catalog error is non-fatal (shows a banner, balance still visible).

### Page header

```tsx
<div className="flex items-center justify-between gap-4 pb-5">
  <div className="flex items-center gap-3">
    <Link href="/rewards" className="icon-button h-9 w-9" aria-label="Back to rewards">
      <ArrowLeft size={14} />
    </Link>
    <h1 className="text-xl font-black text-[var(--text-primary)]">Redeem RP</h1>
  </div>
  <button
    type="button"
    onClick={() => void load({ silent: true })}
    disabled={loading || refreshing}
    className="icon-button h-9 w-9"
    aria-label="Refresh"
  >
    <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
  </button>
</div>
```

### AccountStatus

One row. Shows link state + available balance.

```tsx
function AccountStatus({
  linked,
  available,
  onLink,
  linking,
}: {
  linked: boolean;
  available: number;
  onLink: () => void;
  linking: boolean;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-4 py-3">
      <div className="flex items-center gap-3">
        {linked ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <CheckCircle2 size={12} />
            ChezaHub linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <Clock3 size={12} />
            ChezaHub not linked
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-black text-[var(--text-primary)]">
          {available.toLocaleString()} RP
        </span>
        {!linked && (
          <button
            type="button"
            onClick={onLink}
            disabled={linking}
            className="btn-primary text-xs"
          >
            {linking ? 'Opening…' : 'Link'}
          </button>
        )}
      </div>
    </div>
  );
}
```

### ActiveCodes

Same as current page but flat rows, not cards inside a card.

```tsx
function ActiveCodes({
  codes,
  onCopy,
}: {
  codes: RewardSummary['active_codes'];
  onCopy: (code: string) => void;
}) {
  if (codes.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-soft)]">Active codes</span>
        <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
          {codes.length}
        </span>
      </div>
      <div className="border-t border-[var(--border-color)]">
        {codes.map((code) => (
          <div
            key={code.id}
            className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{code.title}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-soft)]">
                Expires {code.expires_at
                  ? new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(code.expires_at))
                  : 'No expiry'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {code.code && (
                <code className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-1.5 text-sm font-black text-[var(--text-primary)]">
                  {code.code}
                </code>
              )}
              {code.code && (
                <button
                  type="button"
                  onClick={() => onCopy(code.code!)}
                  className="icon-button h-8 w-8"
                  aria-label="Copy code"
                >
                  <Copy size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### CatalogRow

One row per catalog item. No card wrapping. Flat divider list, same pattern as ChallengesPanel.

```tsx
function CatalogRow({
  item,
  canAfford,
  linked,
  redeeming,
  onRedeem,
}: {
  item: RewardCatalogItem;
  canAfford: boolean;
  linked: boolean;
  redeeming: boolean;
  onRedeem: () => void;
}) {
  const needsLink = item.source !== 'mechi_native' && !linked;
  const disabled = redeeming || needsLink || !canAfford;

  return (
    <div className="flex flex-col gap-3 border-b border-[var(--border-color)] py-4 last:border-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
          <span className="brand-chip px-2 py-0.5 text-[10px]">
            {item.points_cost.toLocaleString()} RP
          </span>
          {item.reward_type === 'mechi_perk' && (
            <span className="brand-chip-coral px-2 py-0.5 text-[10px]">Mechi perk</span>
          )}
        </div>
        <p className="mt-1 text-xs text-[var(--text-soft)]">{item.description}</p>
        {typeof item.discount_amount_kes === 'number' && (
          <p className="mt-1 text-[11px] text-[var(--text-soft)]">
            KES {item.discount_amount_kes.toLocaleString()} off
            {typeof item.max_order_coverage_percent === 'number'
              ? ` · max ${item.max_order_coverage_percent}% of basket`
              : ''}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onRedeem}
          disabled={disabled}
          className={canAfford && !needsLink ? 'btn-primary min-h-8 px-3 py-1.5 text-xs' : 'btn-ghost min-h-8 px-3 py-1.5 text-xs'}
        >
          {redeeming
            ? 'Redeeming…'
            : needsLink
              ? 'Link first'
              : !canAfford
                ? 'Not enough RP'
                : 'Redeem'}
        </button>
        {item.source === 'chezahub' && (
          <a
            href={item.reward_type === 'reward_claim'
              ? (process.env.NEXT_PUBLIC_CHEZAHUB_REDEEM_URL || 'https://redeem.chezahub.co.ke')
              : (process.env.NEXT_PUBLIC_CHEZAHUB_BASE_URL || 'https://chezahub.co.ke')}
            target="_blank"
            rel="noreferrer"
            className="icon-button h-8 w-8"
            aria-label="Open ChezaHub"
          >
            <ArrowUpRight size={13} />
          </a>
        )}
      </div>
    </div>
  );
}
```

### CatalogList

Split into two sections by `source`. Each section: `SectionLabel` + divider list. Reuse `SectionLabel` component (copy the exact definition from the challenges page).

```tsx
const chezahubItems = catalog.filter((i) => i.source !== 'mechi_native');
const mechItems     = catalog.filter((i) => i.source === 'mechi_native');

<div className="space-y-8">
  {chezahubItems.length > 0 && (
    <div>
      <SectionLabel label="ChezaHub rewards" count={chezahubItems.length} />
      <div className="border-t border-[var(--border-color)]">
        {chezahubItems.map((item) => (
          <CatalogRow key={item.id} ... />
        ))}
      </div>
    </div>
  )}

  {mechItems.length > 0 && (
    <div>
      <SectionLabel label="Mechi perks" count={mechItems.length} />
      <div className="border-t border-[var(--border-color)]">
        {mechItems.map((item) => (
          <CatalogRow key={item.id} ... />
        ))}
      </div>
    </div>
  )}

  {catalog.length === 0 && !loading && (
    <div className="py-14 text-center">
      <p className="text-sm text-[var(--text-soft)]">No rewards available right now.</p>
    </div>
  )}
</div>
```

### Redemption handler

```ts
const handleRedeem = async (rewardId: string) => {
  setRedeemingId(rewardId);
  try {
    const res = await authFetch('/api/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({ reward_id: rewardId }),
    });
    const data = (await res.json()) as {
      error?: string;
      redemption?: { code?: string | null; title: string };
    };
    if (!res.ok || !data.redemption) {
      toast.error(data.error ?? 'Could not redeem this reward.');
      return;
    }
    if (data.redemption.code) {
      await navigator.clipboard.writeText(data.redemption.code).catch(() => null);
      toast.success(`${data.redemption.title} — code copied.`);
    } else {
      toast.success(`${data.redemption.title} applied.`);
    }
    void load({ silent: true });
  } catch {
    toast.error('Network error.');
  } finally {
    setRedeemingId(null);
  }
};
```

### Page container

```tsx
<div className="page-container max-w-[52rem]">
```

---

## 8. RewardCatalogItem type — extend for `source`

In `src/types/rewards.ts`, add `source` to the `RewardCatalogItem` interface:

```ts
export interface RewardCatalogItem {
  id: string;
  title: string;
  description: string;
  reward_type: 'discount_code' | 'reward_claim' | 'mechi_perk';
  points_cost: number;
  phase: string;
  active: boolean;
  expires_in_hours?: number | null;
  discount_amount_kes?: number | null;
  max_order_coverage_percent?: number | null;
  sku_name?: string | null;
  margin_class?: string | null;
  source?: 'chezahub' | 'mechi_native';   // NEW — optional for back-compat
}
```

---

## 9. What NOT to include on either page

| Element | Why |
|---|---|
| `circuit-panel` hero card | Marketing container on a utility page |
| h1 "Keep RP, ChezaHub linking..." | Filler headline |
| Description paragraphs under every section h2 | Users on the rewards page know what RP is |
| Four stat boxes (Available / Pending / Lifetime / Referrals) | Replaced by `BalanceRow` inline numbers |
| "NEXT PAGE" promo card linking to `/share` | Share is already in the sidebar |
| `<p className="section-title">` kicker on every section | Overused teal label |
| "Open share" button in the rewards header | Wrong CTA for this page |
| Repeated Available + Pending numbers in ChezaHub panel | Already shown in `BalanceRow` |
| `REWARD_WAYS_TO_EARN` const (remove after seeding DB) | Replaced by `ways_to_earn` table |
| Live `fetchChezahubRewardCatalog()` call on every page load | Replaced by cache table |

---

## 10. Verification checklist

After implementing:

**Schema**
- [ ] `ways_to_earn` table exists with seed data
- [ ] `reward_catalog_cache` table exists with seeded Mechi-native perks
- [ ] Both tables have RLS: authenticated read for `active = true` rows only

**Earn methods**
- [ ] `REWARD_RULES.streak10Weekly` and `REWARD_RULES.dailyLogin` and `REWARD_RULES.rankedTierUp` exist
- [ ] 10-win streak block fires in `processMatchRewardMilestones` with correct weekly event_key
- [ ] `maybeAwardRankedTierUp` exported from `src/lib/rewards.ts`
- [ ] `maybeAwardDailyLogin` exported from `src/lib/rewards.ts`
- [ ] `getRewardEventTitle` handles: `streak_ten_weekly`, `ranked_tier_up`, `daily_login`

**Catalog decoupling**
- [ ] `/api/rewards/catalog` hits `reward_catalog_cache` table, not live ChezaHub API
- [ ] `syncChezahubCatalogToCache` exported from `src/lib/rewards.ts`
- [ ] `getRewardCatalogFromCache` exported from `src/lib/rewards.ts`
- [ ] `ways_to_earn` rows returned from `/api/rewards/summary`, not `REWARD_WAYS_TO_EARN` const

**Redemption**
- [ ] `/api/rewards/redeem` handles `mechi_perk` reward_type without calling `issueChezahubRewardCode`
- [ ] `mechi_pro_7day`: sets `profiles.plan = 'pro'` and extends `plan_expires_at`
- [ ] Badge perks: upsert `profile_badges` row
- [ ] `mechi_native` redemptions write `reward_redemptions` with `status = 'claimed'` immediately

**Pages**
- [ ] `/rewards` page: no catalog, no stat boxes in cards, no hero section
- [ ] `/rewards` page: `BalanceRow` shows 3 numbers inline (no individual cards)
- [ ] `/rewards` page: ChezaHub link banner only shown when `!summary.linked`
- [ ] `/rewards` page: `WaysToEarn` collapsed by default if user has lifetime RP > 0
- [ ] `/rewards` page: `ActivityLog` shows positive deltas in teal, negative in red
- [ ] `/rewards/catalog` page: has back arrow to `/rewards`
- [ ] `/rewards/catalog` page: `AccountStatus` row — one row, not a card grid
- [ ] `/rewards/catalog` page: catalog split into "ChezaHub rewards" and "Mechi perks" sections
- [ ] `/rewards/catalog` page: `CatalogRow` flat, not a card-inside-a-card
- [ ] `/rewards/catalog` page: `ActiveCodes` only rendered when `codes.length > 0`
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors
- [ ] `src/components/ChallengesPanel.tsx` untouched
