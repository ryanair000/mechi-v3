# Tools

Repo and product surfaces:

- repo root: `/home/ubuntu/mechi-v3`
- player web app: `src/app/(app)`
- admin operations: `src/app/admin`
- API routes: `src/app/api`
- Android app: `apps/android`
- marketing dashboard: `apps/marketing`
- operations dossier: `MECHI_OPERATIONS.md`
- role and access matrix: `MECHI_AGENT_MATRIX.md`
- live runtime brief: `OPENCLAW_LIVE_STATE.md`
- Supabase bootstrap schema: `supabase/bootstrap_from_empty_project.sql`
- live registration helper: `npm run ops:registrations -- --json`
- workspace skill: `skills/supabase-live-ops/SKILL.md`
- PlayMechi tournament skill: `skills/playmechi-tournament-ops/SKILL.md`
- PlayMechi public paths: `/`, `/playmechi`, and `/playmechi/register`
- PlayMechi admin control: `/admin/online-tournament`
- GitHub CLI wrapper: `./scripts/openclaw-gh.sh`
  It loads host and repo env, derives `GH_REPO` from git remote when needed, and supports `--exec 'gh ... "$GH_REPO" ...'` for explicit repo scoping.
- GitHub skill: `skills/github-ops/SKILL.md`
- Obsidian CLI wrapper: `./scripts/openclaw-obsidian.sh`
  It loads host and repo env, defaults the editor to `/usr/bin/cat`, and is the safest path for headless note operations.
- Obsidian compatibility shim source: `scripts/obsidian-cli-compat.sh`
- Obsidian skill: `skills/obsidian-ops/SKILL.md`
- Obsidian vault seed: `ops/obsidian-vault-seed`
- repo remote: `https://github.com/ryanair000/mechi-v3.git`
- OpenClaw bridge code: `ops/openclaw-bridge` and `src/lib/openclaw-bridge.ts`

Live OpenClaw host:

- gateway user service: `systemctl --user status openclaw-gateway.service`
- Mechi bridge service: `sudo systemctl status mechi-openclaw-bridge.service`
- gateway config: `~/.openclaw/openclaw.json`
- control workspace: `/home/ubuntu/mechi-v3`
- support workspace: `~/.openclaw/workspace-support`
- community workspace: `~/.openclaw/workspace-community`
- infra workspace: `~/.openclaw/workspace-infra`
- billing workspace: `~/.openclaw/workspace-billing`
- data workspace: `~/.openclaw/workspace-data`
- growth workspace: `~/.openclaw/workspace-growth`
- Obsidian vault path: `~/.openclaw/vaults/mechi-ops`

OpenClaw native and ClawHub:

- validate config: `openclaw config validate --json`
- list live agents: `openclaw agents list --json`
- install ClawHub skills from the target workspace context: `openclaw skills install <slug>`
- current `infra` skills: `aws`, `openclaw-security-scanner`, `incident`, `incident-hotfix`
- current `billing` skills: `paystack`
- current `data` skills: `ga4`, `skill-ga4-analytics`, `marketing-analytics`
- current `growth` skills: `cloudinary`, `openclaw-meta-ads`, `meta-ads-manager`, `instagram-api`, `instagram-content-studio`
- current `support` skills: `whatsapp-business`, `customer-support-autopilot`
- current repo/control skills: `supabase-live-ops`, `playmechi-tournament-ops`, `github-ops`, `obsidian-ops`
- recommended support/community local skill copy: `playmechi-tournament-ops` for static public tournament FAQ; keep live Supabase checks on `control`
- do not use broken direct slugs `meta-ads` or `instagram`; their archives lacked a valid top-level `SKILL.md` during install, so the working alternatives above are the live source of truth.

Installed host CLIs:

- AWS CLI: `aws --version`
- Membrane CLI for Paystack skill auth: `membrane --version`
- Cloudflared for tunnel-based media/social studio workflows: `cloudflared version`

Telegram:

- bot: `@lokimaxdash_bot`
- native channel owner: OpenClaw gateway
- Boss DM agent: `control`
- community and social agent: `community`
- authorized operator chat id: `6806783421`
- the Boss is the authorized Telegram operator

Guardrails:

- treat Telegram, Instagram, WhatsApp, support inboxes, payouts, and production data as sensitive surfaces
- verify before user-visible or business-critical actions
- for live registration questions, prefer the Supabase helper over public-site counts or repo inspection
- for PlayMechi tournament questions, use `skills/playmechi-tournament-ops/SKILL.md`; for live slot counts inspect `onlineTournament` from `npm run ops:registrations -- --json`
- for GitHub questions, prefer `./scripts/openclaw-gh.sh` over guessing from partial local git state
- for durable notes or memory capture, prefer `./scripts/openclaw-obsidian.sh` over raw `obsidian-cli`
- for AWS/host incidents, route to `infra` unless the Boss explicitly wants `control` to execute
- for Paystack or billing investigations, route to `billing` and require explicit Boss approval before money-moving writes
- for GA4/Search Console/marketing reports, route to `data`
- for Cloudinary, Meta Ads, and Instagram campaign work, route to `growth` and require explicit Boss approval before publishing or spend changes
