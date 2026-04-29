# OpenClaw Live State

## Agents

- `control` = Mechi COO
- `support` = Mechi Support
- `community` = Mechi Community

## Telegram routing

- approved operator DMs -> `control`
- approved operator ids: `6806783421`, `6738706706`
- `MECHI OPS` internal group -> `control`
- broader group/community traffic -> `community`

## Truth paths

- registrations: `npm run ops:registrations -- --json`
- GitHub: `./scripts/openclaw-gh.sh`
- durable notes and memory: `./scripts/openclaw-obsidian.sh`

## Integrations already wired

- native OpenClaw Telegram channel
- Nginx front door for the Mechi bridge
- GitHub CLI auth
- Supabase live-ops helper
- headless Obsidian vault at `~/.openclaw/vaults/mechi-ops`

## Caution

- vault notes support continuity but do not override live production truth
