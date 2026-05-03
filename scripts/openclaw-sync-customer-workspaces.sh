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

"$OPENCLAW_BIN" config set channels.whatsapp.enabled true
"$OPENCLAW_BIN" config set channels.whatsapp.defaultAccount "$PRIMARY_WHATSAPP_ACCOUNT_ID"
"$OPENCLAW_BIN" config set channels.whatsapp.dmPolicy open
"$OPENCLAW_BIN" config set channels.whatsapp.allowFrom '["*"]' --strict-json

"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$PRIMARY_WHATSAPP_ACCOUNT_ID.enabled" true
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$PRIMARY_WHATSAPP_ACCOUNT_ID.name" "$PRIMARY_WHATSAPP_NUMBER native OpenClaw WhatsApp"
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$PRIMARY_WHATSAPP_ACCOUNT_ID.authDir" "$OPENCLAW_HOME/credentials/whatsapp/$PRIMARY_WHATSAPP_ACCOUNT_ID"
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$PRIMARY_WHATSAPP_ACCOUNT_ID.dmPolicy" open
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$PRIMARY_WHATSAPP_ACCOUNT_ID.allowFrom" '["*"]' --strict-json

"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$SECONDARY_WHATSAPP_ACCOUNT_ID.enabled" true
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$SECONDARY_WHATSAPP_ACCOUNT_ID.name" "$SECONDARY_WHATSAPP_NUMBER native OpenClaw WhatsApp"
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$SECONDARY_WHATSAPP_ACCOUNT_ID.authDir" "$OPENCLAW_HOME/credentials/whatsapp/$SECONDARY_WHATSAPP_ACCOUNT_ID"
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$SECONDARY_WHATSAPP_ACCOUNT_ID.dmPolicy" open
"$OPENCLAW_BIN" config set "channels.whatsapp.accounts.$SECONDARY_WHATSAPP_ACCOUNT_ID.allowFrom" '["*"]' --strict-json

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
