---
name: supabase-live-ops
description: "Use for live Mechi registrations, profile counts, tournament availability, and quick production Supabase checks from the OpenClaw control agent."
metadata:
  owner: mechi
  version: "0.1.0"
---

# Supabase Live Ops

This workspace already has dedicated helpers for production-safe registration and tournament checks.

Use this skill when the Boss asks for live answers such as:

- how many registrations do we have
- any new registrations
- latest signups
- player count / spots left
- any active tournaments
- open tournament registrations
- tournament entry fees, player counts, prize pool, game, platform, or start time

## Canonical commands

For registrations and player counts, run this from the repo root:

```bash
npm run ops:registrations -- --json
```

For open or active tournaments, run this from the repo root:

```bash
npm run ops:tournaments -- --json
```

Optional flags:

- `--summary-only`
- `--limit 10`
- `--window-hours 6`
- `--game fc26`
- `--open-only`
- `--active-only`

## Rules

1. Use the relevant helper before answering from memory when the Boss wants live registration, profile, tournament, or event state.
2. Do not read `.env*` or dump secrets in Telegram. The helper is the approved data path.
3. Treat helper output as the source of truth for:
   - registered players
   - spots left
   - new users in the recent window
   - latest registrations
   - open or active tournaments
   - tournament entry fee, player count, prize pool, game, platform, start time, and link
4. Keep Telegram replies compact:
   - lead with the answer
   - say it is verified if it came from the helper
   - include only the minimum recent-registration detail needed
5. If the helper says env is missing or the query fails, say the live Supabase check is unavailable and stop there unless the Boss explicitly asks for infra debugging.
