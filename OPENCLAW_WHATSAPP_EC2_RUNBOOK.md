# OpenClaw Native WhatsApp EC2 Runbook

This runbook links the native OpenClaw WhatsApp plugin for Mechi.

Target number:

- current native OpenClaw account: `+254113033475` (`accountId=254113033475`)
- legacy native account: `+254733638841` is disabled unless the Boss explicitly approves relinking it

Purpose:

- Boss/operator direct messages route to the repo-capable `control` agent.
- Other direct senders are gamers/player tournament inquiries and must stay customer-safe, short, and low-volume.
- Operator/admin WhatsApp groups should route to `control` when exact group routing is configured.
- Use `skills/playmechi-tournament-ops/SKILL.md` for fixed tournament facts.
- Use `npm run ops:registrations -- --json` for live PlayMechi slot counts.

Do not use native WhatsApp for marketing broadcasts, mass tournament reminders, cold outreach, or repeated automated replies to unknown chats. Player/customer WhatsApp should still move to Meta Cloud API on `+254113033475` and the Mechi app webhook once production WABA setup is approved.

## Before login

If `+254733638841` was recently shadowbanned or restricted, keep it disabled until normal manual send/receive behavior is healthy. Do not repeatedly scan QR codes, run multiple web sessions, or connect from a local Windows/laptop gateway.

Use exactly one production host:

- EC2 OpenClaw host: allowed.
- Local Windows/laptop gateway: not production.

## EC2 command sequence

Run this from your laptop terminal, replacing the EC2 host value:

```bash
ssh ubuntu@<EC2_PUBLIC_IP_OR_HOSTNAME>
```

Then run this on EC2:

```bash
set -euo pipefail

export MECHI_NATIVE_WHATSAPP_NUMBER="+254113033475"
export MECHI_NATIVE_WHATSAPP_ACCOUNT_ID="254113033475"
export MECHI_REPO="/home/ubuntu/mechi-v3"

cd "$MECHI_REPO"
git pull --ff-only
npm install --omit=dev

# Record the intended native WhatsApp number without storing secrets.
mkdir -p ~/.openclaw
touch ~/.openclaw/.env
chmod 600 ~/.openclaw/.env
grep -q '^MECHI_NATIVE_WHATSAPP_NUMBER=' ~/.openclaw/.env || \
  printf '\nMECHI_NATIVE_WHATSAPP_NUMBER=%s\n' "$MECHI_NATIVE_WHATSAPP_NUMBER" >> ~/.openclaw/.env

# Keep the tournament public FAQ skill available to customer-safe workspaces.
install -d ~/.openclaw/workspace-support/skills/playmechi-tournament-ops
install -d ~/.openclaw/workspace-community/skills/playmechi-tournament-ops
cp -a skills/playmechi-tournament-ops/. ~/.openclaw/workspace-support/skills/playmechi-tournament-ops/
cp -a skills/playmechi-tournament-ops/. ~/.openclaw/workspace-community/skills/playmechi-tournament-ops/

# Validate OpenClaw before touching the WhatsApp session.
openclaw config validate --json

# Configure the active native WhatsApp account.
openclaw config set channels.whatsapp.enabled true
openclaw config set channels.whatsapp.defaultAccount "$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID"
openclaw config set channels.whatsapp.dmPolicy open
openclaw config set channels.whatsapp.allowFrom '["*"]' --strict-json
openclaw config set channels.whatsapp.accounts.default.enabled false
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".enabled true
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".name "$MECHI_NATIVE_WHATSAPP_NUMBER native OpenClaw WhatsApp"
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".authDir "~/.openclaw/credentials/whatsapp/$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID"
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".dmPolicy open
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".allowFrom '["*"]' --strict-json

# Restart whichever OpenClaw gateway unit exists on this host.
if systemctl --user list-unit-files | grep -q '^openclaw-gateway.service'; then
  systemctl --user restart openclaw-gateway.service
  systemctl --user status openclaw-gateway.service --no-pager
else
  sudo systemctl restart openclaw-gateway
  sudo systemctl status openclaw-gateway --no-pager
fi

# Restart the Mechi bridge if it exists.
if systemctl list-units --type=service --all | grep -q 'mechi-openclaw-bridge'; then
  sudo systemctl restart mechi-openclaw-bridge
  sudo systemctl status mechi-openclaw-bridge --no-pager
fi

# Use the OpenClaw runtime installed on EC2.
export OPENCLAW_DIST_DIR="${OPENCLAW_DIST_DIR:-$HOME/.openclaw/tools/node-v22.22.0/lib/node_modules/openclaw/dist}"

# Run once. Scan with WhatsApp > Linked Devices on +254113033475 only.
npm run ops:whatsapp-qr -- --account="$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID" --qr-timeout-ms=180000 --wait-timeout-ms=600000
```

After scanning:

```bash
cd /home/ubuntu/mechi-v3
openclaw config validate --json

if systemctl --user list-unit-files | grep -q '^openclaw-gateway.service'; then
  journalctl --user -u openclaw-gateway.service -n 120 --no-pager
else
  sudo journalctl -u openclaw-gateway -n 120 --no-pager
fi
```

## Required OpenClaw routing posture

Before live use, confirm the OpenClaw native WhatsApp channel is configured so:

- approved operator/admin groups route to `control`;
- unknown groups are ignored or require an explicit mention;
- Boss/operator DMs route to `control`;
- non-operator DMs stay customer-safe and tournament-focused;
- support/community agents do not handle operator WhatsApp groups;
- `control` has the Mechi repo workspace `/home/ubuntu/mechi-v3`;
- `support` and `community` only get static tournament FAQ facts unless the Boss explicitly grants live-data access.

## Anti-ban operating limits

For native WhatsApp:

- One linked production session on EC2 only.
- No bulk sends, no contact scraping, no cold DMs, no invite-link spam, no repeated identical messages.
- Keep group automation mention-gated unless the group is a small approved internal operations group.
- Add rate limits at the OpenClaw/plugin layer when available: low burst size, low hourly cap, and quiet hours.
- Use short, relevant replies. Avoid link-heavy messages and URL shorteners.
- Do not send payment, prize, disqualification, or eligibility decisions automatically.
- If users block/report the number, or delivery starts behaving oddly, stop automation and investigate before continuing.

For player/customer messaging:

- Use Meta Cloud API on `+254113033475`.
- Use approved templates outside the 24-hour service window.
- Message only opted-in players.
- Honor opt-outs immediately.
