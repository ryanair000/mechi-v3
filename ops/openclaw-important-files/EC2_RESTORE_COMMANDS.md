# EC2 Restore Commands

Run on the Mechi OpenClaw EC2 host after pulling the latest repo.

```bash
set -euo pipefail

cd /home/ubuntu/mechi-v3
git pull --ff-only
npm install --omit=dev

export MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER="+254733638841"
export MECHI_NATIVE_SUPPORT_WHATSAPP_ACCOUNT_ID="default"
export MECHI_WHATSAPP_DEFAULT_DM_AGENT="support"
export MECHI_WHATSAPP_CUSTOMER_GROUP_AGENT="community"
export MECHI_WHATSAPP_HISTORY_LIMIT="500"

# Telegram: approved operators can use DMs and MECHI OPS.
export MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_IDS="6806783421,6738706706"
export MECHI_OPENCLAW_TELEGRAM_OPS_GROUP_ID="-1003922946344"
export MECHI_OPENCLAW_TELEGRAM_OPS_REQUIRE_MENTION="false"
export MECHI_OPENCLAW_TELEGRAM_DEFAULT_GROUP_REQUIRE_MENTION="true"

# Optional, after discovering exact WhatsApp group JIDs:
# openclaw directory peers list --channel whatsapp --query "MECHI"
# export MECHI_WHATSAPP_CONTROL_GROUP_IDS="120363...@g.us"
# export MECHI_WHATSAPP_CUSTOMER_GROUP_IDS="120363...@g.us,120363...@g.us"
# export MECHI_WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED="false"

bash scripts/openclaw-restore-mechi-support.sh
bash scripts/openclaw-install-daily-mechi-report-cron.sh

openclaw config validate --json
openclaw agents list --json
```

## QR Login

Generate a QR on EC2 only:

```bash
cd /home/ubuntu/mechi-v3
export OPENCLAW_DIST_DIR="${OPENCLAW_DIST_DIR:-$HOME/.openclaw/tools/node-v22.22.0/lib/node_modules/openclaw/dist}"
npm run ops:whatsapp-qr -- --account=default --qr-timeout-ms=180000 --wait-timeout-ms=600000
```

Scan with WhatsApp Linked Devices for the admin/support number `+254733638841`.

Native WhatsApp can use synced chat history available to that logged-in session up to the configured history window. It cannot recover deleted, expired, or never-synced history.

