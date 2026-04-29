# Mechi OpenClaw Bridge

This service is a thin HTTP wrapper that lets the Mechi app talk to a dedicated OpenClaw instance without changing the existing app-side contracts.

It exposes:

- `POST /v1/mechi-support-reply`
- `POST /webhooks/instagram`
- `GET /healthz`

In production on the EC2 host, Nginx is expected to proxy public port `80` to this local bridge service.

Both POST routes require `Authorization: Bearer <MECHI_OPENCLAW_BRIDGE_TOKEN>`.

This folder also includes `telegram-poller.mjs`, which can link a Telegram bot directly to the OpenClaw host using `getUpdates` polling instead of webhooks when you intentionally want a custom bridge layer.

## Why this exists

The Mechi Next.js app already sends:

- support inbox requests with `thread_id`, `conversation`, `mechi_context`, and a strict JSON reply contract
- Instagram DM bridge requests with `sender`, `recipient`, `message`, and optional fallback auth

OpenClaw is great at the agent runtime, session state, and operator tooling, but it does not natively speak Mechi's existing request/response shapes. This bridge keeps the app stable while routing the work into a dedicated OpenClaw agent.

## Environment

```env
MECHI_OPENCLAW_BRIDGE_HOST=127.0.0.1
MECHI_OPENCLAW_BRIDGE_PORT=8788
MECHI_OPENCLAW_BRIDGE_TOKEN=replace-with-a-long-random-token

MECHI_OPENCLAW_SUPPORT_AGENT=support
MECHI_OPENCLAW_INSTAGRAM_AGENT=support
MECHI_OPENCLAW_TIMEOUT_SECONDS=120
MECHI_OPENCLAW_MAX_BODY_BYTES=256000

# Optional when openclaw is not on PATH.
OPENCLAW_BIN=/home/ubuntu/.npm-global/bin/openclaw

# Optional Telegram poller settings.
MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN=
# support is customer-safe and includes built-in Mechi product context.
# For an operator fallback bot, set mode=direct, agent=default/main, and restrict allowed chat ids.
MECHI_OPENCLAW_TELEGRAM_MODE=support
MECHI_OPENCLAW_TELEGRAM_AGENT=support
MECHI_OPENCLAW_TELEGRAM_MODEL=openai-codex/gpt-5.5
MECHI_OPENCLAW_TELEGRAM_TIMEOUT_SECONDS=120
MECHI_OPENCLAW_TELEGRAM_POLL_TIMEOUT_SECONDS=25
MECHI_OPENCLAW_TELEGRAM_RETRY_DELAY_MS=3000
MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_TYPES=private
MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_IDS=
MECHI_OPENCLAW_TELEGRAM_DELETE_WEBHOOK=true
```

## Run locally

```bash
node ops/openclaw-bridge/server.mjs
```

Run the Telegram poller on the host:

```bash
node ops/openclaw-bridge/telegram-poller.mjs
```

## Expected OpenClaw side

Recommended gateway layout for the dedicated Mechi instance:

- `control` agent: workspace points at the Mechi repo, tool profile `coding`
- `support` agent: separate support workspace, tool profile `minimal`
- `community` agent: separate community workspace, tool profile `minimal`
- gateway: loopback-only with token auth
- `gh` plus `GH_TOKEN` / `GH_REPO` on the host for repo-aware GitHub operations from the control agent, with `scripts/openclaw-gh.sh` handling env loading and explicit `--exec 'gh ... "$GH_REPO" ...'` repo scoping when needed
- `notesmd-cli` plus an `obsidian-cli` compatibility wrapper on the host for durable Obsidian-style operator memory without a desktop app
- `MECHI_OBSIDIAN_VAULT=mechi-ops`, `MECHI_OBSIDIAN_VAULT_PATH=/home/ubuntu/.openclaw/vaults/mechi-ops`, and `EDITOR=/usr/bin/cat` for headless note operations from the control agent
- `ops/obsidian-vault-seed` copied into the live vault so the COO agent starts with Mechi-specific structure instead of an empty notebook

This keeps operator access powerful while keeping customer-facing support and community replies tool-free.

## Nginx front door

Use `ops/openclaw-bridge/mechi-openclaw.nginx.conf` on the host to expose:

- `http://your-host/healthz`
- `http://your-host/v1/mechi-support-reply`
- `http://your-host/webhooks/instagram`

The bundled config sets longer proxy timeouts so Mechi support and Instagram replies can wait on OpenClaw runs without Nginx returning `504 Gateway Time-out`.

## Telegram on OpenClaw

Preferred setup: use the native OpenClaw Telegram channel on the gateway.

Current live posture:

- Telegram is configured directly on the gateway and runs in polling mode
- approved operator DMs should route to the repo-capable `control` agent
- the internal `MECHI OPS` group should route to the repo-capable `control` agent
- other group and social chatter should route to the `community` agent
- operator DMs should stay allowlisted so only approved chats can drive that agent
- group handling should be enabled through `channels.telegram.groups` with `requireMention: true` by default
- `MECHI OPS` should carry an internal operations system prompt rather than the generic community prompt
- `MECHI OPS` should run approved-operator no-tag mode with `requireMention: false` and `allowFrom: [6806783421, 6738706706]`
- the broader Telegram group default remains mention-only unless widened on purpose
- Telegram forum topics can be handled as topic-scoped sessions, which is how `MECHI OPS` `#Registrations` is currently routed into `control`
- the `#Registrations` topic should be allowed to run the approved live Supabase helper `npm run ops:registrations -- --json --summary-only`
- live tournament/event questions should be allowed to run `npm run ops:tournaments -- --json --summary-only`
- if the legacy `telegram-poller.mjs` fallback is used for operator control, set `MECHI_OPENCLAW_TELEGRAM_MODE=direct`, `MECHI_OPENCLAW_TELEGRAM_AGENT=default` or `main`, and `MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_IDS` to the approved operator ids
- `streaming.mode: "off"` and `replyToMode: "first"` are recommended for stable, simple Telegram delivery
- GitHub CLI should be installed on the host if the control agent needs PR, issue, or workflow visibility

Use `telegram-poller.mjs` only if you deliberately want a custom prompt/translation layer outside the native OpenClaw channel.

## WhatsApp operator groups

Native OpenClaw WhatsApp sessions are not the same as the Mechi app WhatsApp Cloud API webhook. If WhatsApp group messages are enabled on the OpenClaw host:

- operator/admin groups such as `MECHI ADMINS` should route to `control`
- customer support DMs should stay on the support inbox/player-action path
- live tournament availability should be answered through `npm run ops:tournaments -- --json --summary-only`
- a deployed/restarted OpenClaw WhatsApp process is required before prompt or routing changes show up in WhatsApp Web
