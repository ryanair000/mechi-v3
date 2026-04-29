# OpenClaw Live State

This file summarizes the current Mechi OpenClaw runtime so fresh agent sessions do not rely on chat history.

## Active agents

- `control` = Mechi COO, repo-capable, operator-facing, workspace `/home/ubuntu/mechi-v3`
- `support` = Mechi Support, customer-safe, workspace `~/.openclaw/workspace-support`
- `community` = Mechi Community, public/community-safe, workspace `~/.openclaw/workspace-community`

## Current Telegram routing

- approved operator DMs route to `control`
- approved operator ids include `6806783421` and `6738706706`
- internal `MECHI OPS` group `-1003527082714` routes to `control`
- `MECHI OPS` supports approved-operator no-tag mode
- broader group/community traffic falls back to `community`
- customer-safe bridge or inbox-style work should go to `support`

## WhatsApp routing requirement

- operator/admin WhatsApp groups such as `MECHI ADMINS` must route to `control`, not the generic support/community prompt
- customer WhatsApp support DMs should route through the Mechi support inbox/player-action path
- if native OpenClaw WhatsApp is used, it must load the Mechi control workspace and use the live tournament helper for event availability questions

## Current truth paths

- live registrations and player counts: `npm run ops:registrations -- --json`
- live open/active tournaments: `npm run ops:tournaments -- --json`
- GitHub repo, issues, PRs, and workflow state: `./scripts/openclaw-gh.sh`
- durable internal notes and memory: `./scripts/openclaw-obsidian.sh`
- Mechi Obsidian vault path: `~/.openclaw/vaults/mechi-ops`

## Current host integrations

- GitHub CLI installed and authenticated for repo-aware operations
- Supabase live-ops helper wired with approved credentials for registration checks
- Obsidian wired headlessly through `notesmd-cli` plus `obsidian-cli` compatibility wrapper
- Nginx fronts the Mechi bridge on port `80`
- native OpenClaw Telegram channel is the production Telegram path

## Guardrails by role

- `control`
  Can use repo, shell, GitHub, Supabase helper, and Obsidian notes. Must ask before destructive, money-moving, or public-facing actions.
- `support`
  Must stay customer-safe. Never invent refunds, account actions, moderation outcomes, or tournament rulings. Escalate risky or admin-only issues.
- `community`
  Must stay public-safe. Avoid promises on payouts, bans, refunds, rewards, or support outcomes. Route risky account-specific issues to `support` or `control`.

## Critical reminder

Obsidian notes are internal memory only. They help with continuity, handoff, and operator context, but they do not override live production truth from Supabase, logs, or current infrastructure state.
