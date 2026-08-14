# Mechi V3 E2E Suite

## What this suite does

- Seeds a dedicated Supabase-backed test environment from scratch on every run.
- Prebuilds anonymous and authenticated browser storage states for the seeded personas.
- Captures provider transcripts for mock and sandbox runs in `test-results/provider-transcripts`.
- Splits coverage into core, admin, providers, and cross-browser smoke projects.

## Required environment

Start from [.env.e2e.example](/C:/Users/ADMIN/Documents/mechiiii/mechi-v3/.env.e2e.example).

Important values:

- `E2E_BASE_URL`
- `E2E_ADMIN_BASE_URL`
- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_DB_URL`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `E2E_ALLOW_DB_RESET=true`
- `E2E_DATABASE_CONFIRMATION=isolated-e2e-reset-authorized`

`E2E_ALLOW_DB_RESET=true` is required because the global setup clears the application tables before reseeding. Use this only against the dedicated E2E database.

## Main commands

- `npm run test:e2e`
- `npm run test:e2e:public-auth`
- `npm run test:e2e:player-desktop`
- `npm run test:e2e:player-mobile`
- `npm run test:e2e:core`
- `npm run test:e2e:admin`
- `npm run test:e2e:provider-mock`
- `npm run test:e2e:provider-sandbox`
- `npm run test:e2e:cross-browser`
- `npm run test:e2e:passport`

## Operator release gates

GitHub Actions runs the mandatory Passport quality and isolated database/browser
gates for every pull request and every push to `master`. The same gates remain
available to a trusted operator machine against a dedicated, reset-safe E2E
database:

- `npm run release:quality` — dependency audit, cutover guard, Passport tests,
  lint, typecheck, and production build;
- `npm run release:database` — apply migrations, lint the isolated database, and
  execute the V5 security contract;
- `npm run release:e2e` — run the complete local browser matrix;
- `npm run release:verify` — run all three gates in fail-fast order;
- `npm run release:preview` — run the browser matrix against an explicitly
  authorized HTTPS preview.

Every command writes a secret-free evidence record under `output/`. The database
gate refuses to run unless both reset authorization variables are set. The
preview gate additionally requires:

- `E2E_EXTERNAL_SERVER=true` is set automatically by the release script;
- `E2E_PREVIEW_CONFIRMATION=isolated-preview-authorized`;
- `E2E_BASE_URL` and `E2E_ADMIN_BASE_URL` point at the preview deployment;
- the preview deployment uses the same isolated E2E Supabase project.

Provider sandbox verification remains a separately supervised operation because
it can contact external services. Do not use production credentials for the
default mock release gate.

The CI integration job starts a disposable local Supabase stack, applies every
migration, lints the resulting database, verifies Passport RLS/grants/triggers,
seeds synthetic personas, builds the production application, and runs the
Passport browser suite. It never receives or resets a production database.


## Seeded personas

- `anon`
- `playerFree`
- `playerPro`
- `playerElite`
- `playerBanned`
- `playerOpponentA`
- `playerOpponentB`
- `moderator`
- `admin`
- `rewardLinkedUser`
- `supportContact`

Storage states are written to `.e2e/auth/<persona>.json`.
