#!/usr/bin/env bash
set -euo pipefail

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
TELEGRAM_NATIVE_MARKER="$OPENCLAW_HOME/.mechi-telegram-native-enabled"
PRIMARY_WHATSAPP_NUMBER="${MECHI_NATIVE_WHATSAPP_NUMBER:-+254113033475}"
PRIMARY_WHATSAPP_ACCOUNT_ID="${MECHI_NATIVE_WHATSAPP_ACCOUNT_ID:-254113033475}"
SECONDARY_WHATSAPP_NUMBER="${MECHI_NATIVE_SUPPORT_WHATSAPP_NUMBER:-+254733638841}"
SECONDARY_WHATSAPP_ACCOUNT_ID="${MECHI_NATIVE_SUPPORT_WHATSAPP_ACCOUNT_ID:-default}"
WHATSAPP_CONTROL_GROUP_IDS="${MECHI_WHATSAPP_CONTROL_GROUP_IDS:-}"
WHATSAPP_CUSTOMER_GROUP_IDS="${MECHI_WHATSAPP_CUSTOMER_GROUP_IDS:-}"
WHATSAPP_CUSTOMER_GROUP_AGENT="${MECHI_WHATSAPP_CUSTOMER_GROUP_AGENT:-community}"
WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED="${MECHI_WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED:-false}"
WHATSAPP_CONTROL_DIRECT_IDS="${MECHI_WHATSAPP_CONTROL_DIRECT_IDS:-+254708355692}"
WHATSAPP_DEFAULT_DM_AGENT="${MECHI_WHATSAPP_DEFAULT_DM_AGENT:-support}"
WHATSAPP_DM_SCOPE="${MECHI_OPENCLAW_WHATSAPP_DM_SCOPE:-per-account-channel-peer}"
TELEGRAM_BOT_TOKEN="${MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN:-${TELEGRAM_BOT_TOKEN:-}}"
TELEGRAM_NATIVE_ENABLED="${MECHI_OPENCLAW_TELEGRAM_NATIVE_ENABLED:-auto}"
TELEGRAM_OPERATOR_IDS="${MECHI_OPENCLAW_TELEGRAM_OPERATOR_IDS:-6806783421,6738706706}"
TELEGRAM_CONTROL_GROUP_IDS="${MECHI_OPENCLAW_TELEGRAM_CONTROL_GROUP_IDS:-}"
TELEGRAM_COMMUNITY_GROUP_IDS="${MECHI_OPENCLAW_TELEGRAM_COMMUNITY_GROUP_IDS:-}"
TELEGRAM_REGISTRATION_TOPIC_ID="${MECHI_OPENCLAW_TELEGRAM_REGISTRATION_TOPIC_ID:-}"
TELEGRAM_DEFAULT_GROUP_AGENT="${MECHI_OPENCLAW_TELEGRAM_DEFAULT_GROUP_AGENT:-community}"
TELEGRAM_COMMUNITY_GROUP_MENTION_REQUIRED="${MECHI_OPENCLAW_TELEGRAM_COMMUNITY_GROUP_MENTION_REQUIRED:-true}"
TELEGRAM_OPS_GROUP_MENTION_REQUIRED="${MECHI_OPENCLAW_TELEGRAM_OPS_GROUP_MENTION_REQUIRED:-false}"
TELEGRAM_KEEP_LEGACY_POLLER="${MECHI_OPENCLAW_KEEP_TELEGRAM_POLLER:-false}"
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

case "$(printf '%s' "$TELEGRAM_NATIVE_ENABLED" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on) TELEGRAM_NATIVE_ENABLED="true" ;;
  0|false|no|off) TELEGRAM_NATIVE_ENABLED="false" ;;
  *) TELEGRAM_NATIVE_ENABLED="auto" ;;
esac

case "$(printf '%s' "$TELEGRAM_COMMUNITY_GROUP_MENTION_REQUIRED" | tr '[:upper:]' '[:lower:]')" in
  0|false|no|off) TELEGRAM_COMMUNITY_GROUP_MENTION_REQUIRED="false" ;;
  *) TELEGRAM_COMMUNITY_GROUP_MENTION_REQUIRED="true" ;;
esac

case "$(printf '%s' "$TELEGRAM_OPS_GROUP_MENTION_REQUIRED" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on) TELEGRAM_OPS_GROUP_MENTION_REQUIRED="true" ;;
  *) TELEGRAM_OPS_GROUP_MENTION_REQUIRED="false" ;;
esac

case "$(printf '%s' "$TELEGRAM_KEEP_LEGACY_POLLER" | tr '[:upper:]' '[:lower:]')" in
  1|true|yes|on) TELEGRAM_KEEP_LEGACY_POLLER="true" ;;
  *) TELEGRAM_KEEP_LEGACY_POLLER="false" ;;
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

stop_legacy_telegram_poller_if_native() {
  if [ "$TELEGRAM_KEEP_LEGACY_POLLER" = "true" ]; then
    return
  fi

  case "$TELEGRAM_NATIVE_ENABLED" in
    true) ;;
    auto)
      if [ -z "$TELEGRAM_BOT_TOKEN" ] && [ ! -f "$TELEGRAM_NATIVE_MARKER" ]; then
        return
      fi
      ;;
    *) return ;;
  esac

  if sudo systemctl stop mechi-openclaw-telegram-poller.service >/dev/null 2>&1; then
    echo "Stopped legacy mechi-openclaw-telegram-poller.service so native OpenClaw Telegram owns getUpdates."
    return
  fi

  if sudo systemctl stop mechi-openclaw-telegram-poller >/dev/null 2>&1; then
    echo "Stopped legacy mechi-openclaw-telegram-poller so native OpenClaw Telegram owns getUpdates."
  fi
}

cd "$MECHI_REPO"

copy_workspace \
  "$MECHI_REPO/ops/openclaw-support-workspace" \
  "$OPENCLAW_HOME/workspace-support"

copy_workspace \
  "$MECHI_REPO/ops/openclaw-community-workspace" \
  "$OPENCLAW_HOME/workspace-community"

node - "$OPENCLAW_HOME" "$PRIMARY_WHATSAPP_NUMBER" "$PRIMARY_WHATSAPP_ACCOUNT_ID" "$SECONDARY_WHATSAPP_NUMBER" "$SECONDARY_WHATSAPP_ACCOUNT_ID" "$WHATSAPP_CONTROL_GROUP_IDS" "$WHATSAPP_CUSTOMER_GROUP_IDS" "$WHATSAPP_CUSTOMER_GROUP_AGENT" "$WHATSAPP_CUSTOMER_GROUP_MENTION_REQUIRED" "$WHATSAPP_CONTROL_DIRECT_IDS" "$WHATSAPP_DEFAULT_DM_AGENT" "$WHATSAPP_DM_SCOPE" "$TELEGRAM_BOT_TOKEN" "$TELEGRAM_NATIVE_ENABLED" "$TELEGRAM_OPERATOR_IDS" "$TELEGRAM_CONTROL_GROUP_IDS" "$TELEGRAM_COMMUNITY_GROUP_IDS" "$TELEGRAM_REGISTRATION_TOPIC_ID" "$TELEGRAM_DEFAULT_GROUP_AGENT" "$TELEGRAM_COMMUNITY_GROUP_MENTION_REQUIRED" "$TELEGRAM_OPS_GROUP_MENTION_REQUIRED" <<'NODE'
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
  telegramBotTokenRaw,
  telegramNativeEnabledRaw,
  telegramOperatorIdsRaw,
  telegramControlGroupIdsRaw,
  telegramCommunityGroupIdsRaw,
  telegramRegistrationTopicIdRaw,
  telegramDefaultGroupAgentRaw,
  telegramCommunityGroupMentionRequiredRaw,
  telegramOpsGroupMentionRequiredRaw,
] = process.argv.slice(2);
const configPath = path.join(openclawHome, 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.channels = config.channels || {};
const current = config.channels.whatsapp && typeof config.channels.whatsapp === 'object'
  ? config.channels.whatsapp
  : {};
const currentTelegram = config.channels.telegram && typeof config.channels.telegram === 'object'
  ? config.channels.telegram
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
const telegramBotToken = String(telegramBotTokenRaw || '').trim();
const telegramOperatorIds = normalizeTelegramSenderIds(parseCsv(telegramOperatorIdsRaw));
const telegramControlGroupIds = parseCsv(telegramControlGroupIdsRaw);
const telegramCommunityGroupIds = parseCsv(telegramCommunityGroupIdsRaw);
const telegramManagedGroupIds = new Set([...telegramControlGroupIds, ...telegramCommunityGroupIds]);
const telegramRegistrationTopicId = String(telegramRegistrationTopicIdRaw || '').trim();
const telegramDefaultGroupAgent = normalizeRouteAgent(telegramDefaultGroupAgentRaw, 'community');
const telegramCommunityGroupMentionRequired = parseBoolean(telegramCommunityGroupMentionRequiredRaw, true);
const telegramOpsGroupMentionRequired = parseBoolean(telegramOpsGroupMentionRequiredRaw, false);
const telegramNativeEnabled = resolveAutoBoolean(
  telegramNativeEnabledRaw,
  Boolean(telegramBotToken || currentTelegram.botToken)
);

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

function resolveAutoBoolean(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'auto') {
    return fallback;
  }
  return parseBoolean(normalized, fallback);
}

function normalizeDmScope(value) {
  const scope = String(value || '').trim();
  return ['main', 'per-peer', 'per-channel-peer', 'per-account-channel-peer'].includes(scope)
    ? scope
    : 'per-account-channel-peer';
}

function normalizeTelegramSenderIds(values) {
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const id = String(value || '').replace(/^(telegram:|tg:)/i, '').trim();
    if (!/^\d+$/.test(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push(id);
  }

  return normalized;
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

function buildTelegramGroups(existingGroups) {
  const groups = { ...objectOrEmpty(existingGroups) };
  groups['*'] = {
    ...objectOrEmpty(groups['*']),
    requireMention: true,
    groupPolicy: 'open',
  };

  for (const groupId of telegramControlGroupIds) {
    const existing = objectOrEmpty(groups[groupId]);
    const topics = { ...objectOrEmpty(existing.topics) };

    if (telegramRegistrationTopicId) {
      topics[telegramRegistrationTopicId] = {
        ...objectOrEmpty(topics[telegramRegistrationTopicId]),
        requireMention: false,
        groupPolicy: 'allowlist',
        allowFrom: telegramOperatorIds,
        agentId: 'control',
      };
    }

    groups[groupId] = {
      ...existing,
      requireMention: telegramOpsGroupMentionRequired,
      groupPolicy: 'allowlist',
      allowFrom: telegramOperatorIds,
      ...(Object.keys(topics).length > 0 ? { topics } : {}),
    };
  }

  for (const groupId of telegramCommunityGroupIds) {
    groups[groupId] = {
      ...objectOrEmpty(groups[groupId]),
      requireMention: telegramCommunityGroupMentionRequired,
      groupPolicy: 'open',
    };
  }

  return groups;
}

function buildRouteBindings(existingBindings) {
  const existing = Array.isArray(existingBindings) ? existingBindings : [];
  const preserved = existing.filter((binding) => {
    if (binding && binding.type && binding.type !== 'route') {
      return true;
    }

    const channel = binding?.match?.channel;
    if (channel !== 'whatsapp' && channel !== 'telegram') {
      return true;
    }

    const bindingAccountId = String(binding.match.accountId || 'default');
    const peer = binding.match.peer;
    const peerKind = String(peer?.kind || '');
    const peerId = String(peer?.id || '');

    if (channel === 'whatsapp') {
      if (retiredAccountIds.has(bindingAccountId)) {
        return false;
      }

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
    }

    if (peerKind === 'direct') {
      return !peerId || !telegramOperatorIds.includes(peerId);
    }

    if (peerKind === 'group') {
      const [groupId, topicMarker, topicId] = peerId.split(':');
      if (topicMarker === 'topic' && topicId) {
        return !(
          telegramControlGroupIds.includes(groupId) &&
          telegramRegistrationTopicId &&
          topicId === telegramRegistrationTopicId
        );
      }
      return !peerId || !telegramManagedGroupIds.has(peerId);
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

  if (telegramNativeEnabled) {
    for (const operatorId of telegramOperatorIds) {
      next.push({
        type: 'route',
        agentId: 'control',
        match: { channel: 'telegram', accountId: 'default', peer: { kind: 'direct', id: operatorId } },
      });
    }

    for (const groupId of telegramControlGroupIds) {
      next.push({
        type: 'route',
        agentId: 'control',
        match: { channel: 'telegram', accountId: 'default', peer: { kind: 'group', id: groupId } },
      });

      if (telegramRegistrationTopicId) {
        next.push({
          type: 'route',
          agentId: 'control',
          match: {
            channel: 'telegram',
            accountId: 'default',
            peer: { kind: 'group', id: `${groupId}:topic:${telegramRegistrationTopicId}` },
          },
        });
      }
    }

    for (const groupId of telegramCommunityGroupIds) {
      next.push({
        type: 'route',
        agentId: telegramDefaultGroupAgent,
        match: { channel: 'telegram', accountId: 'default', peer: { kind: 'group', id: groupId } },
      });
    }
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

if (telegramNativeEnabled) {
  const resolvedTelegramBotToken = telegramBotToken || currentTelegram.botToken || '';
  if (!resolvedTelegramBotToken) {
    throw new Error(
      'Native Telegram is enabled but no MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_TOKEN, or existing channels.telegram.botToken is configured.'
    );
  }
  config.channels.telegram = {
    ...currentTelegram,
    enabled: true,
    ...(resolvedTelegramBotToken ? { botToken: resolvedTelegramBotToken } : {}),
    dmPolicy: 'allowlist',
    allowFrom: telegramOperatorIds,
    groupPolicy: 'open',
    groupAllowFrom: ['*'],
    groups: buildTelegramGroups(currentTelegram.groups),
    streaming: 'off',
    replyToMode: 'first',
  };
} else if (String(telegramNativeEnabledRaw || '').trim().toLowerCase() === 'false' && currentTelegram.enabled) {
  config.channels.telegram = {
    ...currentTelegram,
    enabled: false,
  };
}

config.bindings = buildRouteBindings(config.bindings);
config.session = {
  ...objectOrEmpty(config.session),
  dmScope,
};

const telegramNativeMarker = path.join(openclawHome, '.mechi-telegram-native-enabled');
if (telegramNativeEnabled) {
  fs.writeFileSync(telegramNativeMarker, `${new Date().toISOString()}\n`);
} else {
  fs.rmSync(telegramNativeMarker, { force: true });
}
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
echo "Telegram native routing:"
case "$TELEGRAM_NATIVE_ENABLED" in
  true)
    echo "- native Telegram configured from MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN/TELEGRAM_BOT_TOKEN"
    ;;
  auto)
    if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
      echo "- native Telegram configured automatically because a bot token is present"
    else
      echo "- native Telegram unchanged; set MECHI_OPENCLAW_TELEGRAM_BOT_TOKEN to enable"
    fi
    ;;
  *)
    echo "- native Telegram disabled by MECHI_OPENCLAW_TELEGRAM_NATIVE_ENABLED=false"
    ;;
esac
if [ -n "$TELEGRAM_OPERATOR_IDS" ]; then
  echo "- operator DMs pinned to control: $TELEGRAM_OPERATOR_IDS"
fi
if [ -n "$TELEGRAM_CONTROL_GROUP_IDS" ]; then
  echo "- control groups pinned to control: $TELEGRAM_CONTROL_GROUP_IDS"
  if [ -n "$TELEGRAM_REGISTRATION_TOPIC_ID" ]; then
    echo "- registration topic pinned to control: $TELEGRAM_REGISTRATION_TOPIC_ID"
  fi
else
  echo "- control groups not pinned; set MECHI_OPENCLAW_TELEGRAM_CONTROL_GROUP_IDS with Telegram group ids"
fi
if [ -n "$TELEGRAM_COMMUNITY_GROUP_IDS" ]; then
  echo "- community groups pinned to $TELEGRAM_DEFAULT_GROUP_AGENT: $TELEGRAM_COMMUNITY_GROUP_IDS"
else
  echo "- community groups not pinned; set MECHI_OPENCLAW_TELEGRAM_COMMUNITY_GROUP_IDS with Telegram group ids"
fi

if [ "$RESTART_SERVICES" = "--no-restart" ]; then
  echo "Skipped service restart."
  exit 0
fi

stop_legacy_telegram_poller_if_native
restart_gateway
restart_bridge
