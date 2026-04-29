# OpenClaw Host

## Host purpose

- dedicated OpenClaw runtime for Mechi
- native Telegram channel attached to the gateway
- Mechi bridge and Nginx front door for app compatibility

## Important paths

- repo workspace: `/home/ubuntu/mechi-v3`
- OpenClaw env: `/home/ubuntu/.openclaw/.env`
- dedicated vault: `/home/ubuntu/.openclaw/vaults/mechi-ops`

## Important services

- `openclaw-gateway.service`
- `mechi-openclaw-bridge.service`
- `nginx`

## Notes

- GitHub CLI is wired through `./scripts/openclaw-gh.sh`
- Obsidian memory is wired through `./scripts/openclaw-obsidian.sh`
- this host is headless, so note-open actions should stay terminal-safe
