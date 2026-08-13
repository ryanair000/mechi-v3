# Mechi V5 Gamer Passport Phase 8 Operations Runbook

This runbook is for controlled rollout of external Gamer Passport capabilities. It does not authorize a production migration, deployment, secret change, cron activation, partner approval, or outbound message. Those remain explicit Boss-approved actions.

## Default posture

- Keep `PASSPORT_CONNECTIONS_ENABLED=false`.
- Keep `PASSPORT_DEVELOPER_API_ENABLED=false`.
- Keep `PASSPORT_PARTNER_API_ENABLED=false`.
- Keep `PASSPORT_WEBHOOK_DELIVERY_ENABLED=false`.
- Keep `PASSPORT_EXTERNAL_ROLLOUT_PERCENT=0`.
- Add only reviewed internal UUIDs to `PASSPORT_BETA_USER_IDS`.

With that posture, the Passport remains fully usable while external traffic is disabled.

## Required configuration names

- `CRON_SECRET`
- `PASSPORT_CONNECTION_ENCRYPTION_KEY`
- `STEAM_WEB_API_KEY`
- the six rollout variables listed above

Never paste or commit their values. Confirm presence and rotation through the approved deployment secret system.

## Pre-deploy checks

1. Run Phase 7 and Phase 8 contract suites.
2. Run repository TypeScript and targeted ESLint.
3. Run a full Next.js production build.
4. Confirm the deployment plan supports the configured cron jobs. The current production plan runs a daily webhook safety sweep at 02:15 UTC; upgrade the plan and restore the five-minute schedule before enabling external webhook delivery.
5. Start local Supabase and run database lint/advisors.
6. Rebuild a fresh local database from migrations and separately from `bootstrap_from_empty_project.sql`.
7. Verify both schemas contain the same Phase 8 tables, columns, functions, indexes, triggers, RLS, revokes, and grants.
8. Verify production gates remain false in the deployment change.

## Staging webhook test matrix

- valid public IPv4 endpoint;
- valid public IPv6 endpoint;
- DNS with one private answer among public answers: must reject;
- direct loopback/private/link-local/documentation IP: must reject;
- redirect to another public host: must not follow;
- redirect to private host: must not follow;
- invalid TLS certificate and hostname mismatch: must reject;
- connection timeout and slow response: must retry;
- response larger than 8 KiB: terminal failure;
- 200/204: delivered;
- 400/401/403/404: terminal failure;
- 408/425/429/500/502/503/504: retry;
- repeated failures: pause after eight;
- worker termination after claim: reclaimed after five minutes;
- two concurrent workers: no duplicate active claim;
- duplicate logical event: receiver applies side effect once using event ID.

## Receiver signature verification

1. Read the exact raw body bytes.
2. Read `X-Mechi-Webhook-Timestamp` and reject values outside the agreed replay window.
3. Construct `<timestamp>.<raw-body>`.
4. Compute HMAC-SHA-256 with the one-time signing secret.
5. Constant-time compare it to the hex value after `v1=` in `X-Mechi-Webhook-Signature`.
6. Insert `X-Mechi-Event-Id` into a unique receiver-side ledger before applying side effects.
7. Return a 2xx only after durable acceptance.

## Admin control room

Open `/admin/passport/operations` on the primary admin host. Confirm:

- storage ready;
- expected environment gates;
- expected rollout percentage and beta-user count;
- zero unexplained stale claims;
- queue growth matches event volume;
- no unexpected auto-paused subscription;
- pending partner reviews have a named human owner;
- recent operation runs complete within their execution window.

Manual delivery can contact external systems. Use it only against reviewed subscriptions, confirm the prompt, and inspect the resulting audited operation.

## Incident triggers

Immediately close webhook delivery when any of these occur:

- suspected private/internal destination access;
- signing-secret exposure or decryption failure spike;
- duplicate receiver side effects;
- unexplained queue amplification;
- operation duration approaching the function limit;
- persistent stale claims;
- delivery payload containing data outside the documented event contract.

Close the relevant connection, developer, or partner gate for authorization, privacy, or source-integrity incidents on that surface.

## Rollback

Feature flags are the primary rollback. Set the implicated gate false and cohort percentage to zero where applicable. Do not delete queue or audit data during an incident. Do not reverse migrations merely to stop traffic. Capture operation IDs, approximate time, affected endpoint or provider, and the latest known safe state; then route infrastructure incidents to `infra` under the Mechi agent matrix.
