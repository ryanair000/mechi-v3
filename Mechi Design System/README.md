# Mechi Design System

**Mechi** is a competitive gaming matchmaking platform based in Kenya, targeted at African esports players. Its tagline is **"Compete. Connect. Rise."** — the platform lets players enter ranked 1v1 queues or multiplayer lobbies, track ratings across games, and climb leaderboards.

- **Website / App:** mechi.club
- **Stack:** Next.js 16, React 19, Tailwind CSS v4, Supabase, Framer Motion, Lucide React, shadcn/ui
- **Codebase:** [ryanair000/mechi-v3](https://github.com/ryanair000/mechi-v3) (private, branch: `master`)
- **Brand images provided:** `uploads/` (color palette, logo shield, brand style sheet)

---

## Products

| Surface | Description |
|---|---|
| **Dashboard App** | Authenticated user area — dashboard, queue, matches, leaderboard, tournaments, lobbies, challenges, profile |
| **Landing Page** | Public marketing site at `/` with pricing, game showcase, countdown |
| **Admin Panel** | `/admin` — internal tooling |

---

## CONTENT FUNDAMENTALS

**Tone:** Confident, direct, energizing. The voice speaks *to* the player like a coach or teammate — never corporate or stuffy. Short punchy sentences. No filler.

**Perspective:** Second person "you" / "your". Commands and declarations: *"Command your climb."* *"Compete. Connect. Rise."*

**Casing:**
- UI labels: Title Case for nav items, section headers, button labels
- Section kicker chips: ALL CAPS with wide letter-spacing (0.14–0.18em)
- Body copy: Sentence case
- Brand wordmark: ALL CAPS with 0.18em tracking

**Copy style examples (from codebase):**
- Dashboard hero: *"Command your climb, {username}."*
- Queue joining: *"We'll keep searching and notify you the moment a match lands."*
- Error states: *"Set up your FIFA platform first. Mechi needs the right platform to place you in the correct matchmaking pool."*
- Empty states: *"When players enter your ranked queue lane, they will show up here…"*
- Section titles: *"Players Online Now"*, *"Ranked Games"*, *"Rank Overview"*

**Emoji:** Never used in UI. Brand essence icons are SVG/Lucide only.

**Numbers:** Live queue counts shown prominently. Ratings displayed as integers (e.g. "1450"). Win rates as percentages.

**Vibe:** Hype without hyperbole. Focused on skill, competition, and community — specifically the African gaming scene.

---

## VISUAL FOUNDATIONS

### Colors
| Token | Value | Usage |
|---|---|---|
| `--brand-teal` | `#32e0c4` | Primary CTA, active nav states, positive/live indicators, XP bars |
| `--brand-coral` | `#ff6b6b` | Buttons (btn-primary), danger/warning accents, streak counters |
| `--brand-night` | `#0b1121` | Page dark bg, button text on coral, night mode base |
| `--brand-neutral` | `#e2e8f0` | Light UI borders, backgrounds |
| `--page-bg` | `#f4f7fb` | Light mode page background |
| `--text-primary` | `#0b1121` (light) / `#f8fbfd` (dark) | Main text |
| `--text-secondary` | `#607086` / `#b9c4d2` | Supporting text |
| `--text-soft` | `#94a0b2` / `#7b879a` | Labels, placeholders |

### Typography
- **Display / Headings:** Montserrat (production: Aptos Display / Segoe UI) — weight 800–900
- **Body:** Open Sans (production: Aptos / Segoe UI) — weight 400–600
- **Wordmark:** Montserrat ExtraBold, ALL CAPS, tracking 0.18em

### Spacing & Radius
- `--radius-control`: `1rem` — buttons, inputs, small chips
- `--radius-panel`: `1.35rem` — nav panels, medium containers
- `--radius-card`: `1.7rem` — game cards, dashboard cards
- `--radius-hero`: `1.95rem` — hero feature panels

### Backgrounds
- Light mode: soft gradient from white → `#f4f7fb`, with subtle teal + blue radial glows at corners
- Body has a very faint 72px grid overlay (opacity ~0.34) using `mask-image` radial gradient — adds technical depth
- Cards use glassmorphic `backdrop-filter: blur(12–18px)` with linear gradient fill
- Dark mode: near-black navy `#0b1121` with teal + coral glows

### Cards
- Border: `1px solid var(--border-color)` (very subtle)
- Background: `linear-gradient(180deg, var(--surface-strong), var(--surface))`
- Box shadow: `var(--surface-highlight)` (inner top highlight) + `var(--shadow-soft)` (outer drop)
- Radius: `--radius-card` (1.7rem)
- Hover: teal border tint `rgba(50,224,196,0.22)` + `translateY(-1px)`
- Active/live cards: teal border + teal-tinted soft background

### Buttons
| Class | Style |
|---|---|
| `btn-primary` | Coral background (`#ff6b6b`), night text, coral shadow |
| `btn-ghost` | Teal-tinted border + background, teal text |
| `btn-danger` | Red-tinted border + background, red text |
| `btn-outline` | White bg, secondary text, border |

### Animations
- Default transition: `160ms ease` on bg, border, color, shadow, transform
- Theme toggle: `180ms ease`
- Card hover: `translateY(-1px)` lift
- Game card hover: `translateY(-4px)` + stronger shadow, cover image `scale(1.05)` over `500ms`
- Queue "Find Match" button: `translateY(-2px)` on hover
- Result emblem: `result-pop` keyframe — scale+fade in using `cubic-bezier(0.18, 0.84, 0.32, 1.18)`
- Pulse rings on result emblem: `result-ring` keyframe expanding outward
- No heavy entrance animations on dashboard — performance-first for mobile Africa

### Imagery
- **Game artwork:** SVG capsule + header art per game (stored in `game-artwork/`), displayed as full-bleed card headers with `bg-gradient-to-t from-black/84` protection overlay
- **Logo:** Shield motif with Mechi "M" glyph in teal + coral halves, lightning bolt crest, dark night outline
- Color vibe: vivid, saturated — teal/coral on dark backgrounds
- No photography in UI — SVG game art + gradient backgrounds only

### Hover / Press States
- Hover: slightly lighter bg, teal border accent, `translateY(-1px)` lift
- Press/active: `transform: none` (no extra shrink — stable feel)
- Disabled: `opacity: 0.42`, `cursor: not-allowed`
- Icon buttons: text-secondary → text-primary on hover

### Shadows
- Soft: `0 18px 40px rgba(15,23,42,0.06)` — default card shadow
- Strong: `0 28px 68px rgba(15,23,42,0.11)` — elevated panels on hover
- Inner highlight: `inset 0 1px 0 rgba(255,255,255,0.6)` — gives glass-top feel
- Teal glow: `0 16px 28px rgba(50,224,196,0.22)` — active nav + queue buttons

### Transparency & Blur
- Sidebar: `backdrop-blur-xl` — used on desktop sidebar and floating nav
- Cards: `backdrop-filter: blur(12px)` — glassmorphic depth
- Badges on game art: `backdrop-blur-sm` + white/88 background — legibility over images
- Disabled on mobile (`max-width: 639px`) for performance

### Layout
- Desktop: fixed left sidebar 17rem wide; main content offset `lg:pl-[17rem]`
- Mobile: bottom navigation bar
- Content: `max-w-6xl`, `px-4/6/8` responsive padding, `pb-16` (above bottom nav)
- Grids: 1-col → 2-col → 3-col responsive across breakpoints

---

## ICONOGRAPHY

**Library:** [Lucide React](https://lucide.dev/) (`lucide-react` v1.8.0+) — thin stroke style, `strokeWidth` 1.65 (default) / 2 (active states)

**Sizes used:**
- Nav icons: 18px
- Button icons: 12–14px
- Inline / badge icons: 12px
- Profile/action icons: 14–16px

**No emoji in UI.** Unicode not used as icons.

**Game artwork:** SVG files in `game-artwork/` — one `*-capsule.svg` (portrait) and `*-header.svg` (landscape banner) per supported game. These are NOT Lucide — they are custom game brand art.

**Logo:** `assets/mechi-logo-shield.png` — the primary shield mark. Used via `BrandLogo` component with `mechi-logo.png` (not in this repo; fetched from prod CDN). The BrandLogo component supports: `full`, `reversed`, `mono`, `symbol` variants across `xs/sm/md/lg` sizes.

**CDN fallback:** Lucide is available from CDN: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`

---

## Files in this Design System

```
README.md                    ← This file
SKILL.md                     ← Agent skill descriptor
colors_and_type.css          ← All CSS variables + type scale
assets/
  mechi-logo-shield.png      ← Shield logo mark
  mechi-brand-sheet.png      ← Full brand style sheet
  mechi-color-palette.png    ← Color swatches reference
game-artwork/
  <game>-capsule.svg         ← Portrait game art (31 games)
  <game>-header.svg          ← Landscape game header art
preview/
  01-brand-colors.html       ← Brand + semantic color swatches
  02-neutral-colors.html     ← Neutral / surface color scale
  03-type-display.html       ← Display / heading type specimen
  04-type-body.html          ← Body + label type specimen
  05-radius-shadow.html      ← Border radius + shadow tokens
  06-buttons.html            ← All button variants
  07-badges-chips.html       ← Badges, chips, kickers
  08-cards.html              ← Card variants
  09-inputs.html             ← Form inputs + labels
  10-nav-sidebar.html        ← Sidebar navigation specimen
  11-game-card.html          ← GameCard component
  12-logo.html               ← Logo variants
ui_kits/
  dashboard/
    index.html               ← Full dashboard UI kit (click-thru)
    Sidebar.jsx              ← Sidebar navigation component
    GameCard.jsx             ← Game card component
    DashboardPage.jsx        ← Main dashboard screen
    LeaderboardPage.jsx      ← Leaderboard screen
    ProfilePage.jsx          ← Profile screen
    TournamentsPage.jsx      ← Tournaments screen
```
