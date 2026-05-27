# Android Navigation, Breadcrumbs, and Toast Plan

Date: 2026-05-27

## Current Review

- The Android app uses Expo Router with a hidden root stack and a custom bottom dock for the five main tabs: Home, Arena, Matches, Blog, and Profile.
- Top-level tab navigation is clear, but nested screens do not show location context. Tournament details, game details, profile tools, notification settings, legal/support, proof upload, and history pages rely on the device back gesture only.
- The shared `Screen` component already gives every page a consistent shell, so breadcrumbs should be added there instead of hand-building them per screen.
- Toasts exist, but they are concentrated around auth and tournament mutations. Many rows, toggles, static cards, and external-link actions still feel silent or unfinished.
- Several screens expose routes as placeholders without enough interaction feedback: challenges, leaderboard, results, match history, payments, settings, support, teams, and notifications.
- The auth callback screen still mentions provider sign-in, which conflicts with the current login requirement: email, phone, or Mechi username only.
- The app has good route coverage for the current product, but there are practical missing routes for the UI users naturally expect from existing cards: room details, check-in readiness, account security, language/preferences, support alias, and not-found recovery.

## Implementation Plan

1. Central UI shell
   - Add a shared breadcrumb component to `production-ui.tsx`.
   - Extend `Screen` with breadcrumb props so every screen gets the same navigation pattern.
   - Keep breadcrumbs compact for Android: `Home > Area > Current`, with tappable parent crumbs and a small back affordance on nested pages.
   - Keep the bottom dock unchanged so the main app navigation stays familiar.

2. Toast system
   - Keep the existing toast provider, but make it globally useful across page actions.
   - Add toast feedback to toggles, filters, external links, placeholder actions, settings actions, sign out, upload selection, payment verification, and route transitions where the action would otherwise feel dead.
   - Avoid noisy page-load spam. Toasts should confirm actions and state changes, not announce every render.

3. Screen wiring
   - Add breadcrumbs to all tab screens, auth screens, tournament screens, profile tools, notification pages, legal/support, game detail, blog detail, and utility screens.
   - Add missing route screens:
     - `/rooms` for room status and room-readiness navigation.
     - `/check-in` for match-day readiness.
     - `/settings/security` for password/session safety.
     - `/settings/language` for region/language preferences.
     - `/support` as a direct support alias.
     - `+not-found` for broken/deep links.
   - Wire existing cards to these routes where appropriate instead of leaving them as static rows.

4. Stale auth cleanup
   - Update `auth-callback.tsx` so it no longer references Google/Facebook/provider login.
   - Leave backend social helpers alone unless a separate API cleanup is requested, because removing backend client functions could affect older deep links or server compatibility.

5. Verification
   - Run TypeScript: `npm --prefix apps/android run typecheck`.
   - Run Expo project validation: `npx expo-doctor` from `apps/android`.
   - Static-check route targets with `rg` and inspect any failing imports.
   - If a connected phone is available during this turn, install/test with the existing USB script. If no device is detected, report that clearly and keep the code verified locally.

## Acceptance Checklist

- Every app screen rendered through the shared shell has breadcrumbs.
- Main tab navigation still works and stays visually stable.
- Nested routes have a visible path back to their parent area.
- All interactive rows/buttons/toggles provide user feedback or navigation.
- Stale provider-login copy is removed.
- New expected utility routes exist and are reachable.
- TypeScript passes.
- Expo validation is run and results are reported.
