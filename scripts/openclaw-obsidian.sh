#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_env_file() {
  local file_path="$1"

  if [[ -f "$file_path" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file_path"
    set +a
  fi
}

load_env_file "$HOME/.openclaw/.env"
load_env_file "$ROOT_DIR/.env.local"
load_env_file "$ROOT_DIR/.env"

export EDITOR="${EDITOR:-/usr/bin/cat}"
export PATH="$HOME/.npm-global/bin:$HOME/.local/bin:/usr/local/bin:$PATH"

if command -v obsidian-cli >/dev/null 2>&1; then
  OBSIDIAN_CLI_BIN="$(command -v obsidian-cli)"
elif [[ -x "$HOME/.npm-global/bin/obsidian-cli" ]]; then
  OBSIDIAN_CLI_BIN="$HOME/.npm-global/bin/obsidian-cli"
elif [[ -x "/usr/local/bin/obsidian-cli" ]]; then
  OBSIDIAN_CLI_BIN="/usr/local/bin/obsidian-cli"
else
  echo "openclaw-obsidian: obsidian-cli is not installed on PATH" >&2
  exit 127
fi

exec "$OBSIDIAN_CLI_BIN" "$@"
