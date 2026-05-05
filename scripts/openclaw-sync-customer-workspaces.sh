#!/usr/bin/env bash
set -euo pipefail

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
PRIMARY_WHATSAPP_NUMBER="${MECHI_NATIVE_WHATSAPP_NUMBER:-}"
PRIMARY_WHATSAPP_ACCOUNT_ID="${MECHI_NATIVE_WHATSAPP_ACCOUNT_ID:-}"
SECONDARY_WHATSAPP_NUMBER="${MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER:-+254733638841}"
SECONDARY_WHATSAPP_ACCOUNT_ID="${MECHI_NATIVE_SUPPORT_WHATSAPP_ACCOUNT_ID:-default}"
WHATSAPP_CONTROL_GROUP_IDS="${MECHI_WHATSAPP_CONTROL_GROUP_IDS:-}"
WHATSAPP_CUSTOMER_GROUP_IDS="${MECHI_WHATSAPP_CUSTOMER_GROUP_IDS:-}"
WHATSAPP_CUSTOMER_GROUP_AGENT="${MECHI_WHATSAPP_CUSTOMER_GROUP_AGENT:-community}"
WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED="${MECHI_WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED:-false}"
WHATSAPP_CONTROL_DIRECT_IDS="${MECHI_WHATSAPP_CONTROL_DIRECT_IDS:-+254708355692}"
WHATSAPP_DEFAULT_DM_AGENT="${MECHI_WHATSAPP_DEFAULT_DM_AGENT:-support}"
WHATSAPP_DM_SCOPE="${MECHI_OPENCLAW_WHATSAPP_DM_SCOPE:-per-account-channel-peer}"
RESTART_SERVICES="${1:---restart}"

case "$WHATSAPP_DEFAULT_DM_AGENT" in
  support|community|control) ;;
  *) WHATSAPP_DEFAULT_DM_AGENT="support" ;;
esac

case "$WHATSAPP_DM_SCOPE" in
  main|per-peer|per-channel-peer|per-account-channel-peer) ;;
  *) WHATSAPP_DM_SCOPE="per-account-channel-peer" ;;
esac

case "$(printf '%s' "$WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on) WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED="true" ;;
  *) WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED="false" ;;
esac

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
  if systemctl --user restart openclaw-gateway.service >/dev/null 2>&1; then
    systemctl --user status openclaw-gateway.service --no-pager
    return
  fi

  if sudo systemctl restart openclaw-gateway.service >/dev/null 2>&1; then
    sudo systemctl status openclaw-gateway.service --no-pager
    return
  fi

  if sudo systemctl restart openclaw-gateway >/dev/null 2>&1; then
    sudo systemctl status openclaw-gateway --no-pager
    return
  fi

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
  if sudo systemctl restart mechi-openclaw-bridge.service >/dev/null 2>&1; then
    sudo systemctl status mechi-openclaw-bridge.service --no-pager
    return
  fi

  if sudo systemctl restart mechi-openclaw-bridge >/dev/null 2>&1; then
    sudo systemctl status mechi-openclaw-bridge --no-pager
    return
  fi

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

node - "$OPENCLAW_HOME" "$PRIMARY_WHATSAPP_NUMBER" "$PRIMARY_WHATSAPP_ACCOUNT_ID" "$SECONDARY_WHATSAPP_NUMBER" "$SECONDARY_WHATSAPP_ACCOUNT_ID" "$WHATSAPP_CONTROL_GROUP_IDS" "$WHATSAPP_CUSTOMER_GROUP_IDS" "$WHATSAPP_CUSTOMER_GROUP_AGENT" "$WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED" "$WHATSAPP_CONTROL_DIRECT_IDS" "$WHATSAPP_DEFAULT_DM_AGENT" "$WHATSAPP_DM_SCOPE" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [
  openclawHome,
  primaryNumber,
  primaryAccountId,
  secondaryNumber,
  secondaryAccountId,
  controlGroupIdsRaw,
  customerGroupIdsRaw,
  customerGroupAgentRaw,
  customerGroupMentionRequiredRaw,
  controlDirectIdsRaw,
  defaultDmAgentRaw,
  dmScopeRaw,
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
const accounts = { ...existingAccounts };
const activeAccountIds = [primaryAccountId, secondaryAccountId].filter(Boolean);
const retiredAccountIds = new Set(primaryAccountId ? [] : ['254113033475']);

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeCustomerGroupAgent(value) {
  const agent = String(value || '').trim();
  return ['support', 'community', 'control'].includes(agent) ? agent : 'community';
}

const controlGroupIds = parseCsv(controlGroupIdsRaw);
const customerGroupIds = parseCsv(customerGroupIdsRaw);
const managedGroupIds = new Set([...controlGroupIds, ...customerGroupIds]);
const customerGroupAgent = normalizeCustomerGroupAgent(customerGroupAgentRaw);
const customerGroupMentionRequired = parseBoolean(customerGroupMentionRequiredRaw, false);
const controlDirectIds = normalizeDirectPeerIds(parseCsv(controlDirectIdsRaw));
const managedDirectIds = new Set(controlDirectIds);
const defaultDmAgent = normalizeRouteAgent(defaultDmAgentRaw, 'support');
const dmScope = normalizeDmScope(dmScopeRaw);

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeRouteAgent(value, fallback) {
  const agent = String(value || '').trim();
  return ['support', 'community', 'control'].includes(agent) ? agent : fallback;
}

function parseBoolean(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeDmScope(value) {
  const scope = String(value || '').trim();
  return ['main', 'per-peer', 'per-channel-peer', 'per-account-channel-peer'].includes(scope)
    ? scope
    : 'per-account-channel-peer';
}

function normalizeDirectPeerIds(values) {
  const normalized = [];
  const seen = new Set();

  function add(value) {
    const id = String(value || '').trim();
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    normalized.push(id);
  }

  for (const value of values) {
    add(value);
    const digits = String(value || '').replace(/\D/g, '');
    if (digits) {
      add(`+${digits}`);
      add(digits);
      add(`${digits}@s.whatsapp.net`);
    }
  }

  return normalized;
}

function mentionGatedGroups(existingGroups, mentionRequiredByGroup = new Map()) {
  const groups = { ...objectOrEmpty(existingGroups) };
  groups['*'] = {
    ...objectOrEmpty(groups['*']),
    requireMention: true,
  };

  for (const groupId of managedGroupIds) {
    groups[groupId] = {
      ...objectOrEmpty(groups[groupId]),
      requireMention: mentionRequiredByGroup.get(groupId) ?? true,
    };
  }

  return groups;
}

const mentionRequiredByGroup = new Map(
  customerGroupIds.map((groupId) => [groupId, customerGroupMentionRequired])
);

function buildGroupRouteBindings(existingBindings) {
  const existing = Array.isArray(existingBindings) ? existingBindings : [];
  const preserved = existing.filter((binding) => {
    if (binding && binding.type && binding.type !== 'route') {
      return true;
    }

    if (binding?.match?.channel !== 'whatsapp') {
      return true;
    }

    const bindingAccountId = String(binding.match.accountId || 'default');
    if (retiredAccountIds.has(bindingAccountId)) {
      return false;
    }

    const peer = binding.match.peer;
    const peerKind = String(peer?.kind || '');
    const peerId = String(peer?.id || '');

    if (peerKind === 'group') {
      return !peerId || !managedGroupIds.has(peerId);
    }

    if (peerKind === 'direct') {
      return !peerId || !managedDirectIds.has(peerId);
    }

    if (!peerKind && !binding.match.guildId && !binding.match.teamId) {
      if (!binding.match.accountId) {
        return activeAccountIds.length === 0;
      }
      return !activeAccountIds.includes(bindingAccountId);
    }

    return true;
  });
  const next = [...preserved];

  for (const accountId of activeAccountIds) {
    for (const directId of controlDirectIds) {
      next.push({
        type: 'route',
        agentId: 'control',
        match: { channel: 'whatsapp', accountId, peer: { kind: 'direct', id: directId } },
      });
    }

    for (const groupId of controlGroupIds) {
      next.push({
        type: 'route',
        agentId: 'control',
        match: { channel: 'whatsapp', accountId, peer: { kind: 'group', id: groupId } },
      });
    }

    for (const groupId of customerGroupIds) {
      next.push({
        type: 'route',
        agentId: customerGroupAgent,
        match: { channel: 'whatsapp', accountId, peer: { kind: 'group', id: groupId } },
      });
    }

    next.push({
      type: 'route',
      agentId: defaultDmAgent,
      match: { channel: 'whatsapp', accountId },
    });
  }

  return next;
}

if (!primaryAccountId) {
  delete accounts['254113033475'];
}

if (primaryAccountId) {
  const previousAccount = accounts[primaryAccountId] || {};
  accounts[primaryAccountId] = {
    ...previousAccount,
    enabled: true,
    name: `${primaryNumber} native OpenClaw WhatsApp`,
    authDir: path.join(openclawHome, 'credentials', 'whatsapp', primaryAccountId),
    selfChatMode: false,
    dmPolicy: 'open',
    allowFrom: ['*'],
    groupPolicy: 'open',
    groupAllowFrom: ['*'],
    groups: mentionGatedGroups(previousAccount.groups, mentionRequiredByGroup),
  };
}

if (secondaryAccountId) {
  const previousAccount = accounts[secondaryAccountId] || {};
  accounts[secondaryAccountId] = {
    ...previousAccount,
    enabled: true,
    name: `${secondaryNumber} native OpenClaw WhatsApp`,
    authDir: path.join(openclawHome, 'credentials', 'whatsapp', secondaryAccountId),
    selfChatMode: false,
    dmPolicy: 'open',
    allowFrom: ['*'],
    groupPolicy: 'open',
    groupAllowFrom: ['*'],
    groups: mentionGatedGroups(previousAccount.groups, mentionRequiredByGroup),
  };
}

config.channels.whatsapp = {
  ...current,
  enabled: true,
  selfChatMode: false,
  defaultAccount: primaryAccountId || secondaryAccountId || current.defaultAccount || 'default',
  dmPolicy: 'open',
  allowFrom: ['*'],
  groupPolicy: 'open',
  groupAllowFrom: ['*'],
  groups: mentionGatedGroups(current.groups, mentionRequiredByGroup),
  accounts,
};
config.bindings = buildGroupRouteBindings(config.bindings);
config.session = {
  ...objectOrEmpty(config.session),
  dmScope,
};

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
NODE

"$OPENCLAW_BIN" config validate --json

echo "Customer workspaces synced:"
echo "- $OPENCLAW_HOME/workspace-support"
echo "- $OPENCLAW_HOME/workspace-community"
echo "WhatsApp accounts configured:"
if [ -n "$PRIMARY_WHATSAPP_ACCOUNT_ID" ]; then
  echo "- $PRIMARY_WHATSAPP_NUMBER ($PRIMARY_WHATSAPP_ACCOUNT_ID)"
fi
if [ -n "$SECONDARY_WHATSAPP_ACCOUNT_ID" ]; then
  echo "- $SECONDARY_WHATSAPP_NUMBER ($SECONDARY_WHATSAPP_ACCOUNT_ID)"
fi
echo "WhatsApp group routing:"
if [ -n "$WHATSAPP_CONTROL_GROUP_IDS" ]; then
  echo "- control groups pinned to control: $WHATSAPP_CONTROL_GROUP_IDS"
else
  echo "- control groups not pinned; set MECHI_WHATSAPP_CONTROL_GROUP_IDS with WhatsApp group JIDs"
fi
if [ -n "$WHATSAPP_CUSTOMER_GROUP_IDS" ]; then
  echo "- customer groups pinned to $WHATSAPP_CUSTOMER_GROUP_AGENT: $WHATSAPP_CUSTOMER_GROUP_IDS"
  echo "- customer group mention required: $WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED"
else
  echo "- customer groups not pinned; set MECHI_WHATSAPP_CUSTOMER_GROUP_IDS with WhatsApp group JIDs"
fi
echo "WhatsApp DM routing:"
echo "- active account DMs pinned to $WHATSAPP_DEFAULT_DM_AGENT"
if [ -n "$WHATSAPP_CONTROL_DIRECT_IDS" ]; then
  echo "- control direct senders pinned to control: $WHATSAPP_CONTROL_DIRECT_IDS"
fi
echo "- DM session scope: $WHATSAPP_DM_SCOPE"

if [ "$RESTART_SERVICES" = "--no-restart" ]; then
  echo "Skipped service restart."
  exit 0
fi

restart_gateway
restart_bridge
