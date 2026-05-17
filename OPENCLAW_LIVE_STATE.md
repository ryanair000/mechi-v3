# OpenClaw Live State

This file summarizes the current Mechi OpenClaw runtime so fresh agent sessions do not rely on chat history.

## Active agents

- live OpenClaw runtime = EC2 only
- current production posture on EC2 = SMM-only
- `socio` and `control` = the live agents in `~/.openclaw/openclaw.json`
- live `socio` workspace = `~/.openclaw/workspace-growth`
- archived/not-live runtime surfaces = `support`, `community`, `infra`, `billing`, `data`, `growth`, native WhatsApp, Mechi bridge, and Nginx front door
- host prune backup root from the 2026-05-10 cleanup = `/home/ubuntu/openclaw-pruned-20260510-212015-smm-only`

## Current Telegram routing

- approved operator DMs route to `control` with coding tools for Boss admin and social execution
- approved operator ids include `6806783421` and `6738706706`
- Boss private `OPS` group `-1003922946344` is the social media execution room and routes to `socio`
- Boss private `OPS` forum topic `SMM` (`topicId=7`) is explicitly pinned to `socio`
- Telegram group policy is allowlist-only; only the private `OPS` room is live
- `socio` is also the default agent id on the gateway after the prune
- live prompts now explicitly support:
  - `socio post chezahub` -> Instagram + Facebook `ChezaHub`
  - `socio post playmechi` -> Instagram + Facebook `PlayMechi`
  - `socio post mechi` / `post mechi` -> Instagram + Facebook `PlayMechi`
  - schedule commands -> queued social jobs with Telegram notification after cron publishes or fails
- when the brand is ambiguous, `socio` should ask one short clarification instead of assuming the wrong feed

## Current ClawHub skill map

OpenClaw native docs say ClawHub skills install into the active workspace `skills/` directory, and per-agent workspaces control which skills each agent sees. Current live install map:

- `socio`: `cloudinary`, `openclaw-meta-ads`, `meta-ads-manager`, `instagram-api`, `instagram-content-studio`, local `mechi-social-exec`, and `MECHI_SOCIAL_PLAYBOOK.md`
- archived workspaces still exist in the repo, but they are not part of the active host config after the SMM-only prune

The direct ClawHub archives for slugs `meta-ads` and `instagram` were not forced into production because they unpacked without a valid top-level `SKILL.md`. Growth uses the working alternatives listed above.

## Credential and login gates

- AWS skill is installed and `aws` CLI exists, but AWS API calls still require configured AWS credentials and region.
- Paystack skill is installed and `membrane` CLI exists, but Paystack live access requires Membrane login/OAuth.
- GA4/Search Console skills require Google Analytics property/service-account or OAuth credentials.
- Cloudinary skill requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Instagram skills require `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, and media helper credentials such as `IMGUR_CLIENT_ID` where needed.
- Facebook page publishing requires `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN`.
- brand-pair Meta routing also supports:
  - `CHEZAHUB_INSTAGRAM_ACCESS_TOKEN`, `CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID`, `CHEZAHUB_FACEBOOK_PAGE_ID`, `CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN`
  - `PLAYMECHI_INSTAGRAM_ACCESS_TOKEN`, `PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID`, `PLAYMECHI_FACEBOOK_PAGE_ID`, `PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN`
- On 2026-05-11 EAT, the live EC2 host was updated with the durable Meta page/user credentials for `ChezaHub`, and host-side smoke checks against the Facebook page endpoint plus the Instagram `content_publishing_limit` endpoint both returned HTTP 200.
- live EC2 readiness on 2026-05-11 EAT:
  - `ChezaHub` Instagram+Facebook pair = ready
  - `PlayMechi` Instagram+Facebook pair = ready
  - current live `PlayMechi` Facebook page object is `Mechi` (`1074864009049646`) and the connected Instagram business account is `@playmechi` (`17841473808871423`)
- X publishing requires the `xurl` CLI plus authenticated X account state, or another approved X credential bundle.
- On 2026-05-11 EAT, `PlayMechi` X was bound on the live EC2 host with the real OAuth1 access token pair for `@playmechi`, and the direct signed X API readiness check for `/2/users/me` returned the `playmechi` account successfully.
- TikTok video publishing helpers exist in the repo, but TikTok live SMM execution is paused by Boss instruction on 2026-05-17 EAT. X remains active for PlayMechi.
- Discord publishing can use either `DISCORD_WEBHOOK_URL` or native Discord channel config backed by `DISCORD_BOT_TOKEN`.
- Meta Ads skills require the correct Meta account/OAuth context and explicit Boss approval before any write, spend, budget, or campaign-state action.
- OpenAI Codex model OAuth was repaired on 2026-05-03 EAT by removing the reused/expired profile, keeping the fresh `openai-codex` OAuth profile, and repointing active sessions to that profile.
- OpenAI Codex model OAuth was re-seeded again on 2026-05-10 EAT after the EC2 refresh token became invalidated. The live agent auth stores were updated from the current desktop Codex login for `hanhbichhuabich8450@outlook.com`, per-agent auth-state files were normalized to that profile, and the fresh bearer token was validated against `https://chatgpt.com/backend-api/wham/usage` with HTTP 200.
- OpenAI Codex model OAuth needed another targeted repair on 2026-05-11 EAT after `socio` started failing again with `Your authentication token has been invalidated`. The live `socio` auth profile was re-seeded from the current desktop Codex login, the host-side bearer token was revalidated against `https://chatgpt.com/backend-api/wham/usage` with HTTP 200, and subsequent gateway logs returned `ws res ✓ agent` instead of auth failure.
- Native OpenClaw WhatsApp is intentionally disabled in the live config after the 2026-05-10 SMM-only prune.

## Support restore target

The repo now carries `scripts/openclaw-restore-mechi-support.sh` for restoring Mechi support on EC2 when approved by the Boss. The target restored posture is:

- `control`: repo-capable operator agent in `/home/ubuntu/mechi-v3`
- `support`: customer-safe WhatsApp/support agent with current Weekend Cup FAQ
- `community`: player/community-safe WhatsApp group agent with current Weekend Cup FAQ
- `socio`: existing SMM lane preserved
- native WhatsApp: enabled with explicit account/group routing and a requested history window through `MECHI_WHATSAPP_HISTORY_LIMIT`

Until that script is run and verified on EC2, this file's SMM-only live-state lines remain the last verified runtime state.

## Paused surfaces

- `smm-api.lokimax.top` is on break for now and the bridge/Nginx path is disabled on EC2.
- `mechi-openclaw-bridge.service` is disabled and removed from the active systemd path.
- `nginx.service` is disabled and inactive on the OpenClaw EC2 host.
- native WhatsApp credentials were moved out of `~/.openclaw/credentials/whatsapp` during the prune so the 401 restart loop cannot restart itself.
- old cron notifications and the stale task database were removed from the live hot path during the prune.

## Current truth paths

- live registrations and player counts: `npm run ops:registrations -- --json`
- PlayMechi Online Gaming Tournament details: `skills/playmechi-tournament-ops/SKILL.md`
- PlayMechi live registration state: `npm run ops:registrations -- --json`, then inspect `onlineTournament`
- live open/active tournaments: `npm run ops:tournaments -- --json`
- daily Mechi report to the Boss on Telegram: `npm run ops:daily-report:telegram -- --send`
- install/update the 10:00 PM EAT daily report cron on EC2: `bash scripts/openclaw-install-daily-mechi-report-cron.sh`
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
- the growth workspace now carries `MECHI_SOCIAL_PLAYBOOK.md` plus local `mechi-social-exec` helpers for Facebook/Discord/TikTok/X readiness checks
- the growth workspace now also carries direct local Meta publish helpers for explicit brand-pair commands:
  - `publish-instagram-photo.mjs`
  - `publish-instagram-video.mjs`
  - `publish-meta-photo.mjs`
  - `publish-meta-video.mjs`
- native OpenClaw Telegram channel is the production Telegram path
- live gateway is pruned to focused active agents with `agents.defaults.thinkingDefault=low`, `socio.thinkingDefault=low`, `control.thinkingDefault=low`, and `socio.fastModeDefault=true`
- the 2026-05-10 prune cut gateway memory from roughly `847 MB` down to roughly `184 MB` immediately after restart
- local Windows OpenClaw gateways are not production and should stay stopped for Mechi

## Guardrails by role

- `socio`
  The live SMM role on EC2. Use it for Boss-approved SMM execution only. Do not use it for support, billing, infrastructure, or public community moderation.
- `control`
  The live Boss DM/admin role on EC2 with coding tools and repo workspace access. Use it for Boss operator DMs, repo work, live checks, and explicit social post/schedule commands from the Boss DM.

## Critical reminder

Obsidian notes are internal memory only. They help with continuity, handoff, and operator context, but they do not override live production truth from Supabase, logs, or current infrastructure state.
