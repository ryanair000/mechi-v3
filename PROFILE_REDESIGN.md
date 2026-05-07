# Mechi V3 — Profile Page Redesign

## Context

Single file task. Only touch `src/app/(app)/profile/page.tsx` unless a helper is explicitly listed below. Do not create new API routes. All data comes from the existing `/api/users/profile` PATCH/GET — no new fetches.

Read these before starting:
- `src/app/(app)/profile/page.tsx` — current file, full source
- `src/app/globals.css` — utility classes: `card`, `btn-primary`, `btn-ghost`, `btn-danger`, `btn-outline`, `input`, `label`, `page-container`, `section-title`, `shimmer`
- `src/lib/config.ts` — `PLATFORMS`, `GAMES`, `REGIONS`, `getTier(elo)` → `{ name, color }`
- `src/components/ShareMenu.tsx` — already imported, keep as-is

---

## Problem

The profile page is bare. It has:
- A tiny 56px avatar with a letter initial, no visual weight
- No aggregate stats visible at a glance
- Game cards that look like data tables with zero personality
- A plain empty state (just text)
- Settings fields floating without grouping

---

## What to Build

### 1. Add a `GAME_EMOJIS` constant

At the top of the file, before the component, add:

```typescript
const GAME_EMOJIS: Record<string, string> = {
  efootball: '⚽', fc26: '🏆', mk11: '🥊', nba2k26: '🏀',
  tekken8: '👊', sf6: '🥋', cs2: '🎯', valorant: '⚡',
  mariokart: '🏎️', smashbros: '💥', rocketleague: '🚀',
};
```

### 2. Compute aggregate stats

After `bestTier` is derived (already in the file), add:

```typescript
const totalWins = userGames.reduce((sum, g) => sum + ((profile?.[`wins_${g}`] as number) ?? 0), 0);
const totalLosses = userGames.reduce((sum, g) => sum + ((profile?.[`losses_${g}`] as number) ?? 0), 0);
const totalMatches = totalWins + totalLosses;
const overallWinRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
```

### 3. Update loading skeleton

Replace the three identical shimmer divs with a skeleton that mirrors the new layout:

```tsx
<div className="page-container">
  <div className="max-w-2xl space-y-4">
    <div className="h-56 shimmer" />   {/* hero card */}
    <div className="h-12 shimmer" />   {/* tabs */}
    <div className="h-36 shimmer" />   {/* game card */}
    <div className="h-36 shimmer" />   {/* game card */}
  </div>
</div>
```

### 4. Replace the profile header card with a Hero Card

Replace the entire `{/* Profile header */}` card with the following. Keep all existing state, handlers, imports, and logic untouched — this is purely a visual replacement.

```tsx
{/* ── Profile Hero Card ── */}
<div className="card overflow-hidden mb-6">

  {/* Tier-tinted gradient banner — uses bestTier.color */}
  <div
    className="h-24 relative"
    style={{
      background: `linear-gradient(135deg, ${bestTier.color}22 0%, ${bestTier.color}08 60%, transparent 100%)`,
    }}
  >
    {/* Subtle dot-grid overlay for texture */}
    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  </div>

  <div className="px-5 pb-5">

    {/* Avatar row — sits half over the banner */}
    <div className="flex items-end justify-between -mt-8 mb-4">

      {/* Avatar with glowing tier ring */}
      <div className="relative">
        {/* Glow ring */}
        <div
          className="absolute -inset-[3px] rounded-[20px] opacity-40 blur-[2px]"
          style={{ background: bestTier.color }}
        />
        {/* Avatar box */}
        <div
          className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold border-[3px]"
          style={{
            background: bestTier.color + '20',
            color: bestTier.color,
            borderColor: '#030712',
          }}
        >
          {user?.username?.[0]?.toUpperCase() ?? '?'}
        </div>
      </div>

      {/* Share button */}
      {user?.username && (
        <ShareMenu
          text={profileShareText(user.username, bestTier.name, bestRating)}
          url={getProfileShareUrl(user.username)}
          title="My Mechi Profile"
          imageUrl={getProfileOgImageUrl(user.username)}
          imageFilename={`mechi-profile-${user.username}.png`}
          variant="inline"
        />
      )}
    </div>

    {/* Username + rank badge + region */}
    <div className="mb-4">
      <h1 className="text-xl font-bold text-white leading-tight">{user?.username}</h1>
      <div className="flex items-center flex-wrap gap-2 mt-2">
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ background: bestTier.color + '18', color: bestTier.color }}
        >
          {bestTier.name} · {bestRating} ELO
        </span>
        {profile?.region && (
          <span className="text-xs text-white/30">
            📍 {profile.region as string}
          </span>
        )}
      </div>
    </div>

    {/* Platform pills */}
    <div className="flex items-center flex-wrap gap-2 mb-5">
      {((profile?.platforms ?? []) as PlatformKey[]).length > 0 ? (
        ((profile?.platforms ?? []) as PlatformKey[]).map((p) => (
          <div
            key={p}
            className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1"
          >
            <span className="text-sm">{PLATFORMS[p]?.icon}</span>
            <span className="text-[11px] text-white/40 font-medium">{PLATFORMS[p]?.label}</span>
          </div>
        ))
      ) : (
        <button
          onClick={() => setTab('settings')}
          className="text-xs text-white/20 hover:text-emerald-400 transition-colors"
        >
          + Add platforms →
        </button>
      )}
    </div>

    {/* Aggregate stats — only shown when user has games */}
    {userGames.length > 0 && (
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-white/[0.05]">
        {[
          { value: totalWins,    label: 'Wins',     color: 'text-emerald-400' },
          { value: totalLosses,  label: 'Losses',   color: 'text-red-400' },
          { value: totalMatches > 0 ? `${overallWinRate}%` : '—', label: 'Win Rate', color: 'text-blue-400' },
          { value: userGames.length, label: 'Games', color: 'text-white/60' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-white/20 uppercase tracking-wide mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    )}

  </div>
</div>
```

---

### 5. Replace the empty state

Replace the plain text empty state inside the stats tab with:

```tsx
<div className="card p-10 text-center">
  <div className="text-5xl mb-4">🎮</div>
  <p className="text-white font-semibold mb-1">No games set up yet</p>
  <p className="text-white/25 text-sm mb-5 max-w-xs mx-auto">
    Add your platforms and pick up to 3 games to start climbing the ranks.
  </p>
  <button onClick={() => setTab('settings')} className="btn-primary">
    <Settings size={14} /> Set Up Profile
  </button>
</div>
```

---

### 6. Redesign per-game stat cards

Replace the existing game card JSX (the `div key={g} className="card p-5"` block) with:

```tsx
<div key={g} className="card p-5 relative overflow-hidden">

  {/* Large faded emoji — background decoration */}
  <div
    className="absolute right-3 top-1/2 -translate-y-1/2 text-8xl opacity-[0.05] select-none pointer-events-none leading-none"
    aria-hidden="true"
  >
    {GAME_EMOJIS[g] ?? '🎮'}
  </div>

  {/* Card header: game name + tier badge */}
  <div className="flex items-center justify-between mb-4 relative">
    <div className="flex items-center gap-2.5">
      <span className="text-xl">{GAME_EMOJIS[g] ?? '🎮'}</span>
      <p className="font-semibold text-white text-sm">{GAMES[g].label}</p>
    </div>
    <div
      className="text-xs font-semibold px-2.5 py-1 rounded-lg"
      style={{ background: tier.color + '15', color: tier.color }}
    >
      {tier.name}
    </div>
  </div>

  {/* Stats row */}
  <div className="grid grid-cols-4 gap-3 text-center relative">
    <div>
      <div className="text-lg font-bold text-white">{rating}</div>
      <div className="text-[10px] text-white/20 uppercase tracking-wide">ELO</div>
    </div>
    <div>
      <div className="text-lg font-bold text-emerald-400">{wins}</div>
      <div className="text-[10px] text-white/20 uppercase tracking-wide">Wins</div>
    </div>
    <div>
      <div className="text-lg font-bold text-red-400">{losses}</div>
      <div className="text-[10px] text-white/20 uppercase tracking-wide">Losses</div>
    </div>
    <div>
      <div className="text-lg font-bold text-blue-400">{wr}%</div>
      <div className="text-[10px] text-white/20 uppercase tracking-wide">W/R</div>
    </div>
  </div>

  {/* Win rate bar — coloured by tier */}
  {wins + losses > 0 ? (
    <div className="mt-4 relative">
      <div className="flex justify-between text-[10px] text-white/20 mb-1.5">
        <span>{wins} wins</span>
        <span>{losses} losses</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${wr}%`, background: tier.color }}
        />
      </div>
    </div>
  ) : (
    <p className="mt-3 text-[11px] text-white/15 flex items-center gap-1.5">
      <span>⚔️</span> No matches yet — join the queue to start!
    </p>
  )}

</div>
```

---

### 7. Reorganise the settings tab into grouped cards

Wrap each logical settings section in a `card p-5` for visual separation. Replace the entire settings tab content with:

```tsx
<div className="space-y-4">

  {/* Region */}
  <div className="card p-5">
    <label className="label">Region</label>
    <select value={region} onChange={(e) => setRegion(e.target.value)} className="input max-w-xs">
      {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
    </select>
  </div>

  {/* Platforms */}
  <div className="card p-5">
    <label className="label mb-3">Your Platforms</label>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
        const plat = PLATFORMS[key];
        const isSel = platforms.includes(key);
        return (
          <div key={key} className={`border rounded-xl overflow-hidden transition-colors ${
            isSel ? 'border-emerald-500/30 bg-emerald-500/[0.04]' : 'border-white/[0.06] bg-white/[0.02]'
          }`}>
            <button type="button" onClick={() => togglePlatform(key)} className="w-full flex items-center gap-3 p-3 text-left">
              <span className="text-xl">{plat.icon}</span>
              <span className="font-medium text-white flex-1 text-sm">{plat.label}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSel ? 'border-emerald-500 bg-emerald-500' : 'border-white/15'
              }`}>
                {isSel && <Check size={11} className="text-white" />}
              </div>
            </button>
            {isSel && (
              <div className="px-3 pb-3">
                <input
                  type="text"
                  value={gameIds[key] ?? ''}
                  placeholder={plat.placeholder}
                  onChange={(e) => setGameIds({ ...gameIds, [key]: e.target.value })}
                  className="input text-sm"
                />
                <p className="text-xs text-white/15 mt-1">{plat.idLabel}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>

  {/* Games */}
  {selectedGamesForPlatforms.length > 0 && (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <label className="label mb-0">Games to Play</label>
        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${
              i < selectedGames.length ? 'bg-emerald-500' : 'bg-white/10'
            }`} />
          ))}
        </div>
      </div>
      <p className="text-xs text-white/20 mb-3">Pick up to 3 games to compete in</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {selectedGamesForPlatforms.map((g) => {
          const isSel = selectedGames.includes(g);
          return (
            <button key={g} type="button" onClick={() => toggleGame(g)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                isSel
                  ? 'border-emerald-500/30 bg-emerald-500/[0.04]'
                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
              }`}>
              <span className="text-xl">{GAME_EMOJIS[g] ?? '🎮'}</span>
              <span className="font-medium text-white flex-1 text-sm">{GAMES[g].label}</span>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                isSel ? 'border-emerald-500 bg-emerald-500' : 'border-white/15'
              }`}>
                {isSel && <Check size={11} className="text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  )}

  {/* Save button */}
  <button onClick={handleSave} disabled={saving} className="w-full btn-primary">
    {saving
      ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
      : <><Check size={14} /> Save Changes</>
    }
  </button>

  {/* Account / danger zone */}
  <div>
    <p className="text-[10px] font-semibold text-white/15 uppercase tracking-widest mb-3 px-1">Account</p>
    <button onClick={logout} className="w-full btn-danger">
      <LogOut size={14} /> Sign Out
    </button>
  </div>

</div>
```

---

## Imports

Add `MapPin` and `Swords` to the existing lucide import line. Remove any icons that are no longer used after the refactor. Final import line should be:

```typescript
import { Settings, BarChart2, Check, Loader2, LogOut, MapPin, Swords } from 'lucide-react';
```

---

## Constraints

- Do NOT add any new `useState`, `useEffect`, or API calls — all data already exists in `profile` state
- Do NOT touch any handler functions (`togglePlatform`, `toggleGame`, `handleSave`)
- Do NOT modify `ShareMenu` usage — keep the existing props exactly
- All styling via Tailwind + inline `style` for dynamic tier colors only
- After changes, run `npm run build` and fix any TypeScript or ESLint errors
- The `max-w-2xl` constraint on the outer wrapper stays — do not widen the page
