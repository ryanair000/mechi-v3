# Dedicated OpenClaw For Mechi

This repo includes the Mechi OpenClaw host runbooks and the SMM workspace used by the live EC2 gateway.

Production rule: Mechi uses only the EC2 OpenClaw runtime. Local Windows or laptop gateways are for diagnostics only and must not be treated as live production.

## Current live host posture

As of 2026-05-10 EAT, the EC2 host is intentionally pruned to Telegram SMM only:

1. OpenClaw gateway
2. one live agent: `socio`
3. one live workspace: `~/.openclaw/workspace-growth`
4. native OpenClaw Telegram channel with approved operator DMs routed to `socio`
5. Boss private `OPS -> SMM` topic (`group -1003922946344`, `topicId 7`) routed to `socio`
6. growth media stack: `instagram-api`, `instagram-content-studio`, `mechi-social-exec`, `MECHI_SOCIAL_PLAYBOOK.md`

Paused on purpose right now:

- `smm-api.lokimax.top`
- `mechi-openclaw-bridge.service`
- `nginx.service`
- native OpenClaw WhatsApp
- non-SMM specialist agents in the live config

The live prune command is `bash scripts/openclaw-prune-smm-only.sh`.

## Restore Mechi support and WhatsApp runtime

When the Boss wants OpenClaw Mechi support back online, run the restore script from the EC2 host. It restores the repo-capable `control` agent, customer-safe `support`, community-safe `community`, keeps `socio`, syncs the latest Weekend Cup support brain, enables native WhatsApp routing, validates config, and restarts the gateway/bridge.

```bash
cd /home/ubuntu/mechi-v3
git pull --ff-only
npm install --omit=dev

export MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER="+254733638841"
export MECHI_NATIVE_SUPPORT_WHATSAPP_ACCOUNT_ID="default"
export MECHI_WHATSAPP_DEFAULT_DM_AGENT="support"
export MECHI_WHATSAPP_CUSTOMER_GROUP_AGENT="community"
export MECHI_WHATSAPP_HISTORY_LIMIT="200"

bash scripts/openclaw-restore-mechi-support.sh
```

For exact group routing, discover group JIDs and rerun with comma-separated values:

```bash
openclaw directory peers list --channel whatsapp --query "MECHI"

export MECHI_WHATSAPP_CONTROL_GROUP_IDS="120363...@g.us"
export MECHI_WHATSAPP_CUSTOMER_GROUP_IDS="120363...@g.us"
bash scripts/openclaw-restore-mechi-support.sh
```

Native WhatsApp can use the chat history available to the logged-in session and configured history window. It cannot recover deleted, expired, or never-synced WhatsApp history.

## Recommended gateway posture

- `gateway.mode: "local"`
- `gateway.bind: "loopback"`
- `gateway.auth.mode: "token"`
- one live agent only: `socio`
- `agents.defaults.thinkingDefault: "minimal"`
- `agents.list[].fastModeDefault: true` for `socio`
- `openclaw skills install <slug>` installs ClawHub skills into the active workspace `skills/` folder; keep skills scoped to each specialist workspace
- `channels.telegram.streaming.mode: "off"` to prefer simple final Telegram replies
- `channels.telegram.replyToMode: "first"` so replies stay anchored to the initiating message
- `socio` brand-pair routing should be configured so:
  - `socio post chezahub` targets Instagram + Facebook `ChezaHub`
  - `socio post playmechi` targets Instagram + Facebook `PlayMechi`
- brand-pair Meta env keys can be stored alongside the generic defaults:
  - `CHEZAHUB_INSTAGRAM_ACCESS_TOKEN`, `CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID`, `CHEZAHUB_FACEBOOK_PAGE_ID`, `CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN`
  - `PLAYMECHI_INSTAGRAM_ACCESS_TOKEN`, `PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID`, `PLAYMECHI_FACEBOOK_PAGE_ID`, `PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN`
- `channels.telegram.dmPolicy: "allowlist"` so only approved operator DMs can reach `socio`
- Installed host CLIs: AWS CLI, Membrane CLI, and Cloudflared
- Installed live SMM skills:
  - `cloudinary`
  - `openclaw-meta-ads`
  - `meta-ads-manager`
  - `instagram-api`
  - `instagram-content-studio`
  - local `mechi-social-exec`
- Direct `meta-ads` and `instagram` ClawHub archives were skipped because they lacked a valid top-level `SKILL.md`; use the growth alternatives above
- `scripts/openclaw-configure-socio-telegram.sh` keeps the `socio` Telegram routing and social env values in sync
- `scripts/openclaw-prune-smm-only.sh` disables bridge/WhatsApp/Nginx, archives unused state, and keeps the gateway focused on SMM only

## Telegram on the OpenClaw host

The current production path is the native OpenClaw Telegram channel, not the custom poller.

Current posture:

- Telegram is configured directly in `~/.openclaw/openclaw.json`
- the live bot token should be sourced from `~/.openclaw/.env`, not stored in plaintext config
- approved operator DMs resolve to `socio`
- the Boss private `OPS` Telegram group should resolve to `socio`
- DMs are allowlisted so only approved operator chat ids can control the live agent
- groups are allowlisted; the live config keeps only the Boss private `OPS` room
- the Boss private `OPS` SMM room can be configured with `scripts/openclaw-configure-socio-telegram.sh`
- current live Boss private `OPS` forum topic binding: `SMM` = `topicId 7` -> `socio`
- mode is polling, which works without an external HTTPS webhook
- `gateway.controlUi.allowInsecureAuth` should stay disabled unless there is a very specific localhost-only compatibility need

Use the custom poller only as a fallback if you intentionally want a separate Telegram prompt layer outside the native OpenClaw channel.

## WhatsApp on the OpenClaw host

Native OpenClaw WhatsApp is currently paused on the EC2 host. Do not relink or re-enable it unless the Boss explicitly wants WhatsApp back in production.

The 2026-05-10 prune moved native WhatsApp credentials out of `~/.openclaw/credentials/whatsapp` and removed WhatsApp from the live `openclaw.json`, specifically to stop the repeating `401 Unauthorized` restart loop that was slowing the gateway.

If WhatsApp is brought back later:

- restore it as a separate deliberate project
- relink from EC2 only
- keep the SMM Telegram runtime stable first
- use `OPENCLAW_WHATSAPP_EC2_RUNBOOK.md` for the relink path
- use Meta Cloud API and approved templates for opted-in player traffic where possible instead of native WhatsApp Web automation

## EC2-only restart rule

Restart the gateway on EC2 only. Do not start a Windows/local OpenClaw gateway for Mechi production.

Current EC2 restart flow for the live SMM-only runtime:

```bash
cd /home/ubuntu/mechi-v3
git pull --ff-only
npm install --omit=dev
bash scripts/openclaw-configure-socio-telegram.sh
bash scripts/openclaw-prune-smm-only.sh
systemctl --user restart openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

If the service names differ on the host, list them with:

```bash
systemctl list-units --type=service | grep -Ei 'openclaw|mechi'
```
