# OpenClaw Live State

## Agents

- `control` = Mechi COO
- `support` = Mechi Support
- `community` = Mechi Community
- `infra` = Mechi Infra
- `billing` = Mechi Billing
- `data` = Mechi Data
- `growth` = Mechi Growth

## Telegram routing

- approved operator DMs -> `control`
- approved operator ids: `6806783421`, `6738706706`
- `MECHI OPS` internal group -> `control`
- broader group/community traffic -> `community`

## Truth paths

- registrations: `npm run ops:registrations -- --json`
- PlayMechi tournament facts: `skills/playmechi-tournament-ops/SKILL.md`
- PlayMechi live registration state: `npm run ops:registrations -- --json`, then read `onlineTournament`
- GitHub: `./scripts/openclaw-gh.sh`
- durable notes and memory: `./scripts/openclaw-obsidian.sh`

## ClawHub skill map

- `infra`: `aws`, `openclaw-security-scanner`, `incident`, `incident-hotfix`
- `billing`: `paystack`
- `data`: `ga4`, `skill-ga4-analytics`, `marketing-analytics`
- `growth`: `cloudinary`, `openclaw-meta-ads`, `meta-ads-manager`, `instagram-api`, `instagram-content-studio`
- `support`: `whatsapp-business`, `customer-support-autopilot`
- `control` repo skills: `supabase-live-ops`, `playmechi-tournament-ops`, `github-ops`, `obsidian-ops`
- `support` and `community` may carry static `playmechi-tournament-ops` copies for public FAQ only

## Provider gates

- Skills are installed, but provider access still depends on credentials or OAuth.
- Paystack uses Membrane login/OAuth.
- AWS needs AWS credentials and region.
- GA4/Search Console needs Google Analytics credentials.
- Cloudinary, Instagram, Meta Ads, and WhatsApp each need their own provider credentials.

## Integrations already wired

- native OpenClaw Telegram channel
- Nginx front door for the Mechi bridge
- GitHub CLI auth
- Supabase live-ops helper
- PlayMechi tournament ops skill and Obsidian tournament memory
- headless Obsidian vault at `~/.openclaw/vaults/mechi-ops`
- AWS CLI, Membrane CLI, and Cloudflared are installed on the EC2 host

## Caution

- vault notes support continuity but do not override live production truth
