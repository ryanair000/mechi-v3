# Mechi UI UX HCI Review Plan

## Goal

Make Mechi feel faster, calmer, more minimal, and easier to understand on first use.

The current product already has stronger brand direction than before, but it still feels visually large. The issue is not only color or typography. It comes from the combination of oversized cards, repeated section structures, large radii, heavy shadows, generous vertical spacing, and too many competing focal points on the homepage and auth flows.

## Core Review Summary

- The homepage is trying to explain too much before the user takes the first action.
- Component scale is too large across the system, especially cards, hero typography, section padding, pills, and auth marketing panels.
- The visual rhythm is too repetitive: card after card after card creates fatigue and makes the product feel heavier than it should.
- The auth experience is still too marketing-heavy for task-first entry.
- The signed-in product is more usable than the homepage, but it still inherits oversized containers and spacing patterns.
- HCI-wise, the product should reduce cognitive load, shorten decision distance, improve scannability, and make primary actions obvious without visual shouting.

## Design Principles

- One primary action per screen.
- Less vertical stacking before value is understood.
- Smaller components by default, larger components only when they earn attention.
- Strong hierarchy through contrast and spacing, not through size alone.
- Faster recognition, less reading.
- Fewer simultaneous choices, especially on first visit.
- Mobile-first density tuning, not desktop-sized blocks scaled down.

## Phase 1: Audit And Sizing System Reset

- Reduce the global size baseline for cards, pills, buttons, chips, and section wrappers.
- Introduce a compact spacing scale for marketing pages and a separate product spacing scale for signed-in screens.
- Shrink default card radius and shadow intensity so the UI feels lighter.
- Define size tiers for `hero`, `section`, `card`, `chip`, `button`, and `form`.
- Audit every reusable component for visual weight before touching page layouts.

## Phase 2: Homepage Information Architecture

- Rebuild the homepage around one clear job: explain what Mechi does and move the user to sign up or sign in.
- Cut the number of major homepage sections.
- Merge overlapping sections such as brand essence, features, games, and rank education where possible.
- Keep the hero, one proof section, one “how it works” section, one trust/fair-play section, and one CTA close.
- Move secondary content below the main conversion path or remove it entirely.
- Reduce above-the-fold competition between hero text, stats, right-side card, nav links, logo block, and CTA cluster.

## Phase 3: Homepage Visual Scale Reduction

- Reduce hero heading size and tighten the max text width.
- Remove one of the two hero focal objects: either the oversized logo block or the oversized live pulse card.
- Shrink hero stat cards and reduce their count.
- Decrease section vertical padding and card padding across the landing page.
- Replace repeated full-card grids with lighter list, row, or split layouts to avoid visual sameness.
- Make chips and badges more supportive than dominant.

## Phase 4: Auth And Onboarding Simplification

- Make login primarily task-focused, with less marketing weight and faster eye-path to the form.
- Keep the brand panel optional or lighter on large screens, and remove it entirely on smaller screens.
- Reduce registration cognitive load by making each step feel shorter and more focused.
- Shorten copy per step and add clearer progress feedback.
- Tighten platform and game cards so more choices fit without feeling overwhelming.
- Improve first-time comprehension through stronger progressive disclosure.

## Phase 5: Signed-In Product Density And Clarity

- Reduce dashboard card size so more useful information appears without scrolling.
- Normalize card heights and reduce decorative surfaces that do not improve decision-making.
- Make queue, profile, leaderboard, and lobbies more scan-friendly through smaller metrics and tighter grouping.
- Prioritize primary actions visually and demote secondary actions.
- Improve table/list style density where competitive data is more important than decoration.
- Ensure empty states are short, direct, and action-oriented.

## Phase 6: HCI Improvements

- Apply Hick’s Law: reduce simultaneous visible choices on first-load screens.
- Apply Fitts’s Law: keep primary buttons easy to hit, but not oversized enough to dominate the whole layout.
- Improve recognition over recall by making system states visually consistent.
- Strengthen information scent so users always know what happens next after queue, lobby, report, or signup actions.
- Reduce interaction cost in forms by simplifying labels, helper text, and option grouping.
- Improve accessibility and scan speed through tighter hierarchy, more consistent alignment, and better contrast discipline.

## Phase 7: Responsive And Mobile Pass

- Re-evaluate every homepage block at mobile width instead of only scaling desktop patterns down.
- Reduce stacked card depth on mobile.
- Prefer single-column flows with shorter sections and smaller paddings.
- Keep CTA visibility high without repeating the same call-to-action too many times.
- Ensure hero content fits in a cleaner first viewport on common phones.

## Phase 8: Validation And Iteration

- Run a second UI review after the sizing reset and homepage restructure.
- Test first-time tasks: understand product, sign up, sign in, queue, open lobby, share profile.
- Measure success by lower scroll fatigue, faster task start, cleaner scan paths, and less “everything is big” feedback.
- Compare desktop and mobile before finalizing the system.

## Immediate Execution Order

1. Reset global sizing tokens and shared component scale.
2. Simplify homepage structure and remove one hero focal object.
3. Reduce landing-page section count and card repetition.
4. Simplify login and registration layouts.
5. Tighten signed-in dashboard and profile density.
6. Run responsive and accessibility review.

## Success Criteria

- Homepage feels understandable within one screen and one scroll.
- Users can identify the main action in under three seconds.
- Components feel intentional, not oversized.
- Auth screens feel faster and less promotional.
- Signed-in screens show more useful information with less visual weight.
- The product feels minimalistic without losing Mechi’s competitive identity.
