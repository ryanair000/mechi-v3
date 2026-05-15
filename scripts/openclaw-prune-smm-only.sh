#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_BIN="${OPENCLAW_BIN:-$HOME/.npm-global/bin/openclaw}"
SOCIO_WORKSPACE="${SOCIO_WORKSPACE:-$OPENCLAW_HOME/workspace-growth}"
SOCIO_MODEL="${SOCIO_MODEL:-openai-codex/gpt-5.5}"
TELEGRAM_SOCIO_GROUP_ID="${MECHI_TELEGRAM_SOCIO_GROUP_ID:--1003922946344}"
TELEGRAM_SOCIO_TOPIC_ID="${MECHI_TELEGRAM_SOCIO_TOPIC_ID:-7}"
TELEGRAM_SOCIO_ALLOW_FROM="${MECHI_TELEGRAM_SOCIO_ALLOW_FROM:-6806783421,6738706706}"
RESTART_GATEWAY="${1:---restart}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/openclaw-pruned-$STAMP-smm-only}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="$HOME/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${PATH:+:$PATH}"

require_bin() {
  local bin="$1"
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing required command: $bin" >&2
    exit 1
  fi
}

restart_gateway() {
  if [ "$RESTART_GATEWAY" = "--no-restart" ]; then
    echo "Skipped gateway restart."
    return
  fi

  systemctl --user restart openclaw-gateway.service
}

stop_gateway() {
  systemctl --user stop openclaw-gateway.service >/dev/null 2>&1 || true
}

require_bin python3
require_bin mv
require_bin mkdir

mkdir -p \
  "$BACKUP_ROOT/nginx" \
  "$BACKUP_ROOT/systemd" \
  "$BACKUP_ROOT/etc" \
  "$BACKUP_ROOT/openclaw/agents" \
  "$BACKUP_ROOT/openclaw/workspaces" \
  "$BACKUP_ROOT/openclaw/credentials" \
  "$BACKUP_ROOT/openclaw/cron" \
  "$BACKUP_ROOT/openclaw/tasks"

cp "$OPENCLAW_HOME/openclaw.json" "$BACKUP_ROOT/openclaw/openclaw.json.before"

stop_gateway

python3 "$SCRIPT_DIR/openclaw-smm-only-config.py" \
  "$OPENCLAW_HOME" \
  "$SOCIO_WORKSPACE" \
  "$SOCIO_MODEL" \
  "$TELEGRAM_SOCIO_GROUP_ID" \
  "$TELEGRAM_SOCIO_TOPIC_ID" \
  "$TELEGRAM_SOCIO_ALLOW_FROM"

sudo systemctl disable --now mechi-openclaw-bridge.service >/dev/null 2>&1 || true
sudo systemctl disable --now nginx.service >/dev/null 2>&1 || true

for dir in control support community infra billing data growth main default; do
  if [ -d "$OPENCLAW_HOME/agents/$dir" ] && [ "$dir" != "socio" ]; then
    mv "$OPENCLAW_HOME/agents/$dir" "$BACKUP_ROOT/openclaw/agents/$dir"
  fi
done

for dir in workspace-support workspace-community workspace-infra workspace-billing workspace-data; do
  if [ -d "$OPENCLAW_HOME/$dir" ]; then
    mv "$OPENCLAW_HOME/$dir" "$BACKUP_ROOT/openclaw/workspaces/$dir"
  fi
done

if [ -d "$OPENCLAW_HOME/credentials/whatsapp" ]; then
  mv "$OPENCLAW_HOME/credentials/whatsapp" "$BACKUP_ROOT/openclaw/credentials/whatsapp"
fi

if [ -d "$OPENCLAW_HOME/cron/runs" ]; then
  mv "$OPENCLAW_HOME/cron/runs" "$BACKUP_ROOT/openclaw/cron/runs"
fi

for task_file in runs.sqlite runs.sqlite-shm runs.sqlite-wal; do
  if [ -f "$OPENCLAW_HOME/tasks/$task_file" ]; then
    mv "$OPENCLAW_HOME/tasks/$task_file" "$BACKUP_ROOT/openclaw/tasks/$task_file"
  fi
done

cat > "$OPENCLAW_HOME/cron/jobs.json" <<'JSON'
{
  "version": 1,
  "jobs": []
}
JSON

cat > "$OPENCLAW_HOME/cron/jobs-state.json" <<'JSON'
{
  "version": 1,
  "jobs": {}
}
JSON

rm -f "$OPENCLAW_HOME/cron/jobs.json.bak"

if [ -L /etc/nginx/sites-enabled/mechi-openclaw ]; then
  sudo mv /etc/nginx/sites-enabled/mechi-openclaw "$BACKUP_ROOT/nginx/mechi-openclaw.symlink"
fi

if [ -f /etc/nginx/sites-available/mechi-openclaw ]; then
  sudo mv /etc/nginx/sites-available/mechi-openclaw "$BACKUP_ROOT/nginx/mechi-openclaw"
fi

if [ -f /etc/nginx/conf.d/openclaw-qr.conf ]; then
  sudo mv /etc/nginx/conf.d/openclaw-qr.conf "$BACKUP_ROOT/nginx/openclaw-qr.conf"
fi

if [ -f /etc/systemd/system/mechi-openclaw-bridge.service ]; then
  sudo mv /etc/systemd/system/mechi-openclaw-bridge.service "$BACKUP_ROOT/systemd/mechi-openclaw-bridge.service"
fi

if [ -f /etc/mechi-openclaw-bridge.env ]; then
  sudo mv /etc/mechi-openclaw-bridge.env "$BACKUP_ROOT/etc/mechi-openclaw-bridge.env"
fi

sudo systemctl daemon-reload
restart_gateway
sleep 3

"$OPENCLAW_BIN" config validate --json

echo "OpenClaw pruned to SMM-only runtime."
echo "Backup root: $BACKUP_ROOT"
echo "Active Telegram group: $TELEGRAM_SOCIO_GROUP_ID"
echo "Active Telegram topic: $TELEGRAM_SOCIO_TOPIC_ID"
