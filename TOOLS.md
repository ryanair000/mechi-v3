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
- support workspace: `~/.openclaw/workspace-support`
- community workspace: `~/.openclaw/workspace-community`
- Obsidian vault path: `~/.openclaw/vaults/mechi-ops`

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
- for GitHub questions, prefer `./scripts/openclaw-gh.sh` over guessing from partial local git state
- for durable notes or memory capture, prefer `./scripts/openclaw-obsidian.sh` over raw `obsidian-cli`
