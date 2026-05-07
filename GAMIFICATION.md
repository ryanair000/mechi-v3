# Mechi V3 — Gamification System Implementation

## Project Context

Mechi is a Next.js 16.2 (App Router, TypeScript, Tailwind CSS v4) gaming matchmaking platform for Kenyan Gen Z gamers. Backend is Supabase (Postgres + RLS disabled). All API routes use JWT auth via a custom `useAuthFetch` hook. The project is at the root of this repository.

Key files to understand before touching anything:

- `src/lib/config.ts` — GAMES, PLATFORMS, TIERS, getTier() helper
- `src/app/api/matches/[id]/report/route.ts` — where match results are finalized
- `src/app/(app)/dashboard/page.tsx` — main authenticated dashboard
- `src/app/(app)/profile/page.tsx` — user profile + stats
- `src/app/(app)/match/[id]/page.tsx` — live match page
- `src/app/s/[username]/page.tsx` — public share page
- `src/app/api/og/profile/route.tsx` — Edge OG image for profile
- `src/components/ShareMenu.tsx` — social share bottom sheet

> Do NOT modify any auth logic, matchmaking logic, or Supabase client setup.

---

## Part 1 — Supabase Migration

Create file: `supabase/migrations/20260414_gamification.sql`

```sql
-- XP, Level, Mechi Points, streak tracking on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS mp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_win_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_match_date date;

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS achievements_user_id_idx ON achievements(user_id);
```

---

## Part 2 — Gamification Config

Create file: `src/lib/gamification.ts`

### XP Rules

| Action | XP |
|---|---|
| Win a match | +120 |
| Lose a match | +40 |
| First match of the day | +60 bonus |
| Win streak 3+ | +30 extra per win |
| Achievement unlock | +200 (awarded once) |
| Invite friend who joins | +300 (stub only) |
| Share a match result | +50 (stub only) |

### MP Rules

| Action | MP |
|---|---|
| Win a match | +50 |
| Lose a match | +15 |
| Achievement unlock | +150 |
| Daily login bonus | +25 (stub only) |

### Level Curve

Level 1 starts at 0 total XP. XP required to reach level N = `500 * (N - 1) * N / 2`

| Level | Total XP needed |
|---|---|
| 2 | 500 |
| 3 | 1,500 |
| 4 | 3,000 |
| 5 | 5,000 |
| ... | ... |

Export three functions:

```typescript
// Returns the level a player is at given their total XP
export function getLevelFromXp(xp: number): number

// Returns total XP needed to reach a given level
export function getXpForLevel(level: number): number

// Returns total XP needed to reach the next level
export function getXpForNextLevel(level: number): number
```

### Rank Division System

ELO stays as the matchmaking value in the DB. Map ELO to a human-readable rank division for display. Never show raw ELO to users.

| ELO Range | Label |
|---|---|
| 0 – 999 | Bronze III |
| 1000 – 1049 | Bronze II |
| 1050 – 1099 | Bronze I |
| 1100 – 1149 | Silver III |
| 1150 – 1199 | Silver II |
| 1200 – 1299 | Silver I |
| 1300 – 1349 | Gold III |
| 1350 – 1399 | Gold II |
| 1400 – 1499 | Gold I |
| 1500 – 1549 | Platinum III |
| 1550 – 1599 | Platinum II |
| 1600 – 1699 | Platinum I |
| 1700 – 1749 | Diamond III |
| 1750 – 1799 | Diamond II |
| 1800 – 1899 | Diamond I |
| 1900+ | Legend |

Export:

```typescript
export function getRankDivision(elo: number): {
  tier: string;      // e.g. 'Gold'
  division: string;  // e.g. 'II' — empty string for Legend
  label: string;     // e.g. 'Gold II'
  color: string;     // hex color
}
```

Tier colors:

```
Bronze:   #CD7F32
Silver:   #C0C0C0
Gold:     #FFD700
Platinum: #00CED1
Diamond:  #60A5FA
Legend:   #A855F7
```

### Achievement Types

```typescript
interface AchievementDef {
  key: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  mpReward: number;
  check: (stats: PlayerStats) => boolean;
}

interface PlayerStats {
  totalWins: number;
  winStreak: number;
  gameWins: Record<string, number>;
  totalMatches: number;
  achievementsUnlocked: string[];
  eloAfterWin?: number; // only set for rank milestone checks
}
```

### Achievement Definitions

Export `ACHIEVEMENTS: AchievementDef[]` containing all of the following:

#### Wins (Global)

| Key | Title | Description | Emoji | XP | MP | Check |
|---|---|---|---|---|---|---|
| `first_blood` | First Blood | Win your first match | 🥇 | 200 | 150 | totalWins >= 1 |
| `dime` | Dime | Win 10 matches | 🔟 | 200 | 150 | totalWins >= 10 |
| `century` | Century | Win 100 matches | 💯 | 300 | 200 | totalWins >= 100 |
| `unstoppable` | Unstoppable | Win 500 matches | ⚡ | 500 | 300 | totalWins >= 500 |

#### Streaks

| Key | Title | Description | Emoji | XP | MP | Check |
|---|---|---|---|---|---|---|
| `hat_trick` | Hat Trick | Win 3 in a row | 🔥 | 200 | 150 | winStreak >= 3 |
| `inferno` | Inferno | Win 5 in a row | 🔥🔥 | 300 | 200 | winStreak >= 5 |
| `goated` | GOATed | Win 10 in a row | 🐐 | 500 | 300 | winStreak >= 10 |

#### Game-Specific (50 wins per game)

All game achievements: **300 XP · 200 MP**

| Key | Title | Description | Emoji | Game |
|---|---|---|---|---|
| `efootball_god` | eFootball God | Win 50 eFootball matches | ⚽ | efootball |
| `tekken_master` | Tekken Master | Win 50 Tekken 8 matches | 👊 | tekken8 |
| `buckets` | Buckets | Win 50 NBA 2K26 matches | 🏀 | nba2k26 |
| `street_legend` | Street Legend | Win 50 Street Fighter 6 matches | 🥋 | sf6 |
| `pitch_king` | Pitch King | Win 50 EA FC 26 matches | 🏆 | fc26 |
| `krypt_keeper` | Krypt Keeper | Win 50 MK11 matches | 🥊 | mk11 |

Check: `gameWins[game] >= 50`

#### Rank Milestones (checked via `eloAfterWin`)

| Key | Title | Description | Emoji | XP | MP | ELO threshold |
|---|---|---|---|---|---|---|
| `silver_certified` | Silver Certified | Reach Silver rank | 🥈 | 200 | 150 | >= 1100 |
| `gold_certified` | Gold Certified | Reach Gold rank | 🥇 | 300 | 200 | >= 1300 |
| `diamond_certified` | Diamond Certified | Reach Diamond rank | 💎 | 400 | 250 | >= 1700 |
| `legend` | Legend | Reach Legend rank | 🟣 | 500 | 300 | >= 1900 |

Check: `(stats.eloAfterWin ?? 0) >= threshold`

---

## Part 3 — Match Report API Update

File: `src/app/api/matches/[id]/report/route.ts`

After a match is finalized as `completed` (existing ELO logic already ran), add the following for **both players**:

### For each player:

1. Check if `last_match_date` differs from today's UTC date → `firstMatchToday: boolean`
2. Calculate XP:
   - **Winner:** `120 + (winStreak >= 3 ? 30 : 0) + (firstMatchToday ? 60 : 0)`
   - **Loser:** `40 + (firstMatchToday ? 60 : 0)`
3. Calculate MP:
   - **Winner:** `+50`
   - **Loser:** `+15`
4. Update streaks:
   - **Winner:** `win_streak + 1`, `max_win_streak = max(max_win_streak, new_win_streak)`
   - **Loser:** `win_streak = 0`
5. Compute new level: `getLevelFromXp(currentXp + earnedXp)`
6. Run DB update:

```sql
UPDATE profiles SET
  xp = xp + <earned_xp>,
  level = <new_level>,
  mp = mp + <earned_mp>,
  win_streak = <new_streak>,
  max_win_streak = <new_max_streak>,
  last_match_date = CURRENT_DATE
WHERE id = <player_id>
```

7. Run `checkAndAwardAchievements(userId, playerStats, supabase)`:
   - Build `PlayerStats` from current profile data (fetch wins_* columns, streaks, etc.)
   - For winner only: set `eloAfterWin` to the winner's new ELO for the played game
   - Fetch already-unlocked keys: `SELECT achievement_key FROM achievements WHERE user_id = ?`
   - For each `ACHIEVEMENTS` entry not already unlocked: if `check(stats)` returns true, insert into `achievements` and award bonus XP + MP via a second UPDATE

### API Response Addition

Return a `gamification` key for the requesting player only:

```json
{
  "gamification": {
    "xpEarned": 180,
    "mpEarned": 50,
    "newLevel": 12,
    "leveledUp": true,
    "newStreak": 3,
    "newAchievements": [
      {
        "key": "hat_trick",
        "title": "Hat Trick",
        "emoji": "🔥",
        "xpReward": 200,
        "mpReward": 150
      }
    ]
  }
}
```

---

## Part 4 — UI Updates

### 4a. Match Completed Card

File: `src/app/(app)/match/[id]/page.tsx`

Add state: `const [gamificationResult, setGamificationResult] = useState<GamificationResult | null>(null)`

Populate it when the report API response includes a `gamification` key.

In the completed section, below the existing Victory/Defeat heading, add:

```tsx
{gamificationResult && (
  <div className="mt-3 space-y-1.5">
    <p className="text-sm text-emerald-400 font-medium">+{gamificationResult.xpEarned} XP</p>
    <p className="text-sm text-amber-400 font-medium">+{gamificationResult.mpEarned} MP</p>
    {gamificationResult.leveledUp && (
      <div className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
        ⬆ Level {gamificationResult.newLevel}!
      </div>
    )}
    {gamificationResult.newStreak >= 3 && (
      <p className="text-sm text-orange-400 font-medium">
        🔥 {gamificationResult.newStreak}-win streak!
      </p>
    )}
    {gamificationResult.newAchievements.map((a) => (
      <div key={a.key} className="inline-flex items-center gap-1.5 bg-white/[0.04] text-white text-xs font-semibold px-3 py-1 rounded-full">
        {a.emoji} {a.title} unlocked!
      </div>
    ))}
  </div>
)}
```

Keep existing Play Again + Share buttons.

---

### 4b. Dashboard Header

File: `src/app/(app)/dashboard/page.tsx`

Replace the existing tier badge:

```tsx
// Before:
<div className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: tier.color + '15', color: tier.color }}>
  {tier.name} · {bestRating} ELO
</div>

// After:
const rankDiv = getRankDivision(bestRating);
const xpInCurrentLevel = (profile?.xp ?? 0) - getXpForLevel(profile?.level ?? 1);
const xpNeededForNextLevel = getXpForNextLevel(profile?.level ?? 1);
const xpProgressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));
```

```tsx
<div className="flex items-center gap-2">
  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold"
    style={{ background: rankDiv.color + '15', color: rankDiv.color }}>
    {rankDiv.label}
  </div>
  <div className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] text-white/50">
    Lv. {profile?.level ?? 1}
  </div>
</div>
<div className="w-full h-0.5 bg-white/[0.04] rounded-full mt-2">
  <div className="h-full bg-emerald-500 rounded-full transition-all"
    style={{ width: `${xpProgressPercent}%` }} />
</div>
<p className="text-[10px] text-white/20 mt-1">
  {xpInCurrentLevel} / {xpNeededForNextLevel} XP to Lv. {(profile?.level ?? 1) + 1}
</p>
```

---

### 4c. Profile Stats Tab

File: `src/app/(app)/profile/page.tsx`

At the top of the stats tab, before the per-game cards, insert a summary card:

```tsx
<div className="card p-5 mb-4">
  <div className="flex items-center justify-between mb-4">
    <div>
      <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1">Rank</p>
      <p className="text-lg font-bold" style={{ color: rankDiv.color }}>{rankDiv.label}</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1">Level</p>
      <p className="text-lg font-bold text-white">Lv. {profile?.level ?? 1}</p>
    </div>
    <div className="text-right">
      <p className="text-[10px] text-white/25 uppercase tracking-wide mb-1">Mechi Points</p>
      <p className="text-lg font-bold text-amber-400">{(profile?.mp ?? 0).toLocaleString()} MP</p>
    </div>
  </div>
  <div>
    <div className="flex justify-between text-[10px] text-white/20 mb-1">
      <span>{xpInCurrentLevel} XP</span>
      <span>{xpNeededForNextLevel} XP to Lv. {(profile?.level ?? 1) + 1}</span>
    </div>
    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
      <div className="h-full bg-emerald-500 rounded-full transition-all"
        style={{ width: `${xpProgressPercent}%` }} />
    </div>
  </div>
  {(profile?.win_streak ?? 0) >= 3 && (
    <p className="text-xs text-orange-400 font-medium mt-3">
      🔥 {profile?.win_streak}-win streak!
    </p>
  )}
</div>
```

After the per-game cards, add an Achievements section. Fetch from `/api/users/achievements` on mount (alongside `fetchProfile`). Store in state as `unlockedKeys: string[]`.

```tsx
<div className="mt-4">
  <p className="section-title mb-3">Achievements</p>
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {ACHIEVEMENTS.map((a) => {
      const unlocked = unlockedKeys.includes(a.key);
      return (
        <div key={a.key} className={`rounded-xl p-3 border transition-colors ${
          unlocked
            ? 'bg-white/[0.04] border-white/[0.08]'
            : 'bg-white/[0.02] border-white/[0.04] opacity-40'
        }`}>
          <span className="text-xl">{unlocked ? a.emoji : '🔒'}</span>
          <p className="text-xs font-semibold text-white mt-1.5">{a.title}</p>
          <p className="text-[10px] text-white/25 mt-0.5 leading-relaxed">{a.description}</p>
          {unlocked && (
            <p className="text-[10px] text-emerald-400 mt-1">+{a.xpReward} XP</p>
          )}
        </div>
      );
    })}
  </div>
</div>
```

---

### 4d. New API Route — User Achievements

Create: `src/app/api/users/achievements/route.ts`

Authenticated GET route. Returns:

```json
{ "achievements": ["first_blood", "hat_trick"] }
```

Query:

```sql
SELECT achievement_key FROM achievements WHERE user_id = <auth_user_id> ORDER BY unlocked_at ASC
```

---

### 4e. Leaderboard Update

File: `src/app/(app)/leaderboard/page.tsx`

Replace raw ELO display in table rows with `getRankDivision(elo).label`. Add a `Lv.{level}` column.

File: `src/app/api/users/leaderboard/[game]/route.ts`

Add `level` to the SELECT from profiles.

---

### 4f. Public Share Page

File: `src/app/s/[username]/page.tsx`

Update `getProfileData()` to also fetch `xp`, `level`, `mp`, and first 3 achievement keys:

```sql
SELECT achievement_key FROM achievements
WHERE user_id = (SELECT id FROM profiles WHERE username ILIKE $1)
ORDER BY unlocked_at ASC
LIMIT 3
```

Update display:
- Replace `{bestRating} ELO` with `getRankDivision(bestRating).label`
- Add `Lv. {profile.level}` below the username
- Show top 3 achievement emojis as pills if any are unlocked

Update `generateMetadata()` description to use rank division label instead of raw ELO.

---

### 4g. OG Image — Profile

File: `src/app/api/og/profile/route.tsx`

Update the tier badge JSX to show rank division label + level:

```
// Before: "{tier.name} · {bestRating} ELO"
// After:  "Gold II · Lv. 14"
```

Import `getRankDivision` from `@/lib/gamification`. This file uses Edge runtime — ensure `gamification.ts` has no Node-only imports.

---

## Part 5 — Profile API Update

File: `src/app/api/users/profile/route.ts` (GET handler)

Add to SELECT: `xp`, `level`, `mp`, `win_streak`, `max_win_streak`

---

## Part 6 — Type Updates

File: `src/types/index.ts` (or wherever the profile/user type is defined)

Add optional fields:

```typescript
xp?: number;
level?: number;
mp?: number;
win_streak?: number;
max_win_streak?: number;
```

---

## Implementation Rules

- Do NOT break any existing functionality — matchmaking, auth, lobbies, and dispute upload all stay untouched
- All new DB queries use `createServiceClient()` for server routes and `createClient()` for client components — both already set up in `src/lib/supabase.ts`
- Keep all new code as minimal additions — do not refactor working code unless it blocks the feature
- `src/lib/gamification.ts` must be importable in both Edge runtime (OG image routes) and Node runtime — no Node-only APIs (`fs`, `path`, etc.)
- Use TypeScript strictly — no `any` unless absolutely unavoidable
- Follow existing code style: Tailwind for all styling, Lucide icons, existing utility classes (`btn-primary`, `btn-ghost`, `card`, `section-title`, `page-container`, etc.)
- After all changes, run `npm run build` — fix every TypeScript and ESLint error before considering the task complete
