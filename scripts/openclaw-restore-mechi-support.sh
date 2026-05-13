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

node - "$OPENCLAW_HOME" "$MECHI_REPO" "$CONTROL_MODEL" "$SUPPORT_MODEL" "$COMMUNITY_MODEL" "$SOCIO_MODEL" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [
  openclawHome,
  mechiRepo,
  controlModel,
  supportModel,
  communityModel,
  socioModel,
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
  repoRoot: mechiRepo,
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
config.agents.list = agents;

config.channels = objectOrEmpty(config.channels);
const telegram = objectOrEmpty(config.channels.telegram);
telegram.enabled = telegram.enabled ?? true;
telegram.dmPolicy = telegram.dmPolicy || 'allowlist';
telegram.allowFrom = telegram.allowFrom || ['6806783421', '6738706706'];
telegram.streaming = telegram.streaming || { mode: 'off' };
telegram.replyToMode = telegram.replyToMode || 'first';
telegram.timeoutSeconds = telegram.timeoutSeconds || 120;
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
  return !(peer?.kind === 'direct' && ['6806783421', '6738706706'].includes(String(peer.id)));
});
config.bindings = [
  ...keep,
  {
    type: 'route',
    agentId: 'control',
    comment: 'Approved Boss/operator Telegram DM -> Mechi control',
    match: { channel: 'telegram', peer: { kind: 'direct', id: '6806783421' } },
  },
  {
    type: 'route',
    agentId: 'control',
    comment: 'Approved operator Telegram DM -> Mechi control',
    match: { channel: 'telegram', peer: { kind: 'direct', id: '6738706706' } },
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
