#!/usr/bin/env bash
set -euo pipefail

if ! NOTESMD_CLI_BIN="$(command -v notesmd-cli 2>/dev/null)"; then
  echo "obsidian-cli-compat: notesmd-cli is not installed on PATH" >&2
  exit 127
fi

command_name="${1:-}"

case "$command_name" in
  print-default)
    shift
    exec "$NOTESMD_CLI_BIN" list-vaults --default "$@"
    ;;
  set-default)
    shift
    exec "$NOTESMD_CLI_BIN" set-default-vault "$@"
    ;;
  "")
    exec "$NOTESMD_CLI_BIN"
    ;;
  *)
    exec "$NOTESMD_CLI_BIN" "$@"
    ;;
esac
