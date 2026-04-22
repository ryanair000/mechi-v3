# Challenges Page — Minimalist Redesign

Rewrite `src/app/(app)/challenges/page.tsx` from scratch.
Do not touch `src/components/ChallengesPanel.tsx` — it is still used in the notifications page.
Do not change any API routes, data fetching logic, or types.
Read `src/app/globals.css` for available CSS classes and design tokens before writing styles.

---

## What exists today (delete all of this)

The current page has four problems:

1. **Marketing h1 on a utility page.** `"Every direct callout, one page."` is copy that belongs on the landing page. A logged-in user navigating from the sidebar already knows where they are.

2. **Three stat boxes showing 0/0/0.** Incoming / Sent / Live stat cards are redundant — the list below immediately shows the same information. They add a full section of chrome for no new data.

3. **"How it works" sidebar card.** A user with an active Mechi account does not need inline documentation on what Accept/Decline/Cancel do. It is filler.

4. **"Next Move" sidebar card.** Leaderboard and share links are already reachable from the sidebar nav. Duplicating them here is noise.

The result: on an empty state (0 challenges), the page shows a hero card, three stat boxes, a card with an empty-state message, and two info cards — for zero items of actual content.

---

## Data layer — keep exactly as-is

Keep all state, fetching, and action logic. The only changes are structural/visual.

```
GET  /api/challenges              → { inbound: MatchChallenge[], outbound: MatchChallenge[] }
POST /api/challenges/[id]/accept  → { match_id?: string }
POST /api/challenges/[id]/decline → {}
POST /api/challenges/[id]/cancel  → {}
```

Types from `@/types`:
```ts
interface MatchChallenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  game: GameKey;
  platform: PlatformKey;
  status: MatchChallengeStatus;  // 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
  message?: string | null;
  match_id?: string | null;
  expires_at: string;
  responded_at?: string | null;
  created_at: string;
  challenger?: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'plan'> | null;
  opponent?: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'plan'> | null;
}
```

Imports to keep:
- `useCallback`, `useEffect`, `useState` from react
- `useRouter` from next/navigation
- `toast` from react-hot-toast
- `useAuthFetch` from `@/components/AuthProvider`
- `emitNotificationRefresh` from `@/components/NotificationNavButton`
- `GAMES`, `PLATFORMS` from `@/lib/config`
- `Link` from next/link

---

## New page structure

Single file, `'use client'`. All helper components live inside the same file — do not create new component files.

### Layout

```
page-container  (max-w-xl, not max-w-6xl — constrained single column)
├── PageHeader
├── ErrorBanner          (conditional)
└── Body
    ├── Skeleton          (loading state)
    ├── EmptyState        (no challenges)
    └── ChallengeList
        ├── Section: "Incoming"  (inbound.length > 0)
        │   ├── SectionLabel
        │   └── InboundRow × N
        └── Section: "Sent"     (outbound.length > 0)
            ├── SectionLabel
            └── OutboundRow × N
```

No cards wrapping the list. No sidebar. No two-column grid.

---

## Helper components (define above the page export)

### `Initial({ name })`

Avatar fallback showing the first letter of a username.

```tsx
function Initial({ name }: { name: string }) {
  return (
    <span className="avatar-shell flex h-8 w-8 shrink-0 items-center justify-center text-xs font-black">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
```

### `SectionLabel({ label, count })`

Plain label with pill count. Not a card. Not all-caps tracked text — normal-weight, small, soft color.

```tsx
function SectionLabel({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center gap-2">
      <span className="text-xs font-semibold text-[var(--text-soft)]">{label}</span>
      <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-soft)]">
        {count}
      </span>
    </div>
  );
}
```

### `InboundRow({ challenge, actionId, onAction })`

A flat row with a bottom divider. No card border. On mobile stacks vertically; on sm+ goes horizontal.

Row anatomy (left to right on sm+):
```
[Initial]  [name "challenged you"] [game chip] [platform chip] [timestamp]    [Accept] [Decline]
```

- Name is `font-semibold text-[var(--text-primary)]`, "challenged you" appended as `font-normal text-[var(--text-secondary)]`
- Game: `brand-chip` at `text-[10px]`
- Platform: `brand-chip-coral` at `text-[10px]`
- Timestamp: `text-[11px] text-[var(--text-soft)]` using `formatTime(challenge.created_at)`
- If `challenge.message` exists: render it as `text-xs italic text-[var(--text-secondary)]` with `"` wrapping, on its own line below the chips
- Accept: `btn-primary min-h-8 px-3 py-1.5 text-xs` — label `"Accept"` / `"Accepting…"` while pending
- Decline: `btn-danger min-h-8 px-3 py-1.5 text-xs` — label `"Decline"` / `"Declining…"` while pending
- Both disabled while `actionId === \`${challenge.id}:accept\`` or `actionId === \`${challenge.id}:decline\``

Divider: `border-b border-[var(--border-color)]` on the row, `last:border-0` to remove the last one.

### `OutboundRow({ challenge, actionId, onAction })`

Same flat row pattern as InboundRow.

Row anatomy:
```
[Initial]  ["Waiting on" name] [game chip] [platform chip] [Clock3 icon "Expires timestamp"]    [Cancel]
```

- "Waiting on" is `font-normal text-[var(--text-secondary)]`, name is `font-semibold text-[var(--text-primary)]`
- Expiry: `inline-flex items-center gap-1 text-[11px] text-[var(--text-soft)]` with `<Clock3 size={10} />` then `"Expires " + formatTime(challenge.expires_at)`
- Cancel: `btn-outline min-h-8 px-3 py-1.5 text-xs` with `<X size={12} />` — label `"Cancel"` / `"Cancelling…"` while pending
- Disabled when `actionId === \`${challenge.id}:cancel\``

### `Skeleton()`

Three placeholder rows matching the row height. No shimmer cards.

```tsx
function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      {[0, 1, 2].map((n) => (
        <div key={n} className="flex items-center gap-3 py-3 border-b border-[var(--border-color)] last:border-0">
          <div className="h-8 w-8 shrink-0 rounded-2xl shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 rounded shimmer" />
            <div className="h-3 w-28 rounded shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### `formatTime(iso: string)`

```ts
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
```

---

## Page header

No h1 marketing copy. No description paragraph. Just the page title + live count + action buttons in one tight row.

```tsx
<div className="flex items-center justify-between gap-4 pb-5">
  <div className="flex items-center gap-3">
    <h1 className="text-xl font-black text-[var(--text-primary)]">Challenges</h1>
    {/* Only show count when loaded and > 0 */}
    {!loading && total > 0 && (
      <span className="brand-chip px-2.5 py-1">{total} live</span>
    )}
  </div>
  <div className="flex items-center gap-2">
    {/* Refresh: icon-only button, no text label */}
    <button
      type="button"
      onClick={() => void loadChallenges({ silent: true })}
      disabled={loading || refreshing}
      className="icon-button h-9 w-9"
      aria-label="Refresh challenges"
    >
      <RefreshCw size={14} className={refreshing ? 'animate-spin' : undefined} />
    </button>
    {/* Find opponent: small ghost link */}
    <Link href="/leaderboard" className="btn-ghost text-sm">
      Find opponent
      <ArrowRight size={13} />
    </Link>
  </div>
</div>
```

No "Open inbox" button here. The notifications link is in the sidebar. Do not add it to the page header.

---

## Error banner

Inline, no card. Fits in a single row.

```tsx
{loadError && (
  <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
    <span>{loadError}</span>
    <button
      type="button"
      onClick={() => void loadChallenges()}
      className="shrink-0 text-xs font-semibold underline underline-offset-2"
    >
      Retry
    </button>
  </div>
)}
```

---

## Empty state

No boxed container. Just text + a link. Centered, generous vertical padding.

```tsx
<div className="py-14 text-center">
  <p className="text-sm text-[var(--text-soft)]">No pending challenges.</p>
  <Link
    href="/leaderboard"
    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent-secondary-text)] hover:text-[var(--text-primary)]"
  >
    Find someone to challenge
    <ArrowRight size={13} />
  </Link>
</div>
```

---

## Challenge list

Two sections, separated by `space-y-8`. Each section: label + `border-t` then rows.

```tsx
<div className="space-y-8">
  {inbound.length > 0 && (
    <div>
      <SectionLabel label="Incoming" count={inbound.length} />
      <div className="border-t border-[var(--border-color)]">
        {inbound.map((c) => (
          <InboundRow key={c.id} challenge={c} actionId={actionId} onAction={handleAction} />
        ))}
      </div>
    </div>
  )}
  {outbound.length > 0 && (
    <div>
      <SectionLabel label="Sent" count={outbound.length} />
      <div className="border-t border-[var(--border-color)]">
        {outbound.map((c) => (
          <OutboundRow key={c.id} challenge={c} actionId={actionId} onAction={handleAction} />
        ))}
      </div>
    </div>
  )}
</div>
```

---

## Page container

Use `page-container` but constrain to a narrower max-width. Challenges are action items that need fast scanning — a wide two-column layout works against that.

```tsx
<div className="page-container" style={{ maxWidth: '42rem' }}>
```

Or use Tailwind: `className="page-container max-w-[42rem]"` — check which Tailwind version supports arbitrary max-w before using. If not, set it via inline style.

---

## Icons used

Only import what is needed:

```ts
import { ArrowRight, Clock3, RefreshCw, X } from 'lucide-react';
```

Do not import: `BellRing`, `ShieldCheck`, `Swords`, `TimerReset` — all from the old stat boxes.

---

## State

Exact same as current page. No changes:

```ts
const [inbound, setInbound] = useState<MatchChallenge[]>([]);
const [outbound, setOutbound] = useState<MatchChallenge[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [loadError, setLoadError] = useState<string | null>(null);
const [actionId, setActionId] = useState<string | null>(null);
```

`handleAction` logic is identical to the current `handleChallengeAction` — just rename for clarity.
`loadChallenges` is identical — keep the `{ silent }` pattern.

`const total = inbound.length + outbound.length;`
`const isEmpty = !loading && !loadError && total === 0;`

---

## What NOT to include

| Element | Why |
|---|---|
| `<section className="card circuit-panel ...">` hero wrapper | Marketing container on a utility page |
| h1 "Every direct callout, one page." | Copy, not a page title |
| Description paragraph under h1 | Users know what challenges are |
| Three stat boxes (Incoming / Sent / Live) | Duplicate of the list count |
| `<ChallengesPanel>` import | Replaced by inline rows |
| "HOW IT WORKS" card | Inline docs on a utility page |
| "NEXT MOVE" card with Leaderboard + Share buttons | Links already in sidebar nav |
| "Open inbox" button in header | Wrong CTA for this page |
| `import { BellRing, ShieldCheck, Swords, TimerReset }` | Icons only used by deleted sections |
| Two-column `xl:grid-cols-2` layout | No sidebar content to justify it |
| `section-title` teal kicker labels | Overused pattern, not needed here |

---

## Verification checklist

After implementing:

- [ ] Page loads without TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors
- [ ] Empty state shows a single sentence and a leaderboard link — no boxes, no paragraphs
- [ ] Loading state shows 3 skeleton rows matching the row height
- [ ] Inbound row: Accept and Decline buttons disable together while either action is pending
- [ ] Outbound row: Cancel button disables while cancelling
- [ ] Accepting a challenge toasts success and navigates to `/match/[id]`
- [ ] Declining toasts "Challenge declined" and refreshes
- [ ] Cancelling toasts "Challenge cancelled" and refreshes
- [ ] `emitNotificationRefresh()` is called on every successful action
- [ ] Refresh icon spins while `refreshing === true`
- [ ] Page is constrained to ~42rem max-width
- [ ] `ChallengesPanel` in `src/components/ChallengesPanel.tsx` is untouched
- [ ] No stat boxes, no sidebar cards, no hero section in the output
