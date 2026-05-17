#!/usr/bin/env bash
set -euo pipefail

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
OPENCLAW_BIN="${OPENCLAW_BIN:-$HOME/.npm-global/bin/openclaw}"
GROWTH_WORKSPACE_SOURCE="${GROWTH_WORKSPACE_SOURCE:-$MECHI_REPO/ops/openclaw-growth-workspace}"
export PATH="$HOME/.npm-global/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${PATH:+:$PATH}"

SOCIO_AGENT_ID="${SOCIO_AGENT_ID:-socio}"
SOCIO_AGENT_NAME="${SOCIO_AGENT_NAME:-Mechi Socio}"
SOCIO_WORKSPACE="${SOCIO_WORKSPACE:-$OPENCLAW_HOME/workspace-growth}"
SOCIO_MODEL="${SOCIO_MODEL:-openai-codex/gpt-5.5}"
SOCIO_TOOLS_PROFILE="${SOCIO_TOOLS_PROFILE:-coding}"
CONTROL_AGENT_ID="${CONTROL_AGENT_ID:-control}"
CONTROL_AGENT_NAME="${CONTROL_AGENT_NAME:-Mechi Control}"
CONTROL_WORKSPACE="${CONTROL_WORKSPACE:-$MECHI_REPO}"
CONTROL_TOOLS_PROFILE="${CONTROL_TOOLS_PROFILE:-coding}"

CALLER_SOCIO_INSTAGRAM_ACCESS_TOKEN="${SOCIO_INSTAGRAM_ACCESS_TOKEN-}"
CALLER_INSTAGRAM_ACCESS_TOKEN="${INSTAGRAM_ACCESS_TOKEN-}"
CALLER_MECHI_INSTAGRAM_ACCESS_TOKEN="${MECHI_INSTAGRAM_ACCESS_TOKEN-}"
CALLER_SOCIO_INSTAGRAM_BUSINESS_ACCOUNT_ID="${SOCIO_INSTAGRAM_BUSINESS_ACCOUNT_ID-}"
CALLER_INSTAGRAM_BUSINESS_ACCOUNT_ID="${INSTAGRAM_BUSINESS_ACCOUNT_ID-}"
CALLER_MECHI_INSTAGRAM_USER_ID="${MECHI_INSTAGRAM_USER_ID-}"
CALLER_SOCIO_FACEBOOK_USER_ACCESS_TOKEN="${SOCIO_FACEBOOK_USER_ACCESS_TOKEN-}"
CALLER_FACEBOOK_USER_ACCESS_TOKEN="${FACEBOOK_USER_ACCESS_TOKEN-}"
CALLER_SOCIO_FACEBOOK_APP_ID="${SOCIO_FACEBOOK_APP_ID-}"
CALLER_FACEBOOK_APP_ID="${FACEBOOK_APP_ID-}"
CALLER_SOCIO_FACEBOOK_APP_SECRET="${SOCIO_FACEBOOK_APP_SECRET-}"
CALLER_FACEBOOK_APP_SECRET="${FACEBOOK_APP_SECRET-}"
CALLER_SOCIO_FACEBOOK_PAGE_ID="${SOCIO_FACEBOOK_PAGE_ID-}"
CALLER_FACEBOOK_PAGE_ID="${FACEBOOK_PAGE_ID-}"
CALLER_SOCIO_FACEBOOK_PAGE_ACCESS_TOKEN="${SOCIO_FACEBOOK_PAGE_ACCESS_TOKEN-}"
CALLER_FACEBOOK_PAGE_ACCESS_TOKEN="${FACEBOOK_PAGE_ACCESS_TOKEN-}"
CALLER_SOCIO_FACEBOOK_GRAPH_API_VERSION="${SOCIO_FACEBOOK_GRAPH_API_VERSION-}"
CALLER_FACEBOOK_GRAPH_API_VERSION="${FACEBOOK_GRAPH_API_VERSION-}"
CALLER_SOCIO_IMGUR_CLIENT_ID="${SOCIO_IMGUR_CLIENT_ID-}"
CALLER_IMGUR_CLIENT_ID="${IMGUR_CLIENT_ID-}"
CALLER_SOCIO_X_API_KEY="${SOCIO_X_API_KEY-}"
CALLER_X_API_KEY="${X_API_KEY-}"
CALLER_SOCIO_X_API_SECRET="${SOCIO_X_API_SECRET-}"
CALLER_X_API_SECRET="${X_API_SECRET-}"
CALLER_SOCIO_X_ACCESS_TOKEN="${SOCIO_X_ACCESS_TOKEN-}"
CALLER_X_ACCESS_TOKEN="${X_ACCESS_TOKEN-}"
CALLER_SOCIO_X_ACCESS_TOKEN_SECRET="${SOCIO_X_ACCESS_TOKEN_SECRET-}"
CALLER_X_ACCESS_TOKEN_SECRET="${X_ACCESS_TOKEN_SECRET-}"
CALLER_SOCIO_X_OAUTH2_ACCESS_TOKEN="${SOCIO_X_OAUTH2_ACCESS_TOKEN-}"
CALLER_X_OAUTH2_ACCESS_TOKEN="${X_OAUTH2_ACCESS_TOKEN-}"
CALLER_SOCIO_TIKTOK_ACCESS_TOKEN="${SOCIO_TIKTOK_ACCESS_TOKEN-}"
CALLER_TIKTOK_ACCESS_TOKEN="${TIKTOK_ACCESS_TOKEN-}"
CALLER_SOCIO_TIKTOK_CLIENT_KEY="${SOCIO_TIKTOK_CLIENT_KEY-}"
CALLER_TIKTOK_CLIENT_KEY="${TIKTOK_CLIENT_KEY-}"
CALLER_SOCIO_TIKTOK_CLIENT_SECRET="${SOCIO_TIKTOK_CLIENT_SECRET-}"
CALLER_TIKTOK_CLIENT_SECRET="${TIKTOK_CLIENT_SECRET-}"
CALLER_SOCIO_TIKTOK_PRIVACY_LEVEL="${SOCIO_TIKTOK_PRIVACY_LEVEL-}"
CALLER_TIKTOK_PRIVACY_LEVEL="${TIKTOK_PRIVACY_LEVEL-}"
CALLER_SOCIO_DISCORD_BOT_TOKEN="${SOCIO_DISCORD_BOT_TOKEN-}"
CALLER_DISCORD_BOT_TOKEN="${DISCORD_BOT_TOKEN-}"
CALLER_SOCIO_DISCORD_GUILD_ID="${SOCIO_DISCORD_GUILD_ID-}"
CALLER_DISCORD_GUILD_ID="${DISCORD_GUILD_ID-}"
CALLER_SOCIO_DISCORD_USER_ID="${SOCIO_DISCORD_USER_ID-}"
CALLER_DISCORD_USER_ID="${DISCORD_USER_ID-}"
CALLER_SOCIO_DISCORD_POST_CHANNEL_ID="${SOCIO_DISCORD_POST_CHANNEL_ID-}"
CALLER_DISCORD_POST_CHANNEL_ID="${DISCORD_POST_CHANNEL_ID-}"
CALLER_SOCIO_DISCORD_WEBHOOK_URL="${SOCIO_DISCORD_WEBHOOK_URL-}"
CALLER_DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL-}"

load_env_file() {
  local env_path="$1"

  if [ -f "$env_path" ]; then
    set -a
    # shellcheck source=/dev/null
    . "$env_path"
    set +a
  fi
}

load_env_file "$OPENCLAW_HOME/.env"
load_env_file "$SOCIO_WORKSPACE/.env"

TELEGRAM_SOCIO_GROUP_ID="${MECHI_TELEGRAM_SOCIO_GROUP_ID:--1003922946344}"
TELEGRAM_SOCIO_TOPIC_ID="${MECHI_TELEGRAM_SOCIO_TOPIC_ID:-7}"
TELEGRAM_SOCIO_ALLOW_FROM="${MECHI_TELEGRAM_SOCIO_ALLOW_FROM:-6806783421,6738706706}"
TELEGRAM_SOCIO_GROUP_TITLE="${MECHI_TELEGRAM_SOCIO_GROUP_TITLE:-OPS}"
TELEGRAM_SOCIO_TOPIC_LABEL="${MECHI_TELEGRAM_SOCIO_TOPIC_LABEL:-SMM}"

SOCIO_INSTAGRAM_ACCESS_TOKEN="${CALLER_SOCIO_INSTAGRAM_ACCESS_TOKEN:-${CALLER_INSTAGRAM_ACCESS_TOKEN:-${CALLER_MECHI_INSTAGRAM_ACCESS_TOKEN:-${SOCIO_INSTAGRAM_ACCESS_TOKEN:-${INSTAGRAM_ACCESS_TOKEN:-${MECHI_INSTAGRAM_ACCESS_TOKEN:-}}}}}}"
SOCIO_INSTAGRAM_BUSINESS_ACCOUNT_ID="${CALLER_SOCIO_INSTAGRAM_BUSINESS_ACCOUNT_ID:-${CALLER_INSTAGRAM_BUSINESS_ACCOUNT_ID:-${CALLER_MECHI_INSTAGRAM_USER_ID:-${SOCIO_INSTAGRAM_BUSINESS_ACCOUNT_ID:-${INSTAGRAM_BUSINESS_ACCOUNT_ID:-${MECHI_INSTAGRAM_USER_ID:-}}}}}}"
SOCIO_FACEBOOK_USER_ACCESS_TOKEN="${CALLER_SOCIO_FACEBOOK_USER_ACCESS_TOKEN:-${CALLER_FACEBOOK_USER_ACCESS_TOKEN:-${SOCIO_FACEBOOK_USER_ACCESS_TOKEN:-${FACEBOOK_USER_ACCESS_TOKEN:-}}}}"
SOCIO_FACEBOOK_APP_ID="${CALLER_SOCIO_FACEBOOK_APP_ID:-${CALLER_FACEBOOK_APP_ID:-${SOCIO_FACEBOOK_APP_ID:-${FACEBOOK_APP_ID:-}}}}"
SOCIO_FACEBOOK_APP_SECRET="${CALLER_SOCIO_FACEBOOK_APP_SECRET:-${CALLER_FACEBOOK_APP_SECRET:-${SOCIO_FACEBOOK_APP_SECRET:-${FACEBOOK_APP_SECRET:-}}}}"
SOCIO_FACEBOOK_PAGE_ID="${CALLER_SOCIO_FACEBOOK_PAGE_ID:-${CALLER_FACEBOOK_PAGE_ID:-${SOCIO_FACEBOOK_PAGE_ID:-${FACEBOOK_PAGE_ID:-}}}}"
SOCIO_FACEBOOK_PAGE_ACCESS_TOKEN="${CALLER_SOCIO_FACEBOOK_PAGE_ACCESS_TOKEN:-${CALLER_FACEBOOK_PAGE_ACCESS_TOKEN:-${SOCIO_FACEBOOK_PAGE_ACCESS_TOKEN:-${FACEBOOK_PAGE_ACCESS_TOKEN:-}}}}"
SOCIO_FACEBOOK_GRAPH_API_VERSION="${CALLER_SOCIO_FACEBOOK_GRAPH_API_VERSION:-${CALLER_FACEBOOK_GRAPH_API_VERSION:-${SOCIO_FACEBOOK_GRAPH_API_VERSION:-${FACEBOOK_GRAPH_API_VERSION:-v25.0}}}}"
SOCIO_IMGUR_CLIENT_ID="${CALLER_SOCIO_IMGUR_CLIENT_ID:-${CALLER_IMGUR_CLIENT_ID:-${SOCIO_IMGUR_CLIENT_ID:-${IMGUR_CLIENT_ID:-}}}}"
SOCIO_X_API_KEY="${CALLER_SOCIO_X_API_KEY:-${CALLER_X_API_KEY:-${SOCIO_X_API_KEY:-${X_API_KEY:-}}}}"
SOCIO_X_API_SECRET="${CALLER_SOCIO_X_API_SECRET:-${CALLER_X_API_SECRET:-${SOCIO_X_API_SECRET:-${X_API_SECRET:-}}}}"
SOCIO_X_ACCESS_TOKEN="${CALLER_SOCIO_X_ACCESS_TOKEN:-${CALLER_X_ACCESS_TOKEN:-${SOCIO_X_ACCESS_TOKEN:-${X_ACCESS_TOKEN:-}}}}"
SOCIO_X_ACCESS_TOKEN_SECRET="${CALLER_SOCIO_X_ACCESS_TOKEN_SECRET:-${CALLER_X_ACCESS_TOKEN_SECRET:-${SOCIO_X_ACCESS_TOKEN_SECRET:-${X_ACCESS_TOKEN_SECRET:-}}}}"
SOCIO_X_OAUTH2_ACCESS_TOKEN="${CALLER_SOCIO_X_OAUTH2_ACCESS_TOKEN:-${CALLER_X_OAUTH2_ACCESS_TOKEN:-${SOCIO_X_OAUTH2_ACCESS_TOKEN:-${X_OAUTH2_ACCESS_TOKEN:-}}}}"
SOCIO_TIKTOK_ACCESS_TOKEN="${CALLER_SOCIO_TIKTOK_ACCESS_TOKEN:-${CALLER_TIKTOK_ACCESS_TOKEN:-${SOCIO_TIKTOK_ACCESS_TOKEN:-${TIKTOK_ACCESS_TOKEN:-}}}}"
SOCIO_TIKTOK_CLIENT_KEY="${CALLER_SOCIO_TIKTOK_CLIENT_KEY:-${CALLER_TIKTOK_CLIENT_KEY:-${SOCIO_TIKTOK_CLIENT_KEY:-${TIKTOK_CLIENT_KEY:-}}}}"
SOCIO_TIKTOK_CLIENT_SECRET="${CALLER_SOCIO_TIKTOK_CLIENT_SECRET:-${CALLER_TIKTOK_CLIENT_SECRET:-${SOCIO_TIKTOK_CLIENT_SECRET:-${TIKTOK_CLIENT_SECRET:-}}}}"
SOCIO_TIKTOK_PRIVACY_LEVEL="${CALLER_SOCIO_TIKTOK_PRIVACY_LEVEL:-${CALLER_TIKTOK_PRIVACY_LEVEL:-${SOCIO_TIKTOK_PRIVACY_LEVEL:-${TIKTOK_PRIVACY_LEVEL:-SELF_ONLY}}}}"
SOCIO_DISCORD_BOT_TOKEN="${CALLER_SOCIO_DISCORD_BOT_TOKEN:-${CALLER_DISCORD_BOT_TOKEN:-${SOCIO_DISCORD_BOT_TOKEN:-${DISCORD_BOT_TOKEN:-}}}}"
SOCIO_DISCORD_GUILD_ID="${CALLER_SOCIO_DISCORD_GUILD_ID:-${CALLER_DISCORD_GUILD_ID:-${SOCIO_DISCORD_GUILD_ID:-${DISCORD_GUILD_ID:-}}}}"
SOCIO_DISCORD_USER_ID="${CALLER_SOCIO_DISCORD_USER_ID:-${CALLER_DISCORD_USER_ID:-${SOCIO_DISCORD_USER_ID:-${DISCORD_USER_ID:-}}}}"
SOCIO_DISCORD_POST_CHANNEL_ID="${CALLER_SOCIO_DISCORD_POST_CHANNEL_ID:-${CALLER_DISCORD_POST_CHANNEL_ID:-${SOCIO_DISCORD_POST_CHANNEL_ID:-${DISCORD_POST_CHANNEL_ID:-}}}}"
SOCIO_DISCORD_WEBHOOK_URL="${CALLER_SOCIO_DISCORD_WEBHOOK_URL:-${CALLER_DISCORD_WEBHOOK_URL:-${SOCIO_DISCORD_WEBHOOK_URL:-${DISCORD_WEBHOOK_URL:-}}}}"
SOCIO_INSTALL_XURL="${SOCIO_INSTALL_XURL:-true}"
OPENCLAW_TELEGRAM_RUNTIME_FILE="${OPENCLAW_TELEGRAM_RUNTIME_FILE:-$HOME/.npm-global/lib/node_modules/openclaw/dist/extensions/telegram/bot-msflwCEW.js}"

RESTART_SERVICES="${1:---restart}"

if [ -z "$TELEGRAM_SOCIO_GROUP_ID" ]; then
  echo "MECHI_TELEGRAM_SOCIO_GROUP_ID is required." >&2
  exit 1
fi

copy_workspace() {
  local source_dir="$1"
  local target_dir="$2"

  if [ ! -d "$source_dir" ]; then
    echo "Missing workspace source: $source_dir" >&2
    exit 1
  fi

  install -d "$target_dir"
  case "$target_dir" in
    "$OPENCLAW_HOME/workspace-growth") ;;
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

should_install_xurl() {
  case "$(printf '%s' "$SOCIO_INSTALL_XURL" | tr '[:upper:]' '[:lower:]')" in
    0|false|no|off) return 1 ;;
    *) return 0 ;;
  esac
}

ensure_xurl() {
  if command -v xurl >/dev/null 2>&1; then
    return
  fi

  if ! should_install_xurl; then
    return
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found; skipping xurl install." >&2
    return
  fi

  npm install -g @xdevplatform/xurl >/dev/null 2>&1 || {
    echo "xurl install failed; continue and authenticate later once the CLI is available." >&2
    return
  }
}

apply_telegram_empty_input_hotfix() {
  local runtime_file="$1"
  local patcher="$MECHI_REPO/scripts/openclaw-hotfix-telegram-empty-input.py"

  if [ ! -f "$patcher" ]; then
    echo "Missing Telegram empty-input hotfix patcher: $patcher" >&2
    return
  fi

  if [ ! -f "$runtime_file" ]; then
    echo "Telegram runtime file not found; skipping empty-input hotfix: $runtime_file" >&2
    return
  fi

  python3 "$patcher" "$runtime_file"
}

saved_env_has_key() {
  local key="$1"

  python3 - "$OPENCLAW_HOME" "$SOCIO_WORKSPACE" "$key" <<'PY'
from pathlib import Path
import sys

openclaw_home, workspace, key = sys.argv[1:4]
for candidate in [Path(workspace) / '.env', Path(openclaw_home) / '.env']:
    if not candidate.exists():
        continue
    for line in candidate.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or '=' not in stripped:
            continue
        left, right = stripped.split('=', 1)
        left = left.replace('export ', '').strip()
        value = right.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1].strip()
        if left == key and value:
            print('1')
            raise SystemExit(0)
print('0')
PY
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

  echo "OpenClaw gateway service not found; restart it manually on this host." >&2
}

cd "$MECHI_REPO"

copy_workspace "$GROWTH_WORKSPACE_SOURCE" "$SOCIO_WORKSPACE"
ensure_xurl
apply_telegram_empty_input_hotfix "$OPENCLAW_TELEGRAM_RUNTIME_FILE"

node - "$OPENCLAW_HOME" "$SOCIO_WORKSPACE" "$SOCIO_INSTAGRAM_ACCESS_TOKEN" "$SOCIO_INSTAGRAM_BUSINESS_ACCOUNT_ID" "$SOCIO_FACEBOOK_USER_ACCESS_TOKEN" "$SOCIO_FACEBOOK_APP_ID" "$SOCIO_FACEBOOK_APP_SECRET" "$SOCIO_FACEBOOK_PAGE_ID" "$SOCIO_FACEBOOK_PAGE_ACCESS_TOKEN" "$SOCIO_FACEBOOK_GRAPH_API_VERSION" "$SOCIO_IMGUR_CLIENT_ID" "$SOCIO_X_API_KEY" "$SOCIO_X_API_SECRET" "$SOCIO_X_ACCESS_TOKEN" "$SOCIO_X_ACCESS_TOKEN_SECRET" "$SOCIO_X_OAUTH2_ACCESS_TOKEN" "$SOCIO_TIKTOK_ACCESS_TOKEN" "$SOCIO_TIKTOK_CLIENT_KEY" "$SOCIO_TIKTOK_CLIENT_SECRET" "$SOCIO_TIKTOK_PRIVACY_LEVEL" "$SOCIO_DISCORD_BOT_TOKEN" "$SOCIO_DISCORD_GUILD_ID" "$SOCIO_DISCORD_USER_ID" "$SOCIO_DISCORD_POST_CHANNEL_ID" "$SOCIO_DISCORD_WEBHOOK_URL" "$TELEGRAM_SOCIO_ALLOW_FROM" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [
  openclawHome,
  socioWorkspace,
  instagramAccessToken,
  instagramBusinessAccountId,
  facebookUserAccessToken,
  facebookAppId,
  facebookAppSecret,
  facebookPageId,
  facebookPageAccessToken,
  facebookGraphApiVersion,
  imgurClientId,
  xApiKey,
  xApiSecret,
  xAccessToken,
  xAccessTokenSecret,
  xOauth2AccessToken,
  tiktokAccessToken,
  tiktokClientKey,
  tiktokClientSecret,
  tiktokPrivacyLevel,
  discordBotToken,
  discordGuildId,
  discordUserId,
  discordPostChannelId,
  discordWebhookUrl,
  telegramAllowFrom,
] = process.argv.slice(2);

function readEnvFile(targetPath) {
  const env = new Map();

  if (!fs.existsSync(targetPath)) {
    return env;
  }

  for (const line of fs.readFileSync(targetPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [left, ...rest] = trimmed.split('=');
    const key = left.replace(/^export\s+/, '').trim();
    const value = normalizeValue(rest.join('=').trim());
    if (key && value) {
      env.set(key, value);
    }
  }

  return env;
}

function normalizeValue(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const normalized = normalizeValue(value);
    if (normalized) {
      return normalized;
    }
  }
  return '';
}

const rootEnvPath = path.join(openclawHome, '.env');
const workspaceEnvPath = path.join(socioWorkspace, '.env');
const existingEnv = new Map([
  ...readEnvFile(rootEnvPath).entries(),
  ...readEnvFile(workspaceEnvPath).entries(),
]);

const passthroughKeys = [
  'CHEZAHUB_INSTAGRAM_ACCESS_TOKEN',
  'CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'CHEZAHUB_INSTAGRAM_USERNAME',
  'CHEZAHUB_FACEBOOK_PAGE_ID',
  'CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN',
  'CHEZAHUB_FACEBOOK_PAGE_NAME',
  'PLAYMECHI_INSTAGRAM_ACCESS_TOKEN',
  'PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID',
  'PLAYMECHI_INSTAGRAM_USERNAME',
  'PLAYMECHI_FACEBOOK_PAGE_ID',
  'PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN',
  'PLAYMECHI_FACEBOOK_PAGE_NAME',
  'CHEZAHUB_TIKTOK_ACCESS_TOKEN',
  'CHEZAHUB_TIKTOK_CLIENT_KEY',
  'CHEZAHUB_TIKTOK_CLIENT_SECRET',
  'CHEZAHUB_TIKTOK_USERNAME',
  'CHEZAHUB_TIKTOK_PRIVACY_LEVEL',
  'PLAYMECHI_TIKTOK_ACCESS_TOKEN',
  'PLAYMECHI_TIKTOK_CLIENT_KEY',
  'PLAYMECHI_TIKTOK_CLIENT_SECRET',
  'PLAYMECHI_TIKTOK_USERNAME',
  'PLAYMECHI_TIKTOK_PRIVACY_LEVEL',
  'TIKTOK_DISABLE_DUET',
  'TIKTOK_DISABLE_STITCH',
  'TIKTOK_DISABLE_COMMENT',
  'TIKTOK_BRAND_CONTENT_TOGGLE',
  'TIKTOK_BRAND_ORGANIC_TOGGLE',
  'TIKTOK_IS_AIGC',
  'SOCIO_S3_STAGING_BUCKET',
  'SOCIO_S3_STAGING_PREFIX',
  'CHEZAHUB_X_USERNAME',
  'PLAYMECHI_X_USERNAME',
  'X_AUTH_TYPE',
  'XURL_APP_NAME',
  'TELEGRAM_BOT_TOKEN',
  'OPENCLAW_TELEGRAM_BOT_TOKEN',
  'MECHI_SOCIAL_NOTIFY_CHAT_ID',
  'TELEGRAM_SOCIO_NOTIFY_CHAT_ID',
  'TELEGRAM_BOSS_CHAT_ID',
];

const entries = [
  ['INSTAGRAM_ACCESS_TOKEN', firstNonEmpty(instagramAccessToken, existingEnv.get('INSTAGRAM_ACCESS_TOKEN'))],
  ['INSTAGRAM_BUSINESS_ACCOUNT_ID', firstNonEmpty(instagramBusinessAccountId, existingEnv.get('INSTAGRAM_BUSINESS_ACCOUNT_ID'))],
  ['FACEBOOK_USER_ACCESS_TOKEN', firstNonEmpty(facebookUserAccessToken, existingEnv.get('FACEBOOK_USER_ACCESS_TOKEN'))],
  ['FACEBOOK_APP_ID', firstNonEmpty(facebookAppId, existingEnv.get('FACEBOOK_APP_ID'))],
  ['FACEBOOK_APP_SECRET', firstNonEmpty(facebookAppSecret, existingEnv.get('FACEBOOK_APP_SECRET'))],
  ['FACEBOOK_PAGE_ID', firstNonEmpty(facebookPageId, existingEnv.get('FACEBOOK_PAGE_ID'))],
  ['FACEBOOK_PAGE_ACCESS_TOKEN', firstNonEmpty(facebookPageAccessToken, existingEnv.get('FACEBOOK_PAGE_ACCESS_TOKEN'))],
  ['FACEBOOK_GRAPH_API_VERSION', firstNonEmpty(facebookGraphApiVersion, existingEnv.get('FACEBOOK_GRAPH_API_VERSION'), 'v25.0')],
  ['IMGUR_CLIENT_ID', firstNonEmpty(imgurClientId, existingEnv.get('IMGUR_CLIENT_ID'))],
  ['X_API_KEY', firstNonEmpty(xApiKey, existingEnv.get('X_API_KEY'))],
  ['X_API_SECRET', firstNonEmpty(xApiSecret, existingEnv.get('X_API_SECRET'))],
  ['X_ACCESS_TOKEN', firstNonEmpty(xAccessToken, existingEnv.get('X_ACCESS_TOKEN'))],
  ['X_ACCESS_TOKEN_SECRET', firstNonEmpty(xAccessTokenSecret, existingEnv.get('X_ACCESS_TOKEN_SECRET'))],
  ['X_OAUTH2_ACCESS_TOKEN', firstNonEmpty(xOauth2AccessToken, existingEnv.get('X_OAUTH2_ACCESS_TOKEN'))],
  ['TIKTOK_ACCESS_TOKEN', firstNonEmpty(tiktokAccessToken, existingEnv.get('TIKTOK_ACCESS_TOKEN'))],
  ['TIKTOK_CLIENT_KEY', firstNonEmpty(tiktokClientKey, existingEnv.get('TIKTOK_CLIENT_KEY'))],
  ['TIKTOK_CLIENT_SECRET', firstNonEmpty(tiktokClientSecret, existingEnv.get('TIKTOK_CLIENT_SECRET'))],
  ['TIKTOK_PRIVACY_LEVEL', firstNonEmpty(tiktokPrivacyLevel, existingEnv.get('TIKTOK_PRIVACY_LEVEL'), 'SELF_ONLY')],
  ['DISCORD_BOT_TOKEN', firstNonEmpty(discordBotToken, existingEnv.get('DISCORD_BOT_TOKEN'))],
  ['DISCORD_GUILD_ID', firstNonEmpty(discordGuildId, existingEnv.get('DISCORD_GUILD_ID'))],
  ['DISCORD_USER_ID', firstNonEmpty(discordUserId, existingEnv.get('DISCORD_USER_ID'))],
  ['DISCORD_POST_CHANNEL_ID', firstNonEmpty(discordPostChannelId, existingEnv.get('DISCORD_POST_CHANNEL_ID'))],
  ['DISCORD_WEBHOOK_URL', firstNonEmpty(discordWebhookUrl, existingEnv.get('DISCORD_WEBHOOK_URL'))],
  ['MECHI_SOCIAL_NOTIFY_CHAT_ID', firstNonEmpty(existingEnv.get('MECHI_SOCIAL_NOTIFY_CHAT_ID'), telegramAllowFrom.split(',')[0])],
  ...passthroughKeys.map((key) => [key, firstNonEmpty(process.env[key], existingEnv.get(key))]),
].filter(([, value]) => typeof value === 'string' && value.trim());

function upsertEnvFile(targetPath) {
  const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8').split(/\r?\n/) : [];
  const managedKeys = new Set(entries.map(([key]) => key));
  const lines = existing.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      return line.length > 0;
    }

    const [left] = trimmed.split('=', 1);
    const key = left.replace(/^export\s+/, '').trim();
    return !managedKeys.has(key);
  });

  for (const [key, value] of entries) {
    lines.push(`${key}=${value}`);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${lines.join('\n')}\n`, 'utf8');
}

upsertEnvFile(rootEnvPath);
upsertEnvFile(workspaceEnvPath);
NODE

node - "$OPENCLAW_HOME" "$SOCIO_AGENT_ID" "$SOCIO_AGENT_NAME" "$SOCIO_WORKSPACE" "$SOCIO_MODEL" "$SOCIO_TOOLS_PROFILE" "$TELEGRAM_SOCIO_GROUP_ID" "$TELEGRAM_SOCIO_TOPIC_ID" "$TELEGRAM_SOCIO_ALLOW_FROM" "$TELEGRAM_SOCIO_GROUP_TITLE" "$TELEGRAM_SOCIO_TOPIC_LABEL" "$SOCIO_DISCORD_BOT_TOKEN" "$SOCIO_DISCORD_GUILD_ID" "$SOCIO_DISCORD_USER_ID" "$CONTROL_AGENT_ID" "$CONTROL_AGENT_NAME" "$CONTROL_WORKSPACE" "$CONTROL_TOOLS_PROFILE" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const [
  openclawHome,
  socioAgentId,
  socioAgentName,
  socioWorkspace,
  socioModel,
  socioToolsProfile,
  groupId,
  topicId,
  allowFromRaw,
  groupTitle,
  topicLabel,
  discordBotToken,
  discordGuildId,
  discordUserId,
  controlAgentId,
  controlAgentName,
  controlWorkspace,
  controlToolsProfile,
] = process.argv.slice(2);

const configPath = path.join(openclawHome, 'openclaw.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function parseAllowFrom(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (/^-?\d+$/.test(entry) ? Number(entry) : entry));
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

const allowFrom = parseAllowFrom(allowFromRaw);
const agent = {
  id: socioAgentId,
  name: socioAgentName,
  workspace: socioWorkspace,
  model: socioModel,
  thinkingDefault: 'low',
  fastModeDefault: true,
  tools: {
    profile: socioToolsProfile,
  },
};
const controlAgent = {
  id: controlAgentId,
  name: controlAgentName,
  workspace: controlWorkspace,
  model: socioModel,
  thinkingDefault: 'low',
  fastModeDefault: false,
  tools: {
    profile: controlToolsProfile,
  },
};

config.agents = objectOrEmpty(config.agents);
const list = Array.isArray(config.agents.list) ? [...config.agents.list] : [];
function upsertAgent(nextAgent) {
  const existingAgentIndex = list.findIndex((entry) => entry && entry.id === nextAgent.id);
  if (existingAgentIndex >= 0) {
    list[existingAgentIndex] = {
      ...objectOrEmpty(list[existingAgentIndex]),
      ...nextAgent,
      tools: {
        ...objectOrEmpty(list[existingAgentIndex]?.tools),
        ...objectOrEmpty(nextAgent.tools),
      },
    };
  } else {
    list.push(nextAgent);
  }
}
upsertAgent(controlAgent);
upsertAgent(agent);
config.agents.list = list;

config.channels = objectOrEmpty(config.channels);
const telegram = objectOrEmpty(config.channels.telegram);
telegram.enabled = true;
telegram.dmPolicy = 'allowlist';
telegram.allowFrom = allowFrom.map((entry) => String(entry));
telegram.dms = Object.fromEntries(
  allowFrom.map((entry) => [String(entry), { historyLimit: 80 }])
);
const groups = objectOrEmpty(telegram.groups);
const existingGroup = objectOrEmpty(groups[groupId]);

const groupPrompt = [
  `This is ${groupTitle}, the Boss's private Mechi Telegram SMM room.`,
  'Route this group to the socio agent for Mechi social publishing and social media operations.',
  'Read the workspace file MECHI_SOCIAL_PLAYBOOK.md before drafting or publishing.',
  'When the Boss sends a photo or video here without naming channels, treat it as approval to publish on Instagram only.',
  'If the Boss says socio post chezahub, publish to both Instagram and Facebook for the ChezaHub brand pair.',
  'If the Boss says socio post playmechi, publish to both Instagram and Facebook for the PlayMechi brand pair.',
  'If the Boss says socio post mechi or post mechi, treat Mechi as PlayMechi and publish to Instagram and Facebook for PlayMechi.',
  'If the Boss says socio instagram, socio facebook, socio x, socio instagram/facebook, or socio all, use those exact channel targets for the named brand.',
  'If the Boss says socio ping, socio test, or socio help, do not publish anything; reply with a short readiness or command summary only.',
  'If the Boss asks to schedule a post, use the local mechi-social-exec scheduler immediately and reply with the queued job id, exact EAT time, target channels, and caption used.',
  'If the Boss names Facebook, X, Discord, or says post all, publish to those named channels too.',
  'TikTok direct and draft publishing are paused. If the Boss asks for TikTok, say TikTok SMM automation is paused and ask whether to re-enable it.',
  'For explicit chezahub or playmechi commands, use the local mechi-social-exec publish-meta helpers so the publish target is deterministic.',
  'Use the installed instagram-content-studio or instagram-api skill for Instagram-only publishing when the brand is already clear.',
  'Use the local mechi-social-exec workspace skill for Mechi-specific caption shaping, Facebook publishing, Discord webhook posting, X readiness checks, and cross-channel reporting.',
  'If the message includes a caption, keep the Boss intent and clean it lightly. If there is no caption, draft a Mechi-ready caption from the media, filename, command, and context without inventing facts.',
  'Do not ask the Boss to confirm a caption for explicit post or schedule commands. Execute first, then report the caption that was used.',
  'If the brand is ambiguous between ChezaHub and PlayMechi, ask one short clarification before publishing.',
  'Reply after publish with the target channels plus the permalink, post id, or skip reason for each channel.',
  'Do not touch ad spend, unrelated campaigns, or customer account actions from this room.',
].join(' ');

const nextGroup = {
  ...existingGroup,
  enabled: true,
  requireMention: false,
  groupPolicy: 'open',
  allowFrom,
  systemPrompt: groupPrompt,
};

if (topicId) {
  const topics = objectOrEmpty(existingGroup.topics);
  const existingTopic = objectOrEmpty(topics[topicId]);
  const topicPrompt = [
    `This is the ${topicLabel} topic in the Boss's private Mechi Telegram SMM room.`,
    'Use the socio agent for Mechi social execution.',
    'Read MECHI_SOCIAL_PLAYBOOK.md before drafting or publishing.',
    'If the Boss says socio post chezahub, publish to both Instagram and Facebook for the ChezaHub brand pair.',
    'If the Boss says socio post playmechi, publish to both Instagram and Facebook for the PlayMechi brand pair.',
    'If the Boss says socio post mechi or post mechi, treat Mechi as PlayMechi and publish to Instagram and Facebook for PlayMechi.',
    'If the Boss says socio instagram, socio facebook, socio x, socio instagram/facebook, or socio all, use those exact channel targets for the named brand.',
    'TikTok direct and draft publishing are paused. If the Boss asks for TikTok, say TikTok SMM automation is paused and ask whether to re-enable it.',
    'If the Boss says socio ping, socio test, or socio help, do not publish anything; reply with a short readiness or command summary only.',
    'If the Boss asks to schedule a post, use the local mechi-social-exec scheduler immediately and reply with the queued job id, exact EAT time, target channels, and caption used.',
    'When the Boss drops a photo or video here without naming a brand, do not assume PlayMechi or ChezaHub blindly. Infer from the asset and CTA, and ask one short clarification if it is still ambiguous.',
    'Use the message caption when present. If needed, improve grammar lightly but keep the Boss intent.',
    'Do not ask the Boss to confirm a caption for explicit post or schedule commands. Execute first, then report the caption that was used.',
    'Use mechi-social-exec for caption shaping and cross-channel execution, especially the local publish-meta helpers for explicit chezahub or playmechi commands.',
  ].join(' ');

  nextGroup.topics = {
    ...topics,
    [topicId]: {
      ...existingTopic,
      enabled: true,
      requireMention: false,
      allowFrom,
      agentId: socioAgentId,
      systemPrompt: topicPrompt,
    },
  };
}

groups[groupId] = nextGroup;
telegram.groups = groups;
config.channels.telegram = telegram;

if (typeof discordBotToken === 'string' && discordBotToken.trim()) {
  const discord = objectOrEmpty(config.channels.discord);
  discord.enabled = true;
  discord.token = {
    source: 'env',
    provider: 'default',
    id: 'DISCORD_BOT_TOKEN',
  };

  if (discordGuildId && discordUserId) {
    const guilds = objectOrEmpty(discord.guilds);
    const existingGuild = objectOrEmpty(guilds[discordGuildId]);
    guilds[discordGuildId] = {
      ...existingGuild,
      requireMention: existingGuild.requireMention ?? true,
      users: Array.isArray(existingGuild.users)
        ? Array.from(new Set([...existingGuild.users, discordUserId]))
        : [discordUserId],
    };
    discord.guilds = guilds;
    discord.groupPolicy = discord.groupPolicy || 'allowlist';
  }

  config.channels.discord = discord;
}

const bindings = Array.isArray(config.bindings) ? [...config.bindings] : [];
const filteredBindings = bindings.filter((binding) => {
  if (!binding || typeof binding !== 'object') {
    return true;
  }

  if (binding.match?.channel !== 'telegram') {
    return true;
  }

  return !(binding.match?.peer?.kind === 'group' && String(binding.match?.peer?.id || '') === groupId);
}).filter((binding) => {
  if (!binding || typeof binding !== 'object') {
    return true;
  }

  if (binding.match?.channel !== 'telegram') {
    return true;
  }

  const directIds = allowFrom.map((entry) => String(entry));
  return !(
    binding.match?.peer?.kind === 'direct' &&
    directIds.includes(String(binding.match?.peer?.id || ''))
  );
});

filteredBindings.push({
  type: 'route',
  comment: 'Boss private OPS Telegram SMM room -> socio',
  agentId: socioAgentId,
  match: {
    channel: 'telegram',
    peer: {
      kind: 'group',
      id: groupId,
    },
  },
});

for (const chatId of allowFrom.map((entry) => String(entry))) {
  filteredBindings.push({
    type: 'route',
    comment: 'Approved Boss/admin Telegram DM -> control coding agent',
    agentId: controlAgentId,
    match: {
      channel: 'telegram',
      peer: {
        kind: 'direct',
        id: chatId,
      },
    },
  });
}

config.bindings = filteredBindings;

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
NODE

"$OPENCLAW_BIN" config validate --json

echo "Socio Telegram configuration applied."
echo "- agent: $SOCIO_AGENT_ID"
echo "- admin DM agent: $CONTROL_AGENT_ID ($CONTROL_TOOLS_PROFILE tools)"
echo "- workspace: $SOCIO_WORKSPACE"
echo "- group: $TELEGRAM_SOCIO_GROUP_TITLE ($TELEGRAM_SOCIO_GROUP_ID)"
echo "- growth workspace synced from: $GROWTH_WORKSPACE_SOURCE"
if [ -n "$TELEGRAM_SOCIO_TOPIC_ID" ]; then
  echo "- topic: $TELEGRAM_SOCIO_TOPIC_LABEL ($TELEGRAM_SOCIO_TOPIC_ID)"
else
  echo "- topic: no numeric topic id supplied yet; group-level socio routing is active"
fi
if [ "$(saved_env_has_key INSTAGRAM_ACCESS_TOKEN)" = "1" ] && [ "$(saved_env_has_key INSTAGRAM_BUSINESS_ACCOUNT_ID)" = "1" ]; then
  echo "- instagram publish env: INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID synced"
else
  echo "- instagram publish env: missing INSTAGRAM_ACCESS_TOKEN and/or INSTAGRAM_BUSINESS_ACCOUNT_ID"
fi
if [ "$(saved_env_has_key FACEBOOK_PAGE_ID)" = "1" ] && [ "$(saved_env_has_key FACEBOOK_PAGE_ACCESS_TOKEN)" = "1" ]; then
  echo "- facebook page env: FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN synced"
else
  echo "- facebook page env: missing FACEBOOK_PAGE_ID and/or FACEBOOK_PAGE_ACCESS_TOKEN"
fi
if [ "$(saved_env_has_key CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID)" = "1" ] && [ "$(saved_env_has_key CHEZAHUB_FACEBOOK_PAGE_ID)" = "1" ] && [ "$(saved_env_has_key CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN)" = "1" ]; then
  echo "- chezahub brand pair: ready"
else
  echo "- chezahub brand pair: missing one or more brand-specific Meta keys"
fi
if [ "$(saved_env_has_key PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID)" = "1" ] && [ "$(saved_env_has_key PLAYMECHI_FACEBOOK_PAGE_ID)" = "1" ] && [ "$(saved_env_has_key PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN)" = "1" ]; then
  echo "- playmechi brand pair: ready"
else
  echo "- playmechi brand pair: missing one or more brand-specific Meta keys"
fi
if [ "$(saved_env_has_key SOCIO_S3_STAGING_BUCKET)" = "1" ]; then
  echo "- aws media staging: configured"
else
  echo "- aws media staging: missing SOCIO_S3_STAGING_BUCKET"
fi
if command -v xurl >/dev/null 2>&1; then
  echo "- x publishing CLI: xurl installed"
else
  echo "- x publishing CLI: xurl not installed"
fi
if [ "$(saved_env_has_key TIKTOK_ACCESS_TOKEN)" = "1" ] || [ "$(saved_env_has_key PLAYMECHI_TIKTOK_ACCESS_TOKEN)" = "1" ]; then
  echo "- tiktok publish env: token present"
else
  echo "- tiktok publish env: missing TIKTOK_ACCESS_TOKEN or PLAYMECHI_TIKTOK_ACCESS_TOKEN"
fi
if [ "$(saved_env_has_key DISCORD_BOT_TOKEN)" = "1" ] || [ "$(saved_env_has_key DISCORD_WEBHOOK_URL)" = "1" ]; then
  echo "- discord publish path: configured"
else
  echo "- discord publish path: missing DISCORD_BOT_TOKEN and DISCORD_WEBHOOK_URL"
fi

if [ "$RESTART_SERVICES" = "--no-restart" ]; then
  echo "Skipped service restart."
  exit 0
fi

restart_gateway
