# Dedicated OpenClaw For Mechi

This repo includes a dedicated bridge plus versioned support and community workspaces so the EC2 OpenClaw host stays isolated to Mechi only.

Production rule: Mechi uses only the EC2 OpenClaw runtime. Local Windows or laptop gateways are for diagnostics only and must not be treated as live production.

## What runs on the Mechi OpenClaw host

1. OpenClaw gateway
2. `control` agent pointed at the Mechi repo for operator-grade repo access
3. `support` agent pointed at the support workspace
4. `community` agent pointed at the community workspace
5. `infra` agent pointed at the infra workspace with AWS/security/incident ClawHub skills
6. `billing` agent pointed at the billing workspace with the Paystack ClawHub skill
7. `data` agent pointed at the data workspace with GA4/Search Console/marketing analytics ClawHub skills
8. `growth` agent pointed at the growth workspace with Cloudinary/Meta Ads/Instagram ClawHub skills
9. `ops/openclaw-bridge/server.mjs` for app compatibility
10. Native OpenClaw Telegram channel with approved operator DMs routed to `control`
11. Native OpenClaw WhatsApp, if enabled, with operator/admin groups routed to `control`
12. `ops/openclaw-bridge/telegram-poller.mjs` only as a legacy fallback if the native channel is intentionally disabled
13. GitHub CLI plus GitHub auth env for repo-aware OpenClaw control work

## App envs to point at the dedicated host

Set these on the Mechi deployment:

```env
MECHI_OPENCLAW_BRIDGE_URL=https://smm-api.lokimax.top/v1/mechi-support-reply
MECHI_OPENCLAW_BRIDGE_TOKEN=replace-with-the-bridge-token

OPENCLAW_WEBHOOK_URL=https://smm-api.lokimax.top/webhooks/instagram
OPENCLAW_API_KEY=replace-with-the-bridge-token
OPENCLAW_TIMEOUT_MS=60000
```

## Recommended gateway posture

- `gateway.mode: "local"`
- `gateway.bind: "loopback"`
- `gateway.auth.mode: "token"`
- `tools.profile: "coding"` for the repo agent
- `agents.list[].tools.profile: "minimal"` for the support and community agents
- `agents.list[].tools.profile: "minimal"` for `billing`, `data`, and `growth`
- `agents.list[].tools.profile: "coding"` for `infra` because infra diagnosis often needs host/service inspection
- `openclaw skills install <slug>` installs ClawHub skills into the active workspace `skills/` folder; keep skills scoped to each specialist workspace
- `channels.telegram.streaming.mode: "off"` to prefer simple final Telegram replies
- `channels.telegram.replyToMode: "first"` so replies stay anchored to the initiating message
- `channels.telegram.dmPolicy: "allowlist"` so only approved operator DMs can reach `control`
- `GH_TOKEN` or `GITHUB_TOKEN` plus `GH_REPO` in `~/.openclaw/.env` so repo-aware GitHub operations work headlessly
- `scripts/openclaw-gh.sh` so the repo agent can source those env vars before any `gh` command, auto-detect the repo from `origin`, and use `--exec 'gh ... "$GH_REPO" ...'` when explicit repo scoping is needed
- `notesmd-cli` on the host plus an `obsidian-cli` compatibility wrapper so the bundled OpenClaw Obsidian skill works on headless Ubuntu
- `MECHI_OBSIDIAN_VAULT=mechi-ops`, `MECHI_OBSIDIAN_VAULT_PATH=/home/ubuntu/.openclaw/vaults/mechi-ops`, and `EDITOR=/usr/bin/cat` in `~/.openclaw/.env`
- `scripts/openclaw-obsidian.sh` so the repo agent can use the Mechi vault safely without assuming a desktop app
- `ops/obsidian-vault-seed` copied into the host vault for a reproducible Mechi COO starting memory set
- Installed host CLIs: AWS CLI, Membrane CLI, and Cloudflared
- Installed specialist skills:
  - `control` repo skills: `supabase-live-ops`, `playmechi-tournament-ops`, `github-ops`, `obsidian-ops`
  - `infra`: `aws`, `openclaw-security-scanner`, `incident`, `incident-hotfix`
  - `billing`: `paystack`
  - `data`: `ga4`, `skill-ga4-analytics`, `marketing-analytics`
  - `growth`: `cloudinary`, `openclaw-meta-ads`, `meta-ads-manager`, `instagram-api`, `instagram-content-studio`
  - `support`: `whatsapp-business`, `customer-support-autopilot`
  - recommended `support` and `community` local skill copy: `playmechi-tournament-ops` for static public tournament FAQ only
- Direct `meta-ads` and `instagram` ClawHub archives were skipped because they lacked a valid top-level `SKILL.md`; use the growth alternatives above

That lets the operator control Mechi through OpenClaw while keeping support and community threads away from filesystem or shell tools.

## Edge routing

The instance is designed to keep the bridge on `127.0.0.1:8788` internally and expose it through Nginx on port `80`.

- Nginx config template: `ops/openclaw-bridge/mechi-openclaw.nginx.conf`
- Health check: `https://smm-api.lokimax.top/healthz`
- Support route: `https://smm-api.lokimax.top/v1/mechi-support-reply`
- Instagram route: `https://smm-api.lokimax.top/webhooks/instagram`

## AWS ingress requirement

If the EC2 host works locally but times out from outside the instance, the remaining fix is the AWS security group or VPC edge.

Open inbound TCP:

- `80` from the public internet if Mechi should reach the Nginx front door directly
- optionally `443` later when a real domain and TLS are added

Port `8788` does not need to be public when Nginx is used as the front door.

## Telegram on the OpenClaw host

The current production path is the native OpenClaw Telegram channel, not the custom poller.

Current posture:

- Telegram is configured directly in `~/.openclaw/openclaw.json`
- the live bot token should be sourced from `~/.openclaw/.env`, not stored in plaintext config
- approved operator DMs should resolve to the `control` agent
- the internal `MECHI OPS` Telegram group should resolve to the `control` agent
- other group and community traffic should resolve to the `community` agent
- DMs are allowlisted so only approved operator chat ids can control the repo-capable agent
- groups are allowlisted through `channels.telegram.groups`, with mention-only triggers enabled by default
- `MECHI OPS` is a group-specific override with an internal operations prompt
- `MECHI OPS` is approved-operator no-tag mode: `requireMention: false` and `allowFrom: [6806783421, 6738706706]`
- the broader Telegram group posture stays mention-only unless group-specific rules are widened later
- Telegram forum topics are supported; `MECHI OPS` topic traffic now creates topic-scoped sessions on the `control` agent
- the `#Registrations` topic is allowed to use the approved live Supabase helper `npm run ops:registrations -- --json --summary-only` for current registration counts
- mode is polling, which works without an external HTTPS webhook
- `gateway.controlUi.allowInsecureAuth` should stay disabled unless there is a very specific localhost-only compatibility need
- `gh` should be installed on the host, and a token with at least `repo` and ideally `read:org` should be available through `GH_TOKEN`

Use the custom poller only as a fallback if you intentionally want a separate Telegram prompt layer outside the native OpenClaw channel.

## WhatsApp on the OpenClaw host

The Mechi app WhatsApp webhook and native OpenClaw WhatsApp group bot are different surfaces.

Required posture:

- customer WhatsApp DMs handled by the Mechi app must keep using the support inbox/player-action path
- native WhatsApp operator/admin groups such as `MECHI ADMINS` must route to `control`
- generic support/community prompts must not answer operator WhatsApp groups
- for "active tournaments", "open tournaments", "events", or "any tournaments today", the control agent should run `npm run ops:tournaments -- --json` from the Mechi repo
- for Mechi.club Online Gaming Tournament, PlayMechi, PUBG Mobile, CODM, eFootball, registration, schedule, prizes, stream, or rules, the control agent should load `skills/playmechi-tournament-ops/SKILL.md`
- for PlayMechi live slot counts or storage readiness, the control agent should run `npm run ops:registrations -- --json` and inspect `onlineTournament`
- if the helper cannot run, the agent should say it needs a live check through `control`; it should not send the Boss to the public tournaments page as the primary answer

Static tournament FAQ can be made available to support/community by copying the repo skill into those workspaces:

```bash
cd /home/ubuntu/mechi-v3
mkdir -p ~/.openclaw/workspace-support/skills ~/.openclaw/workspace-community/skills
cp -R skills/playmechi-tournament-ops ~/.openclaw/workspace-support/skills/
cp -R skills/playmechi-tournament-ops ~/.openclaw/workspace-community/skills/
```

Do not copy `supabase-live-ops` into customer-safe support/community workspaces unless the Boss explicitly approves service-role data access there. Operator/admin WhatsApp groups should route to `control`, which already has the repo skill and approved Supabase helper.

After changing native WhatsApp routing or prompts, restart the OpenClaw process that owns the WhatsApp session. Local repo changes alone will not alter already-running WhatsApp replies.

## EC2-only restart rule

Restart the gateway on EC2 only. Do not start a Windows/local OpenClaw gateway for Mechi production.

Expected EC2 restart flow:

```bash
cd /home/ubuntu/mechi-v3
git pull --ff-only
npm install --omit=dev
sudo systemctl restart openclaw-gateway
sudo systemctl restart mechi-openclaw-bridge
sudo systemctl status openclaw-gateway --no-pager
sudo systemctl status mechi-openclaw-bridge --no-pager
```

If the service names differ on the host, list them with:

```bash
systemctl list-units --type=service | grep -Ei 'openclaw|mechi'
```
