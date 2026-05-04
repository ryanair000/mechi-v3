# OpenClaw Live State

This file summarizes the current Mechi OpenClaw runtime so fresh agent sessions do not rely on chat history.

## Active agents

- live OpenClaw runtime = EC2 only
- public bridge base URL = `https://smm-api.lokimax.top`
- `control` = Mechi COO, repo-capable, operator-facing, workspace `/home/ubuntu/mechi-v3`
- `support` = Mechi Support, customer-safe, workspace `~/.openclaw/workspace-support`
- `community` = Mechi Community, public/community-safe, workspace `~/.openclaw/workspace-community`
- `infra` = Mechi Infra, AWS/OpenClaw/Nginx/incident-safe workspace `~/.openclaw/workspace-infra`
- `billing` = Mechi Billing, Paystack/subscription-safe workspace `~/.openclaw/workspace-billing`
- `data` = Mechi Data, analytics/reporting-safe workspace `~/.openclaw/workspace-data`
- `growth` = Mechi Growth, campaign/media/social-safe workspace `~/.openclaw/workspace-growth`

## Current Telegram routing

- approved operator DMs route to `control`
- approved operator ids include `6806783421` and `6738706706`
- internal `MECHI OPS` group `-1003527082714` routes to `control`
- `MECHI OPS` supports approved-operator no-tag mode
- broader group/community traffic falls back to `community`
- customer-safe bridge or inbox-style work should go to `support`

## Current ClawHub skill map

OpenClaw native docs say ClawHub skills install into the active workspace `skills/` directory, and per-agent workspaces control which skills each agent sees. Current live install map:

- `control` repo skills: `supabase-live-ops`, `playmechi-tournament-ops`, `github-ops`, `obsidian-ops`
- `infra`: `aws`, `openclaw-security-scanner`, `incident`, `incident-hotfix`
- `billing`: `paystack`
- `data`: `ga4`, `skill-ga4-analytics`, `marketing-analytics`
- `growth`: `cloudinary`, `openclaw-meta-ads`, `meta-ads-manager`, `instagram-api`, `instagram-content-studio`
- `support`: `whatsapp-business`, `customer-support-autopilot`; local skills `playmechi-tournament-ops` and read-only `supabase-live-ops` for customer-safe tournament FAQ and verified slot counts
- `community`: local skills `playmechi-tournament-ops` and read-only `supabase-live-ops` for public tournament FAQ, announcement-safe replies, and verified slot counts

The direct ClawHub archives for slugs `meta-ads` and `instagram` were not forced into production because they unpacked without a valid top-level `SKILL.md`. Growth uses the working alternatives listed above.

## Credential and login gates

- AWS skill is installed and `aws` CLI exists, but AWS API calls still require configured AWS credentials and region.
- Paystack skill is installed and `membrane` CLI exists, but Paystack live access requires Membrane login/OAuth.
- GA4/Search Console skills require Google Analytics property/service-account or OAuth credentials.
- Cloudinary skill requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Instagram skills require `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, and media helper credentials such as `IMGUR_CLIENT_ID` where needed.
- Meta Ads skills require the correct Meta account/OAuth context and explicit Boss approval before any write, spend, budget, or campaign-state action.
- WhatsApp Business skill requires Maton/WhatsApp connection credentials such as `MATON_API_KEY`; customer-visible replies remain high-risk.
- Meta WhatsApp Cloud API for player/customer traffic is intended for `+254113033475`, but the observed Meta setup on 2026-05-02 is still test-WABA only until a production WABA/number and templates are approved.
- OpenAI Codex model OAuth was repaired on 2026-05-03 EAT by removing the reused/expired profile, keeping the fresh `openai-codex` OAuth profile, and repointing active sessions to that profile. `openclaw models status --json` reports the profile as `ok`.
- Native OpenClaw WhatsApp is currently linked and listening on EC2 account `default` (`+254733638841`).
- The `+254113033475` (`accountId=254113033475`) native WhatsApp account was removed from the active OpenClaw config on 2026-05-04 EAT because EC2 had no linked credentials for it. Do not re-add it until the Boss explicitly asks to relink it and scans a fresh QR on the production EC2 gateway.

## WhatsApp routing requirement

- operator/admin WhatsApp groups such as `MECHI ADMINS` must route to `control`, not the generic support/community prompt
- native WhatsApp direct messages are currently open on `+254733638841`; keep replies short, customer-safe, and tournament-focused for non-operator senders
- `+254113033475` is not active in native OpenClaw WhatsApp for now; it needs a fresh EC2 QR relink before it can be safely restored
- native WhatsApp direct messages from known Boss/operator senders are the operator path and route to `control`
- native WhatsApp groups on `+254733638841` are mention-only: respond only when the bot/number is tagged or directly quoted; do not auto-reply to ordinary group chatter
- customer WhatsApp support DMs should route through the Mechi support inbox/player-action path
- game purchase enquiries are handled on WhatsApp at `+254104003156`; customer-safe agents should tell clients to DM that number and must not negotiate prices or collect payment details
- if native OpenClaw WhatsApp is used, it must load the Mechi control workspace for operator/admin groups and use `skills/playmechi-tournament-ops/SKILL.md` for event facts
- native OpenClaw WhatsApp must not send marketing broadcasts, mass tournament reminders, cold outreach, or repeated unknown-chat automation; non-Boss direct replies must stay customer-safe, tournament-focused, and low-volume
- Meta Cloud API on `+254113033475` is the player/customer path and must use opt-in, approved templates outside the 24-hour service window, and immediate opt-out handling
- for live PlayMechi slot counts, storage readiness, or registered-player counts, WhatsApp operator/admin groups must use `skills/supabase-live-ops/SKILL.md` and read the `onlineTournament` object from `npm run ops:registrations -- --json`
- customer-safe WhatsApp support can answer fixed schedule, prize, rule, and registration-path facts from the PlayMechi skill, but must escalate live counts, disqualifications, payout status, and reward eligibility to `control`

## Current truth paths

- live registrations and player counts: `npm run ops:registrations -- --json`
- PlayMechi Online Gaming Tournament details: `skills/playmechi-tournament-ops/SKILL.md`
- PlayMechi live registration state: `npm run ops:registrations -- --json`, then inspect `onlineTournament`
- live open/active tournaments: `npm run ops:tournaments -- --json`
- GitHub repo, issues, PRs, and workflow state: `./scripts/openclaw-gh.sh`
- durable internal notes and memory: `./scripts/openclaw-obsidian.sh`
- Mechi Obsidian vault path: `~/.openclaw/vaults/mechi-ops`

## Current host integrations

- GitHub CLI installed and authenticated for repo-aware operations
- Supabase live-ops helper wired with approved credentials for registration checks
- PlayMechi tournament ops skill added in repo; live Supabase currently still needs `public.online_tournament_registrations` applied before tournament slot locking can be trusted
- Obsidian wired headlessly through `notesmd-cli` plus `obsidian-cli` compatibility wrapper
- AWS CLI installed for infra work
- Membrane CLI installed for Paystack skill auth
- Cloudflared installed for Cloudinary/Instagram content studio local tunnel workflows
- Nginx fronts the Mechi bridge at `https://smm-api.lokimax.top`
- native OpenClaw Telegram channel is the production Telegram path
- native OpenClaw WhatsApp on `+254733638841` is the current live native WhatsApp support/operator path; `+254113033475` is disabled pending a fresh EC2 relink
- OpenClaw gateway defaults are set for fast operation: `agents.defaults.thinkingDefault=minimal`; main agent `thinkingDefault=minimal` and `fastModeDefault=true`
- local Windows OpenClaw gateways are not production and should stay stopped for Mechi

## Guardrails by role

- `control`
  Can use repo, shell, GitHub, Supabase helper, and Obsidian notes. Must ask before destructive, money-moving, or public-facing actions.
- `support`
  Must stay customer-safe. Never invent refunds, account actions, moderation outcomes, or tournament rulings. Escalate risky or admin-only issues.
- `community`
  Must stay public-safe. Avoid promises on payouts, bans, refunds, rewards, or support outcomes. Route risky account-specific issues to `support` or `control`.
- `infra`
  May inspect AWS, host services, Nginx, logs, and incidents. Must ask before destructive infra actions or public incident messaging.
- `billing`
  May investigate Paystack/subscription state when authenticated. Must ask before refunds, reversals, plan changes, or money-moving actions.
- `data`
  May summarize analytics and marketing KPIs from read-only sources. Must not write production data or message customers.
- `growth`
  May plan campaigns, inspect media/assets, and draft social/ad work. Must ask before publishing, ad spend, budget, or campaign-state changes.

## Critical reminder

Obsidian notes are internal memory only. They help with continuity, handoff, and operator context, but they do not override live production truth from Supabase, logs, or current infrastructure state.
