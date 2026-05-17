#!/usr/bin/env bash
set -euo pipefail

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_BIN="${OPENCLAW_BIN:-openclaw}"
MODEL="${MECHI_OPENCLAW_MODEL:-openai-codex/gpt-5.5}"
SUPPORT_MODEL="${MECHI_OPENCLAW_SUPPORT_MODEL:-$MODEL}"
COMMUNITY_MODEL="${MECHI_OPENCLAW_COMMUNITY_MODEL:-$MODEL}"
CONTROL_MODEL="${MECHI_OPENCLAW_CONTROL_MODEL:-$MODEL}"
SOCIO_MODEL="${MECHI_OPENCLAW_SOCIO_MODEL:-$MODEL}"
INFRA_MODEL="${MECHI_OPENCLAW_INFRA_MODEL:-$MODEL}"
BILLING_MODEL="${MECHI_OPENCLAW_BILLING_MODEL:-$MODEL}"
DATA_MODEL="${MECHI_OPENCLAW_DATA_MODEL:-$MODEL}"
GROWTH_MODEL="${MECHI_OPENCLAW_GROWTH_MODEL:-$MODEL}"
TELEGRAM_ALLOWED_IDS="${MECHI_OPENCLAW_TELEGRAM_ALLOWED_CHAT_IDS:-6806783421,6738706706}"
TELEGRAM_OPS_GROUP_ID="${MECHI_OPENCLAW_TELEGRAM_OPS_GROUP_ID:--1003922946344}"
TELEGRAM_OPS_ALLOWED_IDS="${MECHI_OPENCLAW_TELEGRAM_OPS_ALLOWED_IDS:-$TELEGRAM_ALLOWED_IDS}"
TELEGRAM_OPS_GROUP_MENTION_REQUIRED="${MECHI_OPENCLAW_TELEGRAM_OPS_REQUIRE_MENTION:-false}"
TELEGRAM_DEFAULT_GROUP_MENTION_REQUIRED="${MECHI_OPENCLAW_TELEGRAM_DEFAULT_GROUP_REQUIRE_MENTION:-true}"
RESTART_SERVICES="${1:---restart}"

copy_workspace() {
  local source_dir="$1"
  local target_dir="$2"

  if [ ! -d "$source_dir" ]; then
    echo "Missing workspace source: $source_dir" >&2
    exit 1
  fi

  install -d "$target_dir"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$source_dir"/ "$target_dir"/
  else
    find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    cp -a "$source_dir"/. "$target_dir"/
  fi
}

restart_gateway() {
  if [ "$RESTART_SERVICES" = "--no-restart" ]; then
    echo "Skipped gateway restart."
    return
  fi

  if systemctl --user restart openclaw-gateway.service >/dev/null 2>&1; then
    systemctl --user status openclaw-gateway.service --no-pager
    return
  fi

  if sudo systemctl restart openclaw-gateway.service >/dev/null 2>&1; then
    sudo systemctl status openclaw-gateway.service --no-pager
    return
  fi

  sudo systemctl restart openclaw-gateway
  sudo systemctl status openclaw-gateway --no-pager
}

restart_bridge() {
  if [ "$RESTART_SERVICES" = "--no-restart" ]; then
    return
  fi

  if systemctl list-units --type=service --all 2>/dev/null | grep -q 'mechi-openclaw-bridge'; then
    sudo systemctl restart mechi-openclaw-bridge || sudo systemctl restart mechi-openclaw-bridge.service
    sudo systemctl status mechi-openclaw-bridge --no-pager || sudo systemctl status mechi-openclaw-bridge.service --no-pager
  fi
}

cd "$MECHI_REPO"
mkdir -p "$OPENCLAW_HOME"

copy_workspace "$MECHI_REPO/ops/openclaw-support-workspace" "$OPENCLAW_HOME/workspace-support"
copy_workspace "$MECHI_REPO/ops/openclaw-community-workspace" "$OPENCLAW_HOME/workspace-community"
copy_workspace "$MECHI_REPO/ops/openclaw-growth-workspace" "$OPENCLAW_HOME/workspace-growth"
copy_workspace "$MECHI_REPO/ops/openclaw-infra-workspace" "$OPENCLAW_HOME/workspace-infra"
copy_workspace "$MECHI_REPO/ops/openclaw-billing-workspace" "$OPENCLAW_HOME/workspace-billing"
copy_workspace "$MECHI_REPO/ops/openclaw-data-workspace" "$OPENCLAW_HOME/workspace-data"

node - "$OPENCLAW_HOME" "$MECHI_REPO" "$CONTROL_MODEL" "$SUPPORT_MODEL" "$COMMUNITY_MODEL" "$SOCIO_MODEL" "$INFRA_MODEL" "$BILLING_MODEL" "$DATA_MODEL" "$GROWTH_MODEL" "$TELEGRAM_ALLOWED_IDS" "$TELEGRAM_OPS_GROUP_ID" "$TELEGRAM_OPS_ALLOWED_IDS" "$TELEGRAM_OPS_GROUP_MENTION_REQUIRED" "$TELEGRAM_DEFAULT_GROUP_MENTION_REQUIRED" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [
  openclawHome,
  mechiRepo,
  controlModel,
  supportModel,
  communityModel,
  socioModel,
  infraModel,
  billingModel,
  dataModel,
  growthModel,
  telegramAllowedIdsRaw,
  telegramOpsGroupId,
  telegramOpsAllowedIdsRaw,
  telegramOpsGroupMentionRequiredRaw,
  telegramDefaultGroupMentionRequiredRaw,
] = process.argv.slice(2);

const configPath = path.join(openclawHome, 'openclaw.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : {};

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function upsertAgent(list, agent) {
  const filtered = list.filter((item) => item && item.id !== agent.id);
  filtered.push(agent);
  return filtered;
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

const telegramAllowedIds = parseCsv(telegramAllowedIdsRaw);
const telegramAllowedInts = telegramAllowedIds
  .filter((entry) => /^-?\d+$/.test(entry))
  .map((entry) => Number.parseInt(entry, 10));
const telegramOpsAllowedIds = parseCsv(telegramOpsAllowedIdsRaw);
const telegramOpsAllowedInts = telegramOpsAllowedIds
  .filter((entry) => /^-?\d+$/.test(entry))
  .map((entry) => Number.parseInt(entry, 10));
const opsRequireMention = parseBoolean(telegramOpsGroupMentionRequiredRaw, false);
const defaultGroupRequireMention = parseBoolean(telegramDefaultGroupMentionRequiredRaw, true);

config.agents = objectOrEmpty(config.agents);
config.agents.defaults = {
  ...objectOrEmpty(config.agents.defaults),
  repoRoot: mechiRepo,
  timeoutSeconds: 180,
};

let agents = Array.isArray(config.agents.list) ? config.agents.list : [];
agents = upsertAgent(agents, {
  id: 'control',
  name: 'Mechi Control',
  workspace: mechiRepo,
  model: controlModel,
  thinkingDefault: 'medium',
  tools: { profile: 'coding' },
});
agents = upsertAgent(agents, {
  id: 'support',
  name: 'Mechi Support',
  workspace: path.join(openclawHome, 'workspace-support'),
  model: supportModel,
  thinkingDefault: 'minimal',
  fastModeDefault: true,
  tools: { profile: 'minimal' },
});
agents = upsertAgent(agents, {
  id: 'community',
  name: 'Mechi Community',
  workspace: path.join(openclawHome, 'workspace-community'),
  model: communityModel,
  thinkingDefault: 'minimal',
  fastModeDefault: true,
  tools: { profile: 'minimal' },
});
agents = upsertAgent(agents, {
  id: 'socio',
  name: 'Mechi Socio',
  workspace: path.join(openclawHome, 'workspace-growth'),
  model: socioModel,
  thinkingDefault: 'minimal',
  fastModeDefault: true,
  tools: { profile: 'minimal' },
});
agents = upsertAgent(agents, {
  id: 'infra',
  name: 'Mechi Infra',
  workspace: path.join(openclawHome, 'workspace-infra'),
  model: infraModel,
  thinkingDefault: 'medium',
  tools: { profile: 'coding' },
});
agents = upsertAgent(agents, {
  id: 'billing',
  name: 'Mechi Billing',
  workspace: path.join(openclawHome, 'workspace-billing'),
  model: billingModel,
  thinkingDefault: 'minimal',
  fastModeDefault: true,
  tools: { profile: 'minimal' },
});
agents = upsertAgent(agents, {
  id: 'data',
  name: 'Mechi Data',
  workspace: path.join(openclawHome, 'workspace-data'),
  model: dataModel,
  thinkingDefault: 'minimal',
  fastModeDefault: true,
  tools: { profile: 'minimal' },
});
agents = upsertAgent(agents, {
  id: 'growth',
  name: 'Mechi Growth',
  workspace: path.join(openclawHome, 'workspace-growth'),
  model: growthModel,
  thinkingDefault: 'minimal',
  fastModeDefault: true,
  tools: { profile: 'minimal' },
});
config.agents.list = agents;

config.channels = objectOrEmpty(config.channels);
const telegram = objectOrEmpty(config.channels.telegram);
telegram.enabled = telegram.enabled ?? true;
telegram.dmPolicy = telegram.dmPolicy || 'allowlist';
telegram.allowFrom = telegramAllowedIds.length ? telegramAllowedIds : ['6806783421', '6738706706'];
telegram.dmHistoryLimit = telegram.dmHistoryLimit || 100;
telegram.historyLimit = telegram.historyLimit || 100;
delete telegram.dms;
telegram.groupPolicy = telegram.groupPolicy || 'allowlist';
telegram.streaming = telegram.streaming || { mode: 'off' };
telegram.replyToMode = telegram.replyToMode || 'first';
telegram.timeoutSeconds = telegram.timeoutSeconds || 120;
const preservedTelegramGroups = { ...objectOrEmpty(telegram.groups) };
delete preservedTelegramGroups['*'];
telegram.groups = {
  ...preservedTelegramGroups,
  [telegramOpsGroupId]: {
    enabled: true,
    requireMention: opsRequireMention || defaultGroupRequireMention === false ? opsRequireMention : false,
    allowFrom: telegramOpsAllowedInts.length ? telegramOpsAllowedInts : telegramAllowedInts,
    systemPrompt: [
      'This is the internal Mechi OPS Telegram group.',
      'Route operator, repo, live registration, tournament, support, AWS, GitHub, and Obsidian questions to the control agent unless a specialist is explicitly named.',
      'Keep replies short, decisive, and ready to send.',
      'For live registrations use npm run ops:registrations -- --json; for live open tournaments use npm run ops:tournaments -- --json.',
      'Use Weekend Cup as the default current tournament unless the sender clearly names the older PlayMechi Launch event.',
      'Ask before destructive, money-moving, payout, account, public broadcast, or production infrastructure changes.',
    ].join(' '),
  },
};
config.channels.telegram = telegram;

config.plugins = objectOrEmpty(config.plugins);
config.plugins.entries = {
  ...objectOrEmpty(config.plugins.entries),
  openai: { ...objectOrEmpty(config.plugins.entries?.openai), enabled: true },
  telegram: { ...objectOrEmpty(config.plugins.entries?.telegram), enabled: true },
  whatsapp: { ...objectOrEmpty(config.plugins.entries?.whatsapp), enabled: true },
};

const existingBindings = Array.isArray(config.bindings) ? config.bindings : [];
const keep = existingBindings.filter((binding) => {
  if (!binding || binding.type !== 'route') return true;
  const channel = binding.match?.channel;
  if (channel !== 'telegram') return true;
  const peer = binding.match?.peer;
  if (peer?.kind === 'group' && String(peer.id) === String(telegramOpsGroupId)) return false;
  return !(peer?.kind === 'direct' && (telegramAllowedIds.length ? telegramAllowedIds : ['6806783421', '6738706706']).includes(String(peer.id)));
});
const telegramDmRoutes = (telegramAllowedIds.length ? telegramAllowedIds : ['6806783421', '6738706706']).map((id) => ({
  type: 'route',
  agentId: 'control',
  comment: 'Approved Boss/operator Telegram DM -> Mechi control',
  match: { channel: 'telegram', peer: { kind: 'direct', id } },
}));
config.bindings = [
  ...keep,
  ...telegramDmRoutes,
  {
    type: 'route',
    agentId: 'control',
    comment: 'Internal MECHI OPS Telegram group -> Mechi control',
    match: { channel: 'telegram', peer: { kind: 'group', id: telegramOpsGroupId } },
  },
];

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
NODE

bash "$MECHI_REPO/scripts/openclaw-sync-customer-workspaces.sh" --no-restart
"$OPENCLAW_BIN" config validate --json

restart_gateway
restart_bridge

echo "Mechi OpenClaw support runtime restored:"
echo "- control workspace: $MECHI_REPO"
echo "- support workspace: $OPENCLAW_HOME/workspace-support"
echo "- community workspace: $OPENCLAW_HOME/workspace-community"
echo "- WhatsApp customer history limit: ${MECHI_WHATSAPP_HISTORY_LIMIT:-200}"
