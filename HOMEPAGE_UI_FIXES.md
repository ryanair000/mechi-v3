# Homepage UI/UX Fix Spec

Refactor the Mechi V3 landing page for clarity, breathing room, and reduced visual noise.
Do not change copy, routing, data fetching, or functionality. CSS-only and JSX structure changes only.
Read `src/app/globals.css` for available design tokens before writing any inline styles.

---

## 1. Hero — collapse mobile right-panel nesting

**File:** `src/app/page.tsx` lines 263–310

**Problem:** On mobile the "Quick read" right-panel drops below the CTAs as a third content block.
Inside it: a rounded card → 2×2 stats grid (each stat its own rounded card) → another rounded card for platforms.
Three nesting levels of containers for supplementary info.

**Fix:**

- Wrap the entire right-panel `<div>` in `className="hidden lg:block ..."` so it only renders on desktop.
- Below the CTA buttons and launch chips, add a mobile-only flat stats row (no outer card wrapper):

```tsx
{/* Mobile-only flat stats — replaces the hidden right panel */}
<div className="mt-6 grid grid-cols-2 gap-2 lg:hidden">
  {HERO_STATS.map((item) => (
    <div key={item.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] px-3 py-3">
      <div className="text-lg font-black text-[var(--text-primary)] sm:text-2xl">{item.value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-soft)]">{item.label}</div>
      {'note' in item ? (
        <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-teal)]">{item.note}</div>
      ) : null}
    </div>
  ))}
</div>
```

- Remove the standalone "Platforms live" card from mobile entirely. Platform support is visible in game detail pages.
- Keep the full right panel as-is for `lg:` and above.

---

## 2. Pricing features — replace boxed pills with a clean list

**File:** `src/app/page.tsx` lines 380–389

**Problem:** Each feature is wrapped in `rounded-xl border bg-[var(--surface)] px-3 py-2` creating a form-like grid of identical bordered rectangles.

**Fix:** Replace the grid of bordered boxes with a simple list:

```tsx
<ul className="mt-5 space-y-2">
  {config.features.slice(0, 4).map((feature) => (
    <li
      key={feature}
      className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]"
    >
      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-secondary)]" />
      {feature}
    </li>
  ))}
</ul>
```

The teal dot gives visual rhythm without adding another bordered box.

---

## 3. Section header — drop teal kicker on low-priority sections

**File:** `src/app/page.tsx`

**Problem:** The `<p className="section-title">` kicker + `<h2>` + description paragraph triple-decker pattern repeats identically on every section (How it works, Games, Pricing, Ranks, Ready to jump in, Tier ladder). The teal kicker loses all meaning.

**Fix:** Keep the kicker only on sections where it adds orientation value. Remove the `<p className="section-title">` line from:

- The "Ready to jump in" CTA section (line 476) — the heading is self-evident
- The `Gallery4` component's `title` prop already renders an `<h2>` — do not add a kicker above it

Keep kickers on: **How it works**, **Pricing**, **Ranks**, and the tier ladder card (it's inside a card, different context).

---

## 4. Feature cards — remove fake "CLEAN FLOW →" CTA

**File:** `src/components/feature-shader-cards.tsx` lines 189–191

**Problem:** An arrow + label styled like a link but rendered as a non-interactive `div`. Users will click it. It goes nowhere.

**Fix:** Delete this block entirely from every card:

```tsx
// DELETE THIS:
<div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/88">
  <span>Clean flow</span>
  <ArrowRight size={14} />
</div>
```

Also remove the `ArrowRight` import from lucide if it is no longer used after deletion.

---

## 5. Platform chips — fix orphaned last chip on mobile

**File:** `src/app/page.tsx` lines 297–307

**Problem:** Five chips in a `flex flex-wrap` container produce a 2/2/1 layout where "Mobile" hangs alone.

**Fix:** Add `justify-center` to the flex container so chips center-align when wrapping:

```tsx
<div className="mt-3 flex flex-wrap justify-center gap-2">
```

This produces a cleaner 2/2/1 visually, or naturally 3/2 depending on chip widths.

---

## 6. "Ready to jump in" CTA card — increase vertical padding

**File:** `src/app/page.tsx` lines 474–496

**Problem:** The CTA card feels vertically compressed and lacks emphasis.

**Fix:** Update padding from `p-6 sm:p-7` to `p-8 sm:p-10 lg:p-12`:

```tsx
<div className="card circuit-panel p-8 sm:p-10 lg:p-12 lg:flex lg:items-center lg:justify-between lg:gap-8">
```

Also increase the heading size slightly — change `sm:text-[2.2rem]` to `sm:text-[2.5rem]` for this section's `<h2>` to match its importance as a closing CTA.

---

## 7. Rank guide — collapse 3 cards into a list

**File:** `src/app/page.tsx` lines 424–430

**Problem:** Three separate `rounded-2xl border bg-[var(--surface-soft)] p-4` cards for what are effectively three bullet points. Unnecessary box fragmentation.

**Fix:** Replace the three-card `space-y-3` block with a single card containing an internal divider list:

```tsx
<div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-soft)] divide-y divide-[var(--border-color)]">
  {RANK_GUIDE.map((item) => (
    <div key={item.title} className="p-4">
      <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
      <p className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{item.copy}</p>
    </div>
  ))}
</div>
```

One container, internal dividers, same information. Less box noise.

---

## 8. Gallery — switch internal nav to `landing-shell`, fix `<a>` → `<Link>`

**File:** `src/components/ui/gallery4.tsx`

**Problem A (layout):** The section header uses `container mx-auto px-4 sm:px-6 lg:px-8` while every other landing section uses `landing-shell`. The max-widths differ, causing misaligned heading vs. cards.

**Fix A:** Replace the outer `<div className="container mx-auto px-4 sm:px-6 lg:px-8">` wrapping the title/arrows block with:

```tsx
<div className="landing-shell">
```

Keep the carousel itself in `<div className="w-full px-4 sm:px-6 lg:px-8">` (it deliberately bleeds edge-to-edge).

**Problem B (routing):** Line 158 uses `<a href={item.href}>` for internal links (`/games`).

**Fix B:** Import `Link` from `next/link` and replace:

```tsx
// Before:
<a href={item.href} className="group rounded-xl">

// After:
<Link href={item.href} className="group rounded-xl">
```

Add closing `</Link>` to match. Also remove the now-unused `/* eslint-disable @next/next/no-img-element */` comment if img usage is acceptable here, or keep it — do not change the img element itself.

**Problem C (disabled buttons):** Lines 123 and 134 have `disabled:pointer-events-auto` which is contradictory on a `<button disabled>`.

**Fix C:** Remove `disabled:pointer-events-auto` from both arrow button `className` strings. Replace with `disabled:opacity-40 disabled:cursor-not-allowed`.

**Problem D (dead demo data):** Lines 29–75 define a `data` const with shadcn/Tailwind/Astro/React/Next.js placeholder content that never renders (the homepage always passes `items` prop) but ships in the bundle.

**Fix D:** Delete the entire `const data = [...]` block (lines 29–75). Change the prop default:

```tsx
// Before:
items = data,

// After:
items = [],
```

---

## 9. KSH → KES — fix currency inconsistency

**File:** `src/app/page.tsx` line 370

**Problem:** Pricing card renders `KSH ${config.monthlyKes}` but every other instance on the page uses `KES`.

**Fix:**

```tsx
// Before:
{config.monthlyKes === 0 ? 'FREE' : `KSH ${config.monthlyKes}`}

// After:
{config.monthlyKes === 0 ? 'FREE' : `KES ${config.monthlyKes}`}
```

---

## 10. Section breathing room — increase `landing-section` vertical padding

**File:** `src/app/globals.css` line 487

**Problem:** `py-10 sm:py-12 lg:py-14` gives sections ~40px top/bottom on mobile. With the dense content in each section this feels compressed.

**Fix:**

```css
/* Before: */
.landing-section {
  @apply border-t py-10 sm:py-12 lg:py-14;

/* After: */
.landing-section {
  @apply border-t py-14 sm:py-16 lg:py-20;
```

---

## 11. Countdown section — remove `!border-transparent` hack, add tinted background

**File:** `src/components/LandingCountdownSection.tsx` line 81

**Problem:** `card !border-transparent` uses `!important` to override the `.card` base border. The countdown section visually blends into the page with no distinction.

**Fix:** Remove the `.card` class entirely from this element and give it a distinct tinted background to break the monotony of the all-dark page:

```tsx
// Before:
<div className="card !border-transparent overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-12">

// After:
<div className="overflow-hidden rounded-[var(--radius-card)] border border-[rgba(50,224,196,0.14)] bg-[rgba(50,224,196,0.04)] px-6 py-10 sm:px-8 sm:py-14 lg:px-12">
```

The subtle teal-tinted background differentiates this section from the plain dark sections above it without being aggressive.

---

## 12. Feature card icons — add `aria-hidden`

**File:** `src/components/feature-shader-cards.tsx` line 172

**Problem:** Lucide icons render SVGs with no semantic label. As decorative elements they should be hidden from assistive technology.

**Fix:**

```tsx
// Before:
<Icon size={24} strokeWidth={2.1} />

// After:
<Icon size={24} strokeWidth={2.1} aria-hidden="true" />
```

---

## 13. Gallery arrow buttons — add `aria-label`

**File:** `src/components/ui/gallery4.tsx` lines 116–137

**Problem:** The `<Button>` components wrapping `<ArrowLeft>` and `<ArrowRight>` have no accessible label.

**Fix:**

```tsx
// Prev button — add:
aria-label="Previous slide"

// Next button — add:
aria-label="Next slide"
```

---

## Verification checklist

After making all changes, confirm:

- [ ] Mobile hero no longer shows the nested Quick read → stats → platforms triple-box stack
- [ ] Pricing feature lists show as bullet points, not bordered boxes
- [ ] "CLEAN FLOW →" is gone from all four feature cards
- [ ] Platform chips center-align when wrapping on mobile
- [ ] Pricing cards show "KES 299" not "KSH 299"
- [ ] Rank guide is a single card with internal dividers
- [ ] Gallery uses `<Link>` for navigation and `landing-shell` for the header
- [ ] Gallery demo `data` array is removed
- [ ] Countdown section has a tinted teal background and no `!important` border override
- [ ] Section padding is visibly more generous on all breakpoints
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint errors
