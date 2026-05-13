#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_HOME="${OPENCLAW_HOME:-$HOME/.openclaw}"
TARGETS_CSV="${TARGETS_CSV:-socio,main}"
RESTART_GATEWAY="${RESTART_GATEWAY:---restart}"
SOURCE_AGENT_DIR="${1:-}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/openclaw-auth-backups/$STAMP}"

usage() {
  cat <<'EOF'
usage: openclaw-reseed-codex-auth.sh <source_agent_dir> [--restart|--no-restart]

Copies auth-state.json and auth-profiles.json from a known-good OpenClaw agent
directory into the target live agent directories under ~/.openclaw/agents/.

Environment:
  OPENCLAW_HOME   Override the OpenClaw home directory. Default: ~/.openclaw
  TARGETS_CSV     Comma-separated target agent ids. Default: socio,main
  BACKUP_ROOT     Override backup root. Default: ~/openclaw-auth-backups/<stamp>
EOF
}

if [[ -z "$SOURCE_AGENT_DIR" || "$SOURCE_AGENT_DIR" == "--help" || "$SOURCE_AGENT_DIR" == "-h" ]]; then
  usage
  exit 1
fi

if [[ "${2:-}" == "--no-restart" ]]; then
  RESTART_GATEWAY="--no-restart"
fi

SOURCE_STATE="$SOURCE_AGENT_DIR/auth-state.json"
SOURCE_PROFILES="$SOURCE_AGENT_DIR/auth-profiles.json"

if [[ ! -f "$SOURCE_STATE" ]]; then
  echo "Missing source auth state: $SOURCE_STATE" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_PROFILES" ]]; then
  echo "Missing source auth profiles: $SOURCE_PROFILES" >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT"

IFS=',' read -r -a TARGETS <<<"$TARGETS_CSV"

for target in "${TARGETS[@]}"; do
  target="$(printf '%s' "$target" | xargs)"
  [[ -n "$target" ]] || continue

  target_dir="$OPENCLAW_HOME/agents/$target/agent"
  mkdir -p "$target_dir"
  mkdir -p "$BACKUP_ROOT/$target"

  if [[ -f "$target_dir/auth-state.json" ]]; then
    cp -f "$target_dir/auth-state.json" "$BACKUP_ROOT/$target/auth-state.json"
  fi
  if [[ -f "$target_dir/auth-profiles.json" ]]; then
    cp -f "$target_dir/auth-profiles.json" "$BACKUP_ROOT/$target/auth-profiles.json"
  fi

  cp -f "$SOURCE_STATE" "$target_dir/auth-state.json"
  cp -f "$SOURCE_PROFILES" "$target_dir/auth-profiles.json"
  chmod 600 "$target_dir/auth-state.json" "$target_dir/auth-profiles.json"
done

python3 - "$SOURCE_STATE" "$SOURCE_PROFILES" <<'PY'
import json
import sys
from pathlib import Path

state_path = Path(sys.argv[1])
profiles_path = Path(sys.argv[2])

state = json.loads(state_path.read_text())
profiles = json.loads(profiles_path.read_text())

print("Source auth state:")
print(json.dumps({"lastGood": state.get("lastGood"), "version": state.get("version")}, indent=2))
print("Source auth profiles:")
print(json.dumps({"profiles": list((profiles.get("profiles") or {}).keys()), "version": profiles.get("version")}, indent=2))
PY

python3 - "$SOURCE_PROFILES" <<'PY'
import json
import sys
import urllib.request
from pathlib import Path

profiles = json.loads(Path(sys.argv[1]).read_text())
entries = list((profiles.get("profiles") or {}).values())
access = entries[0].get("access") if entries else None

if not access:
    print("Bearer validation skipped: no access token present in source auth profiles.")
    raise SystemExit(0)

req = urllib.request.Request(
    "https://chatgpt.com/backend-api/wham/usage",
    headers={"Authorization": f"Bearer {access}"},
)
with urllib.request.urlopen(req, timeout=20) as response:
    print(f"Bearer validation status: HTTP {response.status}")
PY

if [[ "$RESTART_GATEWAY" == "--no-restart" ]]; then
  echo "Skipped gateway restart."
  echo "Backup root: $BACKUP_ROOT"
  exit 0
fi

systemctl --user restart openclaw-gateway.service
sleep 8
systemctl --user status openclaw-gateway.service --no-pager
journalctl --user -u openclaw-gateway.service -n 40 --no-pager -o short-iso
echo "Backup root: $BACKUP_ROOT"
