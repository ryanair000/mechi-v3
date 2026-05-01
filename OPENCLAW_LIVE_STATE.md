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
- `support`: `whatsapp-business`, `customer-support-autopilot`; may also receive the static `playmechi-tournament-ops` skill copy for public tournament FAQ only
- `community`: may receive the static `playmechi-tournament-ops` skill copy for public tournament FAQ and announcement-safe replies only

The direct ClawHub archives for slugs `meta-ads` and `instagram` were not forced into production because they unpacked without a valid top-level `SKILL.md`. Growth uses the working alternatives listed above.

## Credential and login gates

- AWS skill is installed and `aws` CLI exists, but AWS API calls still require configured AWS credentials and region.
- Paystack skill is installed and `membrane` CLI exists, but Paystack live access requires Membrane login/OAuth.
- GA4/Search Console skills require Google Analytics property/service-account or OAuth credentials.
- Cloudinary skill requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Instagram skills require `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, and media helper credentials such as `IMGUR_CLIENT_ID` where needed.
- Meta Ads skills require the correct Meta account/OAuth context and explicit Boss approval before any write, spend, budget, or campaign-state action.
- WhatsApp Business skill requires Maton/WhatsApp connection credentials such as `MATON_API_KEY`; customer-visible replies remain high-risk.

## WhatsApp routing requirement

- operator/admin WhatsApp groups such as `MECHI ADMINS` must route to `control`, not the generic support/community prompt
- customer WhatsApp support DMs should route through the Mechi support inbox/player-action path
- if native OpenClaw WhatsApp is used, it must load the Mechi control workspace for operator/admin groups and use `skills/playmechi-tournament-ops/SKILL.md` for event facts
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
