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
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `E2E_ALLOW_DB_RESET=true`

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

## CI expectations

Required PR jobs:

- `e2e-public-auth`
- `e2e-player-desktop`
- `e2e-player-mobile`
- `e2e-provider-mock`

Non-blocking jobs:

- `e2e-admin`
- `e2e-cross-browser-smoke`
- `e2e-provider-sandbox`

GitHub Actions secrets expected by the workflow:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `CRON_SECRET`

Provider sandbox jobs also expect the relevant provider sandbox secrets for the adapters you want to exercise.

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
