# OpenClaw Native WhatsApp EC2 Runbook

This runbook links the native OpenClaw WhatsApp plugin for Mechi.

Target number:

- current native OpenClaw account: `+254113033475` (`accountId=254113033475`)
- second native support account approved by the Boss: `+254733638841` (`accountId=default`)
- both accounts are reported by the Boss as logged in and responding as of 2026-05-03 EAT
- `+254733638841` requires a clean EC2 QR relink only if logs again show WhatsApp Web `440 session conflict`

Purpose:

- Boss/operator direct messages route to the repo-capable `control` agent.
- Other direct senders are gamers/player tournament inquiries and must stay customer-safe, short, and low-volume.
- Operator/admin WhatsApp groups should route to `control` when exact group routing is configured.
- Use `skills/playmechi-tournament-ops/SKILL.md` for fixed tournament facts.
- Use `npm run ops:registrations -- --json` for live PlayMechi slot counts.

Do not use native WhatsApp for marketing broadcasts, mass tournament reminders, cold outreach, or repeated automated replies to unknown chats. Player/customer WhatsApp should still move to Meta Cloud API on `+254113033475` and the Mechi app webhook once production WABA setup is approved.

## Before login

If `+254733638841` was recently shadowbanned or restricted, keep it quiet until normal manual send/receive behavior is healthy. Do not repeatedly scan QR codes, run multiple web sessions, or connect from a local Windows/laptop gateway. If OpenClaw logs show `440 session conflict`, back up only `~/.openclaw/credentials/whatsapp/default` and relink it with a fresh QR.

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
export MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER="+254733638841"
export MECHI_NATIVE_SUPPORT_WHATSAPP_ACCOUNT_ID="default"
export MECHI_WHATSAPP_CONTROL_GROUP_IDS=""
export MECHI_WHATSAPP_CUSTOMER_GROUP_IDS=""
export MECHI_WHATSAPP_CUSTOMER_GROUP_AGENT="community"
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
install -d ~/.openclaw/workspace-support ~/.openclaw/workspace-community
cp -a ops/openclaw-support-workspace/. ~/.openclaw/workspace-support/
cp -a ops/openclaw-community-workspace/. ~/.openclaw/workspace-community/

# Validate OpenClaw before touching the WhatsApp session.
openclaw config validate --json

# Configure the active native WhatsApp account.
openclaw config set channels.whatsapp.enabled true
openclaw config set channels.whatsapp.defaultAccount "$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID"
openclaw config set channels.whatsapp.dmPolicy open
openclaw config set channels.whatsapp.allowFrom '["*"]' --strict-json
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".enabled true
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".name "$MECHI_NATIVE_WHATSAPP_NUMBER native OpenClaw WhatsApp"
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".authDir "~/.openclaw/credentials/whatsapp/$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID"
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".dmPolicy open
openclaw config set channels.whatsapp.accounts."$MECHI_NATIVE_WHATSAPP_ACCOUNT_ID".allowFrom '["*"]' --strict-json

# Configure the second logged-in support account too.
openclaw config set channels.whatsapp.accounts.default.enabled true
openclaw config set channels.whatsapp.accounts.default.name "$MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER native OpenClaw WhatsApp"
openclaw config set channels.whatsapp.accounts.default.authDir "~/.openclaw/credentials/whatsapp/default"
openclaw config set channels.whatsapp.accounts.default.dmPolicy open
openclaw config set channels.whatsapp.accounts.default.allowFrom '["*"]' --strict-json

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

After both numbers are logged in, sync the current customer-service brain to both live workspaces.

Before syncing, discover WhatsApp group JIDs for known Mechi groups and set exact routing:

```bash
openclaw directory peers list --channel whatsapp --query "MECHI"
```

Set `MECHI_WHATSAPP_CONTROL_GROUP_IDS` to operator/admin group JIDs such as `MECHI ADMINS`, and set `MECHI_WHATSAPP_CUSTOMER_GROUP_IDS` to player/community group JIDs such as `MECHI 1v1` or `MECHI BETA`. Values are comma-separated WhatsApp group IDs such as `120363403215116621@g.us`. Customer groups default to `community`; use `MECHI_WHATSAPP_CUSTOMER_GROUP_AGENT=support` only when those groups are purely support inboxes.

```bash
cd /home/ubuntu/mechi-v3
git pull --ff-only
bash scripts/openclaw-sync-customer-workspaces.sh
```

That copies the support/community workspaces, installs the PlayMechi and read-only live ops skills into both, configures both native WhatsApp accounts, validates OpenClaw, and restarts the gateway/bridge.

If the group ID variables are empty, the sync keeps the wildcard mention gate but does not pin known groups. Do not treat that as complete routing for live operator/admin groups.

To cleanly relink the second support number `+254733638841` after a `440 session conflict`:

```bash
set -euo pipefail

cd /home/ubuntu/mechi-v3
sudo systemctl stop openclaw-gateway

target="$HOME/.openclaw/credentials/whatsapp/default"
case "$target" in
  "$HOME/.openclaw/credentials/whatsapp/default") ;;
  *) echo "Refusing unexpected WhatsApp credential path: $target"; exit 1 ;;
esac

if [ -d "$target" ]; then
  mv "$target" "${target}.bak.$(date -u +%Y%m%dT%H%M%SZ)"
fi

export OPENCLAW_DIST_DIR="${OPENCLAW_DIST_DIR:-$HOME/.openclaw/tools/node-v22.22.0/lib/node_modules/openclaw/dist}"
npm run ops:whatsapp-qr -- --account=default --qr-timeout-ms=180000 --wait-timeout-ms=600000

sudo systemctl start openclaw-gateway
sudo journalctl -u openclaw-gateway --since "5 minutes ago" --no-pager | grep -Ei 'whatsapp|254113|733638841|listening|conflict|failed'
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
- known player/community groups such as `MECHI 1v1` and `MECHI BETA` route to `community` or `support`, based on the exact group JID configuration;
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
