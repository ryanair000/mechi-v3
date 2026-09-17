# PlayMechi V5 Deep Review Remediation Status

Updated: 14 August 2026

This is the implementation ledger for the final 16 findings from the PlayMechi V5 Gamer Passport review. “Implemented” means code and/or policy is present on `codex/passport-safe-publication`; production readiness still requires every external release gate below.

## Finding ledger

| ID | Finding | Resolution | Status |
|---|---|---|---|
| P1-11 | No authoritative end-to-end runtime gate | Added disposable-Supabase migrations, SQL security verification, seeded public/friend/blocked/minor personas, browser privacy flows, card validation, and production build checks. | Implemented |
| P1-12 | Release checks were not enforced consistently | Added PR/master quality workflow, preview smoke workflow, release scripts, E2E type checking, and documented gate order. | Implemented; GitHub account billing lock currently prevents jobs from starting |
| P1-13 | Passport outcomes were not measurable safely | Added a server-only product-event contract, allowlisted properties, hashed deduplication, lifecycle triggers, authenticated ingestion, retention, owner/public interaction tracking, operational aggregates, and tests. | Implemented |
| P1-14 | No complete owner data export | Added authenticated export creation and token download routes, owner UI, bounded request rate, short-lived owner-only tokens, explicit source/provenance bundle, audit trail, scrubbing, retention, and tests. | Implemented |
| P2-1 | Owner Passport information architecture was fragmented | Replaced the hero action pile with a first-value checklist and grouped workspace navigation for identity, connections, presentation, personalization, and advanced tools. | Implemented |
| P2-2 | Setup/privacy copy exposed implementation phases and weak guidance | Added a safe-handle/privacy/publish path, canonical preview URL, durable service-state language, and direct privacy navigation. | Implemented |
| P2-3 | Physical/NFC concept lacked go/no-go criteria | Added digital reliability, demand, safeguarding, event, economics, and operations gates plus a QR-first pilot sequence. | Intentionally deferred pending evidence |
| P2-4 | Accessibility evidence was incomplete | Added serious/critical axe gates, keyboard dialog focus trap and restoration, Escape behavior, 320/360 px overflow checks, reduced-motion coverage, and a manual assistive-technology sign-off checklist. | Automated gate implemented; manual NVDA/VoiceOver sign-off remains a release responsibility |
| P2-5 | Public Passport discovery was missing or unsafe | Added dynamic sitemap discovery for published, discoverable, public, adult-safe handles; canonical URLs and stored update times; and robots rules that expose public `/p/` while excluding owner `/passport`. | Implemented |
| P2-6 | Operations lacked core Passport health telemetry | Added population, publication, discoverability, route status/latency, fallback, product-event, projection-freshness, private-export, and integration health metrics. | Implemented |
| P2-7 | Public Passport routes were difficult to diagnose safely | Added asynchronous route diagnostics with hashed identifiers, bounded dimensions, status, latency, result class, cache state, 30-day retention, and an operator console. | Implemented |
| P2-8 | Service-role reads required a clearer privacy boundary | Centralized public DTO construction, retained negative runtime tests, and documented the service-role trust model, caching rules, entry points, and field-change checklist. | Implemented |
| P2-9 | Invitation visit RPC used an unnecessarily privileged browser-callable function | Replaced it with a security-invoker, empty-search-path function executable only by `service_role`; added SQL and source-contract verification. | Implemented |
| P2-10 | Critical Passport files were compressed and difficult to review | Mechanically formatted the affected game, replay, progression, resume, community, operations, and route code without changing behavior. | Implemented |
| P3-1 | Mojibake appeared in user-facing strings and historic result artifacts | Corrected product UI and historic result encoding, recovered intended gamer-name Unicode conservatively, and added a source-contract scan for common double-encoding markers. | Implemented |
| P3-2 | Public navigation ignored authenticated state | Authenticated viewers now receive Dashboard, My Passport, and Open my Passport actions; anonymous viewers retain Sign in, Create yours, and Build your Passport. Added browser assertions. | Implemented |

## Release gates

A release candidate is acceptable only when all of these pass on the exact commit being promoted:

1. Main TypeScript type check.
2. E2E TypeScript type check.
3. ESLint.
4. Passport contract/runtime unit suite.
5. Production Next.js build.
6. Fresh disposable Supabase migration reset.
7. Supabase database lint and security verification SQL.
8. Seeded Passport Playwright suite, including privacy, card dimensions, accessibility, mobile width, navigation, diagnostics, analytics, and export.
9. Protected preview smoke check.
10. Manual NVDA or equivalent Windows screen-reader pass and VoiceOver pass on the release candidate.
11. Production migration backup/rollback plan and explicit promotion approval from the Boss.

## Current external blockers

- GitHub Actions jobs are not starting because GitHub reports the repository owner account is locked for a billing issue. The failure occurs before checkout, so it cannot be repaired by changing application code.
- Docker is unavailable on the current Windows host, so the disposable local Supabase reset and full database-backed Playwright suite must run in CI or another Docker-capable environment.
- Production database migrations and production deployment have not been applied from this branch.

## Promotion rule

Do not bypass the failed/absent database and browser gates. After GitHub billing is restored, rerun the required checks, review the protected preview, obtain the Boss’s explicit production approval, apply migrations with rollback readiness, promote, and verify the canonical production routes and operational telemetry.
