# Mechi Agent Matrix

This file defines the recommended OpenClaw agent roster for Mechi, the skills each role needs, and the exact access surface each role should receive.

## Current live OpenClaw deployment

The EC2 OpenClaw gateway currently has these agents active:

- `control`: Mechi COO, workspace `/home/ubuntu/mechi-v3`, repo and operator control.
- `support`: Mechi Support, workspace `~/.openclaw/workspace-support`, installed skills `whatsapp-business` and `customer-support-autopilot`; local `playmechi-tournament-ops` for public tournament FAQ, plus `supabase-live-ops` only when an approved read-only helper runner is exposed.
- `community`: Mechi Community, workspace `~/.openclaw/workspace-community`, public/community-safe messaging; local `playmechi-tournament-ops` for announcement-safe tournament FAQ, plus `supabase-live-ops` only when an approved read-only helper runner is exposed.
- `infra`: Mechi Infra, workspace `~/.openclaw/workspace-infra`, installed skills `aws`, `openclaw-security-scanner`, `incident`, and `incident-hotfix`.
- `billing`: Mechi Billing, workspace `~/.openclaw/workspace-billing`, installed skill `paystack`.
- `data`: Mechi Data, workspace `~/.openclaw/workspace-data`, installed skills `ga4`, `skill-ga4-analytics`, and `marketing-analytics`.
- `growth`: Mechi Growth, workspace `~/.openclaw/workspace-growth`, installed skills `cloudinary`, `openclaw-meta-ads`, `meta-ads-manager`, `instagram-api`, and `instagram-content-studio`.

The direct ClawHub slugs `meta-ads` and `instagram` were skipped because their archives unpacked without a valid top-level `SKILL.md`; the growth workspace uses the working alternatives above. Provider credentials/OAuth are still separate from skill install and must be added per tool before live API calls.

## Access tiers

- `Tier 0 - public`: no secrets, public docs only.
- `Tier 1 - messaging`: channel tokens and delivery routes only.
- `Tier 2 - data read`: read-only product and support data.
- `Tier 3 - business write`: can update business records, support states, and operations data.
- `Tier 4 - repo and infra`: can edit code, run commands, deploy, and change production systems.

Rule: give each role the lowest tier that still lets it do its job.

## Current anchor agents

### `control`

- Role: Mechi COO
- Tool profile: `coding`
- Access tier: `Tier 4 - repo and infra`
- Primary surfaces: repo, operator Telegram DM, admin operations, incident response, OpenClaw host
- Skills:
  - repo navigation and code change execution
  - product and business prioritization
  - incident triage and rollback thinking
  - support escalation judgment
  - concise operator updates to the Boss
  - `supabase-live-ops` for live profile counts, PlayMechi tournament storage readiness, and per-game registrations
  - `playmechi-tournament-ops` for full Mechi.club Online Gaming Tournament facts, WhatsApp answers, rules, prizes, schedule, stream, and player roadmap
- Required access:
  - OpenClaw model auth via ChatGPT auth profile or `OPENAI_API_KEY`
  - repo write access and git credentials
  - `MECHI_OBSIDIAN_VAULT`
  - `MECHI_OBSIDIAN_VAULT_PATH`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL` only if direct SQL is intentionally allowed
  - `MECHI_OPENCLAW_BRIDGE_URL`
  - `MECHI_OPENCLAW_BRIDGE_TOKEN`
  - `OPENCLAW_WEBHOOK_URL`
  - `OPENCLAW_API_KEY`
  - `TELEGRAM_BOT_TOKEN` for native Telegram control
  - native OpenClaw WhatsApp access for Boss direct sender `+254708355692` and approved operator/admin groups on `+254733638841` when enabled
  - host-level access such as SSH key and AWS credentials when infra work is expected
- Guardrails:
  - addresses the owner as `Boss` or `the Boss`
  - asks before destructive, money-moving, or public-facing actions
  - only role that should routinely have shell and filesystem write access

### `support`

- Role: Player Support Lead
- Tool profile: `minimal`
- Access tier: `Tier 2` or `Tier 3` depending on whether refunds or account-state writes are allowed
- Primary surfaces: support inbox, Instagram DM bridge, customer-safe Telegram or WhatsApp support surfaces
- Skills:
  - empathetic customer communication
  - issue classification and escalation
  - policy recall
  - bug report summarization
  - safe handoff to `control`
  - `playmechi-tournament-ops` for public schedule, registration path, prize, and rule questions
  - read-only `supabase-live-ops` for verified PlayMechi slot counts when the helper is available
- Required access:
  - OpenClaw model auth via ChatGPT auth profile or `OPENAI_API_KEY`
  - `MECHI_OPENCLAW_BRIDGE_URL`
  - `MECHI_OPENCLAW_BRIDGE_TOKEN`
  - `OPENCLAW_WEBHOOK_URL`
  - `OPENCLAW_API_KEY`
  - `INSTAGRAM_PAGE_ACCESS_TOKEN`
  - `INSTAGRAM_APP_SECRET`
  - `INSTAGRAM_VERIFY_TOKEN`
  - `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
  - `WHATSAPP_TOKEN` for Meta Cloud API player/customer WhatsApp support when enabled
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
  - native OpenClaw WhatsApp customer-safe access for non-operator DMs on `+254113033475` and `+254733638841`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` for read-only customer-safe lookups
  - `SUPABASE_SERVICE_ROLE_KEY` only if support workflows truly require writes
- Guardrails:
  - no repo write access
  - no shell access
  - no infra credentials
  - should not hold payment-provider write credentials
  - no Supabase service-role key unless explicitly approved; read-only PlayMechi counts can use the approved helper if available, while eligibility, payouts, disputes, or disqualifications route to `control`

## Recommended specialist agents

### `tournaments`

- Role: Tournament Operations Manager
- Tool profile: `minimal`
- Access tier: `Tier 3 - business write`
- Primary surfaces: tournament setup, match disputes, scheduling, brackets, prize readiness
- Skills:
  - tournament rule enforcement
  - schedule management
  - dispute handling
  - clear player-facing announcements
  - `playmechi-tournament-ops`
  - `supabase-live-ops` if this role is granted production read/write tournament operations
- Required access:
  - OpenClaw model auth
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TELEGRAM_BOT_TOKEN` only if tournament broadcasts happen through Telegram
  - `RESEND_API_KEY` only if tournament email notices are sent directly
- Guardrails:
  - no code deployment access
  - no AWS credentials
  - no payment-provider master secrets

### `billing`

- Role: Revenue and Billing Ops
- Tool profile: `minimal`
- Access tier: `Tier 3 - business write`
- Primary surfaces: subscriptions, payment checks, reward redemption exceptions, finance audit trail
- Skills:
  - pricing and plan-state reasoning
  - careful exception handling
  - audit-minded communication
  - escalation discipline
- Required access:
  - OpenClaw model auth
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - payment-provider secret keys if Mechi uses them in production
  - `RESEND_API_KEY` for receipts or finance follow-up
- Guardrails:
  - no repo write by default
  - no AWS credentials by default
  - no social-channel posting credentials

### `rewards`

- Role: Rewards and Economy Manager
- Tool profile: `minimal`
- Access tier: `Tier 3 - business write`
- Primary surfaces: rewards, coins, spins, referrals, leaderboard moderation
- Skills:
  - rewards policy reasoning
  - abuse and anomaly spotting
  - player-value judgment
  - structured investigation notes
- Required access:
  - OpenClaw model auth
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Guardrails:
  - no shell
  - no deploy credentials
  - no broad messaging-post privileges unless intentionally combined with support

### `growth`

- Role: Growth and Marketing Manager
- Tool profile: `minimal`
- Access tier: `Tier 1` or `Tier 2`
- Primary surfaces: campaign planning, content operations, funnels, promo copy, launch coordination
- Skills:
  - campaign planning
  - conversion-oriented writing
  - social messaging
  - KPI summarization
- Required access:
  - OpenClaw model auth
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `INSTAGRAM_PAGE_ACCESS_TOKEN` if posting or DM-based campaigns are handled here
  - `TELEGRAM_BOT_TOKEN` only if broadcast posting is part of the role
  - analytics read access through `NEXT_PUBLIC_SUPABASE_URL` and safe reporting views
- Guardrails:
  - no service-role DB key unless absolutely necessary
  - no repo write by default
  - no payment or infra credentials

### `community`

- Role: Community and Social Manager
- Tool profile: `minimal`
- Access tier: `Tier 1 - messaging`
- Primary surfaces: Telegram communities, Instagram replies, WhatsApp community updates, announcements
- Skills:
  - moderation
  - tone management
  - de-escalation
  - fast routing of issues into support or operations
  - `playmechi-tournament-ops` for public schedule, registration path, prize, and rule questions
  - read-only `supabase-live-ops` for verified PlayMechi slot counts when the helper is available
- Required access:
  - OpenClaw model auth
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID`
  - `INSTAGRAM_PAGE_ACCESS_TOKEN`
  - `WHATSAPP_TOKEN` for Meta Cloud API WhatsApp only if community messaging is explicitly approved
  - native OpenClaw WhatsApp customer-safe access for non-operator DMs on `+254113033475` and `+254733638841` when configured
- Guardrails:
  - no DB write access by default
  - no repo write
  - no deploy or payment credentials
  - no Supabase service-role key by default; read-only PlayMechi counts can use the approved helper if available, while payout, eligibility, dispute, or disqualification questions route to `control`
  - no native OpenClaw WhatsApp access to Boss/operator routes; non-Boss direct senders on `+254113033475` and `+254733638841` may be treated as customer-safe tournament inquiries

### `repo-engineering`

- Role: Repo Engineering Lead
- Tool profile: `coding`
- Access tier: `Tier 4 - repo and infra`
- Primary surfaces: code changes, testing, migrations, bug fixes, release prep
- Skills:
  - TypeScript and Next.js repo work
  - testing and debugging
  - migration safety
  - release-note writing
- Required access:
  - OpenClaw model auth
  - git credentials
  - `GH_TOKEN` or `GITHUB_TOKEN`
  - `GH_REPO`
  - `MECHI_OBSIDIAN_VAULT`
  - `MECHI_OBSIDIAN_VAULT_PATH`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL` only if direct SQL work is required
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET` when media tooling is part of the task
  - `MUX_TOKEN_ID`
  - `MUX_TOKEN_SECRET`
  - `MUX_WEBHOOK_SECRET`
  - `MUX_SIGNING_KEY_ID`
  - `MUX_SIGNING_PRIVATE_KEY`
- Guardrails:
  - should not own customer-facing support channels
  - should not hold finance credentials unless directly needed for a fix

### `infra`

- Role: Infra and Deployment Operator
- Tool profile: `coding`
- Access tier: `Tier 4 - repo and infra`
- Primary surfaces: EC2, systemd, Nginx, OpenClaw host, DNS, bridge uptime, backups
- Skills:
  - Linux operations
  - networking
  - secrets handling
  - service recovery
  - deployment verification
- Required access:
  - OpenClaw model auth
  - SSH key access
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - DNS or hosting provider credentials where applicable
  - `MECHI_OPENCLAW_BRIDGE_TOKEN`
  - `TELEGRAM_BOT_TOKEN` only for native channel troubleshooting
- Guardrails:
  - should not answer customer conversations directly
  - should not hold broad marketing or billing privileges unless there is an operational dependency

### `data`

- Role: Data and Insights Analyst
- Tool profile: `minimal`
- Access tier: `Tier 2 - data read`
- Primary surfaces: KPI review, churn signals, support trends, tournament reporting, reward abuse review
- Skills:
  - SQL reasoning
  - pattern recognition
  - concise reporting
  - decision-support summaries
- Required access:
  - OpenClaw model auth
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` or a dedicated read-only analytics credential
  - `NEXT_PUBLIC_TESTS_URL` if QA trends are part of reports
- Guardrails:
  - no service-role key unless explicitly approved
  - no channel-posting credentials by default
  - no shell or deploy access

## Key bundles by function

### OpenClaw runtime

- ChatGPT auth profile or `OPENAI_API_KEY`
- `MECHI_OPENCLAW_BRIDGE_URL`
- `MECHI_OPENCLAW_BRIDGE_TOKEN`
- `OPENCLAW_WEBHOOK_URL`
- `OPENCLAW_API_KEY`
- `OPENCLAW_TIMEOUT_MS`

### Native Telegram

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN`
- `MECHI_OPENCLAW_TELEGRAM_MODE`
- `MECHI_OPENCLAW_TELEGRAM_AGENT`
- `MECHI_OPENCLAW_TELEGRAM_MODEL`
- `MECHI_OPENCLAW_TELEGRAM_TIMEOUT_SECONDS`
- `MECHI_OPENCLAW_TELEGRAM_POLL_TIMEOUT_SECONDS`
- `MECHI_OPENCLAW_TELEGRAM_RETRY_DELAY_MS`
- `MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_TYPES`
- `MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_IDS`
- `MECHI_OPENCLAW_TELEGRAM_DELETE_WEBHOOK`

### Support and messaging

- `INSTAGRAM_VERIFY_TOKEN`
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- `INSTAGRAM_APP_SECRET`
- `INSTAGRAM_PAGE_ACCESS_TOKEN`
- `INSTAGRAM_GRAPH_API_VERSION`
- `INSTAGRAM_FALLBACK_REPLY`
- `WHATSAPP_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Data and product

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `MECHI_OBSIDIAN_VAULT`
- `MECHI_OBSIDIAN_VAULT_PATH`

### Media and content

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `MUX_TOKEN_ID`
- `MUX_TOKEN_SECRET`
- `MUX_WEBHOOK_SECRET`
- `MUX_SIGNING_KEY_ID`
- `MUX_SIGNING_PRIVATE_KEY`

## Recommended deployment posture

- Keep `control` and `infra` as the only `coding` profile agents.
- Keep `support`, `tournaments`, `billing`, `rewards`, `growth`, `community`, and `data` on `minimal`.
- Do not reuse one secret bundle across all agents.
- Prefer one OpenClaw agent per operating role rather than one mega-agent with every secret.
- Rotate messaging and service-role secrets separately.
- Log and review every action that can change money, player accounts, rewards, or production infrastructure.
