#!/usr/bin/env bash
set -euo pipefail

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
PRIMARY_WHATSAPP_NUMBER="${MECHI_NATIVE_WHATSAPP_NUMBER:-+254113033475}"
PRIMARY_WHATSAPP_ACCOUNT_ID="${MECHI_NATIVE_WHATSAPP_ACCOUNT_ID:-254113033475}"
SECONDARY_WHATSAPP_NUMBER="${MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER:-+254733638841}"
SECONDARY_WHATSAPP_ACCOUNT_ID="${MECHI_NATIVE_SUPPORT_WHATSAPP_ACCOUNT_ID:-default}"
RESTART_SERVICES="${1:---restart}"

copy_workspace() {
  local source_dir="$1"
  local target_dir="$2"

  if [ ! -d "$source_dir" ]; then
    echo "Missing workspace source: $source_dir" >&2
    exit 1
  fi

  install -d "$target_dir"
  case "$target_dir" in
    "$OPENCLAW_HOME/workspace-support"|"$OPENCLAW_HOME/workspace-community") ;;
    *)
      echo "Refusing to sync unexpected workspace target: $target_dir" >&2
      exit 1
      ;;
  esac

  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$source_dir"/ "$target_dir"/
  else
    find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a "$source_dir"/. "$target_dir"/
  fi
}

restart_gateway() {
  if systemctl --user list-unit-files 2>/dev/null | grep -q '^openclaw-gateway.service'; then
    systemctl --user restart openclaw-gateway.service
    systemctl --user status openclaw-gateway.service --no-pager
    return
  fi

  if systemctl list-unit-files 2>/dev/null | grep -q '^openclaw-gateway.service'; then
    sudo systemctl restart openclaw-gateway.service
    sudo systemctl status openclaw-gateway.service --no-pager
    return
  fi

  if systemctl list-unit-files 2>/dev/null | grep -q '^openclaw-gateway'; then
    sudo systemctl restart openclaw-gateway
    sudo systemctl status openclaw-gateway --no-pager
    return
  fi

  echo "OpenClaw gateway service not found; restart it manually on this host." >&2
}

restart_bridge() {
  if systemctl list-units --type=service --all 2>/dev/null | grep -q 'mechi-openclaw-bridge'; then
    sudo systemctl restart mechi-openclaw-bridge
    sudo systemctl status mechi-openclaw-bridge --no-pager
  fi
}

cd "$MECHI_REPO"

copy_workspace \
  "$MECHI_REPO/ops/openclaw-support-workspace" \
  "$OPENCLAW_HOME/workspace-support"

copy_workspace \
  "$MECHI_REPO/ops/openclaw-community-workspace" \
  "$OPENCLAW_HOME/workspace-community"

node - "$OPENCLAW_HOME" "$PRIMARY_WHATSAPP_NUMBER" "$PRIMARY_WHATSAPP_ACCOUNT_ID" "$SECONDARY_WHATSAPP_NUMBER" "$SECONDARY_WHATSAPP_ACCOUNT_ID" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [
  openclawHome,
  primaryNumber,
  primaryAccountId,
  secondaryNumber,
  secondaryAccountId,
] = process.argv.slice(2);
const configPath = path.join(openclawHome, 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.channels = config.channels || {};
const current = config.channels.whatsapp && typeof config.channels.whatsapp === 'object'
  ? config.channels.whatsapp
  : {};
const existingAccounts = current.accounts &&
  !Array.isArray(current.accounts) &&
  typeof current.accounts === 'object'
  ? current.accounts
  : {};

config.channels.whatsapp = {
  ...current,
  enabled: true,
  defaultAccount: primaryAccountId,
  dmPolicy: 'open',
  allowFrom: ['*'],
  accounts: {
    ...existingAccounts,
    [primaryAccountId]: {
      ...(existingAccounts[primaryAccountId] || {}),
      enabled: true,
      name: `${primaryNumber} native OpenClaw WhatsApp`,
      authDir: path.join(openclawHome, 'credentials', 'whatsapp', primaryAccountId),
      dmPolicy: 'open',
      allowFrom: ['*'],
    },
    [secondaryAccountId]: {
      ...(existingAccounts[secondaryAccountId] || {}),
      enabled: true,
      name: `${secondaryNumber} native OpenClaw WhatsApp`,
      authDir: path.join(openclawHome, 'credentials', 'whatsapp', secondaryAccountId),
      dmPolicy: 'open',
      allowFrom: ['*'],
    },
  },
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
NODE

"$OPENCLAW_BIN" config validate --json

echo "Customer workspaces synced:"
echo "- $OPENCLAW_HOME/workspace-support"
echo "- $OPENCLAW_HOME/workspace-community"
echo "WhatsApp accounts configured:"
echo "- $PRIMARY_WHATSAPP_NUMBER ($PRIMARY_WHATSAPP_ACCOUNT_ID)"
echo "- $SECONDARY_WHATSAPP_NUMBER ($SECONDARY_WHATSAPP_ACCOUNT_ID)"

if [ "$RESTART_SERVICES" = "--no-restart" ]; then
  echo "Skipped service restart."
  exit 0
fi

restart_gateway
restart_bridge
