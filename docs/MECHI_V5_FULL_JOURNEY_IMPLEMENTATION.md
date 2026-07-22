# Mechi V5 Journey Implementation

Status: implemented in `codex/v5-performance`  
Database: production migration `20260722160638_playmechi_v5_complete_journeys.sql` applied  
Primary outcome: every player screen leads with a clear next action, and team/support/role actions create durable backend records.

## Product language

- “Player workspace” is now “Player dashboard.”
- “Competition identity” is now “Your player profile” or “Your player record.”
- User-facing actions describe the outcome: “Join or create a team,” “Play a 1v1,” “Get help,” and “Lock roster & enter.”
- Technical concepts such as permission scope, durable records, and idempotency stay in the implementation rather than the player copy.

## Player journey

1. The dashboard chooses one next action:
   - an active match room when a result is due;
   - otherwise the next suitable tournament;
   - otherwise tournament discovery.
2. Player progress is shown once in a compact player-record card.
3. Secondary actions are grouped into one small panel: 1v1, teams, payments, and support.
4. Tournaments retain the complete entry, eligibility, payment, and recovery flow.
5. 1v1 removes the repeated four-card summary and starts with active-match or challenge-inbox context.
6. Profile copy explains concrete setup requirements and verified-result progress.

## Team journey

### Player

- View team memberships.
- View pending invitations.
- Accept or decline an invitation.
- Create a team with name, tag, game, and platform defaults.

### Captain or manager

- View a team dashboard and roster readiness.
- Invite by existing username or email.
- Assign starter, substitute, manager, analyst, or member roles.
- See missing team identity, player count, and game-account blockers.
- Lock an immutable tournament roster and enter through the production atomic database function.
- See entry, payment, and check-in status.
- Complete check-in when the entry is confirmed and payment is settled or not required.

### Safety and integrity

- Every mutation authenticates the Mechi session at the API boundary.
- Team changes also check current workspace ownership or manager permission.
- Captain ownership cannot be silently removed through roster editing.
- Invitations expire and have explicit accepted, declined, revoked, or expired states.
- Team entry uses an idempotency key and the existing atomic database contract.
- Audit events record identity, invitations, roster changes, entry, and check-in.

## Support journey

- The public support page keeps immediate WhatsApp, email, registration, payment, and bug-report recovery routes.
- Signed-in players can create a private in-app case for tournament, payment, result, team, account, safety, or other issues.
- Each case receives a durable reference, status, priority, conversation, and account/context link.
- Players can reply in the same case and mark it resolved.
- Direct database access remains closed to public clients; authenticated API handlers use the server service client after session checks.

## Other role journeys

Organizer, creator, coach, sponsor, and gaming-shop dashboards now save real role work instead of presenting only static lanes. The shared contract supports:

- tasks, content, guides, analysis, sponsor briefs, campaigns, venue facts, staff notes, and documents;
- owner/assignee, status, deadline, structured metadata, and archive history;
- targeted announcements for members, participants, staff, or public audiences;
- verification evidence and review decisions;
- finance planning/evidence records while payment-provider ledgers remain authoritative.

## Database contracts

The additive migration creates:

- `workspace_items`
- `workspace_announcements`
- `workspace_verification_requests`
- `workspace_finance_records`

All four tables:

- use UUID primary keys and foreign keys to workspaces/profiles/tournaments;
- include status constraints and operational indexes;
- have row-level security enabled;
- revoke `anon` and `authenticated` access;
- grant access only to `service_role` for permission-checked server handlers.

The implementation also uses the existing V5 tables and functions:

- `workspaces`, `workspace_members`, `workspace_invitations`
- `teams`, `team_members`, `team_roster_snapshots`
- `tournament_entries`, `tournament_entry_members`
- `workspace_audit_events`
- `create_v5_team_tournament_entry(...)`
- in-app `support_threads` and `support_messages`

## API surface

- `GET/PATCH /api/v5/workspaces/:workspaceId`
- `GET/POST /api/v5/workspaces/:workspaceId/items`
- `PATCH /api/v5/workspaces/:workspaceId/items/:itemId`
- `GET/PATCH /api/v5/teams/:teamId`
- `POST /api/v5/teams/:teamId/invitations`
- `PATCH /api/v5/teams/:teamId/members/:memberId`
- `GET /api/v5/teams/:teamId/readiness`
- `POST /api/v5/teams/:teamId/roster/lock`
- `POST /api/v5/teams/:teamId/tournaments/:tournamentId/enter`
- `GET /api/v5/invitations`
- `PATCH /api/v5/invitations/:invitationId`
- `POST /api/v5/entries/:entryId/check-in`
- `GET/POST /api/support`
- `GET /api/support/:id`
- `POST /api/support/:id/messages`
- `POST /api/support/:id/resolve`

## Verification gates

- Targeted ESLint: no warnings or errors.
- TypeScript and Next.js route generation: production build gate.
- Supabase migration history: local/remote version match.
- Supabase schema lint: no schema errors.
- V5 cutover guard: no legacy route regression.
- Browser checks: public page, sign-in recovery, support, and protected dashboard navigation.
- Responsive checks: desktop and mobile layout; controls retain native keyboard semantics.

## White-screen navigation incident closure

The repeated blank or stale screen during client navigation was caused by two
systems owning the same document nodes. Next.js 16 renders `theme-color` and
`color-scheme` through its viewport metadata API, while the client theme code
was also creating, removing, and deduplicating those `<meta>` elements. React
could then try to remove a node that the theme code had already removed,
raising `Cannot read properties of null (reading 'removeChild')` and aborting
the route commit.

The theme bootstrap and provider now leave node ownership with Next.js. They
only update existing metadata attributes and continue to switch the root theme
class, data attribute, and CSS color scheme. The navigation feedback layer also
stays mounted throughout route transitions so its own lifecycle cannot race a
navigation commit.

Production verification on 22 July 2026 covered:

- Support to PlayMechi registration: new URL, title, and page content rendered;
  the old support DOM was absent; zero console or page errors.
- PlayMechi registration to Weekend Cup: destination rendered with zero console
  errors or warnings.
- Direct `/app/player/matches` access while signed out: clean redirect to
  `/login?next=%2Fapp%2Fplayer%2Fmatches` with the return path preserved and zero
  console errors or warnings.
- Vercel production build: compilation, TypeScript, and all 282 generated pages
  completed successfully before the deployment was aliased to `mechi.club`.

## Operator note

The Supabase personal access token used for this deployment was pasted into a chat. Revoke it after release and create a replacement only if another CLI session is needed.
