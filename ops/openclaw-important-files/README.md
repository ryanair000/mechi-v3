# OpenClaw Important Files

This folder is the quick handoff pack for restoring the Mechi OpenClaw production posture on EC2.

Production rule: run live OpenClaw traffic on EC2 only. Local Windows runs are validation/dry-run only.

## Primary Runtime Goal

- `control`: Boss/operator Telegram, MECHI OPS, repo, GitHub, Supabase live ops, Obsidian, production decisions.
- `support`: customer-safe WhatsApp/support/inbox replies with Weekend Cup FAQ.
- `community`: customer group/community replies with Weekend Cup FAQ.
- `socio`: SMM lane for PlayMechi/ChezaHub publishing.
- `infra`, `billing`, `data`, `growth`: specialist agents with scoped workspaces.
- Native WhatsApp: enabled only on EC2, with exact group routing and a requested history window.

## Current Tournament Default

If a customer asks how to register, asks for the registration link, says "register me", or says they want to join the tournament, assume PlayMechi Weekend Cup Season 1 unless they clearly name the older 8-10 May PlayMechi event.

Default reply:

```text
Register for PlayMechi Weekend Cup Season 1 here:
https://mechi.club/weekendcup

Pick your game, confirm your player details, then pay with Paystack to lock your slot.

Season 1 runs 29-31 May 2026. PUBG, CODM, and eFootball are fixed; players are voting for the mystery game.
```

## Safety Defaults

- Do not confirm payments, paid slots, reward eligibility, payouts, disqualifications, bans, refunds, or account changes unless verified in live admin/payment data.
- Unknown WhatsApp groups stay mention-gated.
- Configured customer WhatsApp groups can run no-mention Weekend Cup FAQ replies when exact JIDs are provided.
- MECHI OPS Telegram can run no-tag replies for approved operator IDs only.
- No bulk WhatsApp sends, cold DMs, repeated identical messages, or invite spam.

