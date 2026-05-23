# PlayMechi Weekend Cup Season 1 Implementation Notes

## Scope

- Keep the current live `/playmechi` tournament flow intact for the ongoing `PlayMechi Launch` event.
- Stage `PlayMechi Weekend Cup Season 1` on its own route family at `/weekendcup`.
- Use manual payment confirmation for Weekend Cup without forcing the live free-entry flow to change behavior.
- Expose the Weekend Cup as an upcoming tournament on `/tournaments`.

## Date correction

- Operator correction applied: `Season 1` is `29-31 May 2026`.
- The original proposal/PDF had earlier draft dates for the first cup.
- Repo implementation now treats the Weekend Cup series cadence as:
  - `Season 1`: `29-31 May 2026`
  - `Season 2`: `12-14 June 2026`
  - `Season 3`: `26-28 June 2026`

## What was added

- New isolated Weekend Cup config:
  - [src/lib/weekend-cup.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\lib\weekend-cup.ts)
- Upcoming tournament feed for the tournament listing page:
  - [src/lib/upcoming-playmechi-tournaments.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\lib\upcoming-playmechi-tournaments.ts)
- New public Weekend Cup routes:
  - [src/app/weekendcup/page.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\weekendcup\page.tsx)
  - [src/app/weekendcup/register/page.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\weekendcup\register\page.tsx)
  - [src/app/(app)/weekendcup/dashboard/page.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\(app)\weekendcup\dashboard\page.tsx)
- New Weekend Cup clients:
  - [src/app/weekendcup/weekend-cup-client.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\weekendcup\weekend-cup-client.tsx)
  - [src/app/weekendcup/register/weekend-cup-registration-client.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\weekendcup\register\weekend-cup-registration-client.tsx)
  - [src/app/weekendcup/dashboard/weekend-cup-dashboard-client.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\weekendcup\dashboard\weekend-cup-dashboard-client.tsx)
- New Weekend Cup APIs:
  - [src/app/api/weekendcup/series/route.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\api\weekendcup\series\route.ts)
  - [src/app/api/events/playmechi-weekend-cup/register/route.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\api\events\playmechi-weekend-cup\register\route.ts)
  - [src/app/api/events/playmechi-weekend-cup/state/route.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\api\events\playmechi-weekend-cup\state\route.ts)
- New admin and moderator payment ops:
  - [src/app/api/admin/weekendcup-registrations/route.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\api\admin\weekendcup-registrations\route.ts)
  - [src/app/api/moderators/weekendcup-registrations/route.ts](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\api\moderators\weekendcup-registrations\route.ts)
  - [src/app/admin/weekendcup/page.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\admin\weekendcup\page.tsx)
  - [src/app/moderators/weekendcup/page.tsx](D:\MECHIV4\mechi-v3-master\MECHIV4\src\app\moderators\weekendcup\page.tsx)
- New ballot storage and date-shift migrations:
  - [supabase/migrations/20260512110000_weekend_cup_ballots.sql](D:\MECHIV4\mechi-v3-master\MECHIV4\supabase\migrations\20260512110000_weekend_cup_ballots.sql)
  - [supabase/migrations/20260512113000_weekend_cup_season1_date_shift.sql](D:\MECHIV4\mechi-v3-master\MECHIV4\supabase\migrations\20260512113000_weekend_cup_season1_date_shift.sql)

## Payment flow

- Weekend Cup registrations default to `pending_payment`.
- Players can register first, but they are not treated as fully confirmed until an admin or moderator marks payment as `paid`.
- Early Bird is limited to the first `12` paid players only.
- Public slot messaging for Weekend Cup prefers:
  - total registered
  - paid confirmed
  - pending payment
- Check-in for Weekend Cup is hard-blocked unless `payment_status = paid`.

## Player flow

1. Player opens `/weekendcup`.
2. Player votes on games or suggests a game for upcoming cups.
3. Player opens `/weekendcup/register` and saves registration.
4. Registration shows as pending until payment is reviewed.
5. Player opens `/weekendcup/dashboard` to track:
   - payment status
   - payment tier
   - check-in readiness
   - match-day data
6. Once paid, the player can complete check-in from the dashboard.

## Admin and moderator flow

- Admin and moderator ops can:
  - view paid vs pending counts
  - mark a player as paid
  - set payment tier
  - set amount paid
  - save payment reference
  - save payment notes
  - control check-in status safely
- Moderator updates stay scoped through the existing tournament moderator access rules.

## Live tournament protection

- The current `PlayMechi Launch` event stays on the existing `/playmechi` route and config.
- Weekend Cup logic is isolated by:
  - its own slug
  - its own public routes
  - its own register/check-in APIs
  - its own admin/mod payment ops routes
- Shared live-tournament files only received additive payment-status support so the current event does not break.

## Current rollout state

- The public `/weekendcup` page and upcoming tournament discovery can go live safely right now.
- The production database does not yet have the Weekend Cup registration/payment schema applied.
- Because of that, the live rollout keeps:
  - voting live
  - public event info live
  - registration, dashboard, and payment ops soft-locked with a clear message until the DB migration is applied

## Notifications

- Weekend Cup registration and check-in keep internal Telegram ops notifications.
- Player-facing automatic confirmation copy was not blindly reused for Weekend Cup because the old templates imply a fully confirmed slot, which would be misleading for `pending_payment`.

## How to test

- Public upcoming flow:
  - Open `/tournaments`
  - Confirm the ongoing `PlayMechi Launch` listing still appears
  - Confirm the upcoming Weekend Cup card links to `/weekendcup`
- Weekend Cup public page:
  - Open `/weekendcup`
  - Confirm the hero shows `PlayMechi Weekend Cup Season 1`
  - Confirm the dates show `29-31 May 2026`
  - Confirm the page says the series continues every `2` weeks
  - Confirm pricing shows `Entry from KSh 50`
- Weekend Cup registration:
  - Open `/weekendcup/register`
  - Save a registration
  - Confirm payment status stays `pending payment`
  - Confirm the page explains registration alone does not guarantee a confirmed slot
- Weekend Cup dashboard:
  - Open `/weekendcup/dashboard`
  - Confirm unpaid players see the payment warning
  - Confirm paid players can proceed to check-in
- Admin and moderator ops:
  - Open `/admin/weekendcup`
  - Open `/moderators/weekendcup`
  - Confirm payment status, tier, amount, and reference can be updated
  - Confirm `Mark paid` moves the player into the confirmed count

## Verification from this pass

- `npm run lint`: passed with one pre-existing warning in `src/app/report/report-issue-client.tsx`
- `npm run build`: passed
- `npm run test:e2e:player-desktop`: could not be completed in this environment because the required E2E env values are not set:
  - `E2E_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
  - `E2E_SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
  - `JWT_SECRET`
  - `E2E_ALLOW_DB_RESET=true`
