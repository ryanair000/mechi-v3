# Leaderboard Page Redesign

## Task

Rewrite `src/app/(app)/leaderboard/page.tsx` to make the leaderboard visually exciting and educational for new users.

Do **NOT** touch:
- `src/app/api/users/leaderboard/[game]/route.ts`
- `src/lib/gamification.ts`
- `src/lib/config.ts`

---

## Context

This is a Next.js app (read `AGENTS.md` before writing any code). The leaderboard page is a `'use client'` component that:
- Fetches the user's profile games via `authFetch('/api/users/profile')`
- Fetches leaderboard entries via `authFetch('/api/users/leaderboard/${game}')`
- Renders a ranked list of up to 50 players

All existing data-fetching logic, state management, and interfaces must be preserved exactly. Only the JSX/visual layer changes.

### Key types and utilities already in scope

| Import | Source |
|--------|--------|
| `LeaderboardEntry` interface | defined in page file |
| `getRankDivision(rating)` → `{ tier, division, label, color }` | `@/lib/gamification` |
| `withAlpha(hex, alphaHex)` | `@/lib/gamification` |
| `TierMedal` | `@/components/TierMedal` |
| `ChallengePlayerButton` | `@/components/ChallengePlayerButton` |
| `useAuth`, `useAuthFetch` | `@/components/AuthProvider` |

### CSS variables available

```
--brand-coral
--brand-teal
--brand-night
--text-primary
--text-secondary
--text-soft
--surface
--surface-elevated
--border-color
```

### Utility classes available

```
card  circuit-panel  shimmer  page-container  section-title
brand-chip  brand-chip-coral  btn-outline  surface-live
brand-link-coral  no-scrollbar
```

### Rank tiers (from `gamification.ts` — use these exact values)

| Tier | Color | Rating range |
|------|-------|-------------|
| Bronze | `#CD7F32` | 0–1099 |
| Silver | `#C0C0C0` | 1100–1299 |
| Gold | `#FFD700` | 1300–1499 |
| Platinum | `#00CED1` | 1500–1699 |
| Diamond | `#60A5FA` | 1700–1899 |
| Legend | `#A855F7` | 1900+ |

---

## What to Build

### 1. Rank tier progression strip

Below the game picker and above the list, render a horizontal scrollable strip (or wrapped flex row on desktop) of all 6 tiers. Each tile:

- `<TierMedal>` icon or colored circle using the tier color
- Tier name in bold
- Rating range in small muted text (e.g. `1000–1299`)
- Border: `withAlpha(color, '28')`, background: `withAlpha(color, '0D')`
- If `selectedGame` has players at that tier, show a small count badge

This helps new users instantly understand the progression system.

---

### 2. Top-3 podium section

When `entries.length >= 1`, render a podium above the main list.

**Layout:**
- Desktop: 3-column flex row — center (#1) elevated with `mt-0`, sides (#2 left, #3 right) at `mt-8`
- Mobile: single column, stacked #1 → #2 → #3

**Each podium card:**
- Large avatar initial (`h-16 w-16` rounded-full), bg: `withAlpha(division.color, '20')`, text: `division.color`
- Crown icon (from `lucide-react`) on #1 only, colored `var(--brand-coral)`
- `<TierMedal rating={entry.rating} size="lg" />` for #1, `size="md"` for #2 and #3
- Division label in `division.color`
- Rating number (e.g. `1000`) in small muted text
- Wins / Win rate in a small stats row
- `ChallengePlayerButton` if `challengePlatform` is available (same logic as current list rows)
- Card border: `withAlpha(division.color, '28')`, background: `withAlpha(division.color, '08')`
- #1 glowing ring: `box-shadow: 0 0 0 2px ${withAlpha(division.color, '40')}`

Handle gracefully when only 1 or 2 players exist — render what's available, no empty placeholders.

---

### 3. Main ranked list (rank 4 onward)

Keep existing list logic, start from `index >= 3` since #1–3 are in the podium.

**Improvements:**

- **Rating column** — add the actual rating number between Division and Level on desktop:
  ```
  sm:grid-cols-[2.5rem_1fr_7rem_4rem_4rem_5rem_5rem_4.5rem_7.5rem]
  ```

- **Win rate bar** — replace the plain `%` text with a small inline progress bar:
  ```jsx
  <div className="flex items-center gap-1.5 justify-end">
    <div className="h-1 w-12 rounded-full bg-[var(--surface-elevated)] overflow-hidden">
      <div
        className="h-full rounded-full bg-[var(--brand-teal)]"
        style={{ width: `${winRate}%` }}
      />
    </div>
    <span>{winRate}%</span>
  </div>
  ```

- **Staggered entrance animation** — apply per row:
  ```jsx
  style={{ animationDelay: `${index * 30}ms` }}
  ```
  With a `animate-fade-in-up` class: `opacity-0 translate-y-1` → `opacity-100 translate-y-0` over 200ms. Define via Tailwind `@keyframes` or inline style if Tailwind config is unavailable.

- Keep `isMe` highlight (`surface-live`), Crown icon for #1, and `YOU` badge as-is.

---

### 4. "Season is live" banner

When `entries.length > 0` but **all** entries have `rating === 1000` (everyone at default), show this banner between the game picker and the tier strip:

```jsx
<div className="card mb-4 border-[rgba(255,107,107,0.18)] bg-[rgba(255,107,107,0.06)] px-4 py-3 flex items-center gap-3">
  <Flame size={16} className="text-[var(--brand-coral)] flex-shrink-0" />
  <div>
    <p className="text-sm font-semibold text-[var(--text-primary)]">
      Season just started — rankings are live
    </p>
    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
      Play your first match to start climbing. Every win moves you up.
    </p>
  </div>
</div>
```

Import `Flame` from `lucide-react`.

---

### 5. Header chip — dynamic player count

Replace the static top-right chip with:

```jsx
{entries.length > 0 && (
  <div className="brand-chip-coral px-2.5 py-1 text-[11px]">
    <Trophy size={11} />
    <span>{entries.length} ranked</span>
  </div>
)}
```

---

## Constraints

- Do not add search or filter functionality
- Do not add pagination — keep the existing 50-entry limit
- Do not change any API calls, data fetching, or state variables
- Do not add new package dependencies — use only what is already imported or in the project
- Keep all loading and empty states: shimmer skeletons, "no ranked games" empty state, "no players yet" empty state
- Keep the mobile layout functional — podium cards must stack on mobile, list rows must still show the condensed mobile view
- Keep `aria-pressed` on game picker buttons
- The tier strip and podium only render when `selectedGame` is set and not in a loading state
