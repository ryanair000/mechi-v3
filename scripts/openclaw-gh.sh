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

if [[ -z "${GH_TOKEN:-}" && -n "${GITHUB_TOKEN:-}" ]]; then
  export GH_TOKEN="$GITHUB_TOKEN"
fi

if [[ -z "${GITHUB_TOKEN:-}" && -n "${GH_TOKEN:-}" ]]; then
  export GITHUB_TOKEN="$GH_TOKEN"
fi

detect_repo_from_git() {
  local remote_url
  remote_url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null || true)"

  if [[ -z "$remote_url" ]]; then
    return 1
  fi

  remote_url="${remote_url%.git}"
  remote_url="${remote_url#https://github.com/}"
  remote_url="${remote_url#http://github.com/}"
  remote_url="${remote_url#git@github.com:}"
  remote_url="${remote_url#git@github.com/}"
  remote_url="${remote_url#ssh://git@github.com/}"

  if [[ "$remote_url" == */* ]]; then
    printf '%s\n' "$remote_url"
    return 0
  fi

  return 1
}

if [[ -z "${GH_REPO:-}" ]]; then
  detected_repo="$(detect_repo_from_git || true)"

  if [[ -n "$detected_repo" ]]; then
    export GH_REPO="$detected_repo"
  fi
fi

if [[ "${1:-}" == "--exec" ]]; then
  shift

  if [[ $# -lt 1 ]]; then
    echo "openclaw-gh.sh: missing command string for --exec" >&2
    exit 2
  fi

  exec bash -lc "$1"
fi

exec gh "$@"
