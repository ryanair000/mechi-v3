#!/usr/bin/env bash
set -euo pipefail

MECHI_REPO="${MECHI_REPO:-/home/ubuntu/mechi-v3}"
REPORT_TIME_CRON="${MECHI_DAILY_REPORT_CRON:-0 22 * * *}"
REPORT_TZ="${MECHI_DAILY_REPORT_TZ:-Africa/Nairobi}"
LOG_DIR="${MECHI_DAILY_REPORT_LOG_DIR:-$HOME/.openclaw/logs}"
LOG_FILE="$LOG_DIR/mechi-daily-report.log"
MARKER_START="# BEGIN MECHI DAILY REPORT"
MARKER_END="# END MECHI DAILY REPORT"

if [ ! -d "$MECHI_REPO" ]; then
  echo "Mechi repo not found: $MECHI_REPO" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

JOB_COMMAND="cd $MECHI_REPO && npm run ops:daily-report:telegram -- --send >> $LOG_FILE 2>&1"
JOB_BLOCK=$(cat <<EOF
$MARKER_START
CRON_TZ=$REPORT_TZ
$REPORT_TIME_CRON $JOB_COMMAND
$MARKER_END
EOF
)

CURRENT_CRON="$(mktemp)"
NEXT_CRON="$(mktemp)"
trap 'rm -f "$CURRENT_CRON" "$NEXT_CRON"' EXIT

crontab -l > "$CURRENT_CRON" 2>/dev/null || true
awk -v start="$MARKER_START" -v end="$MARKER_END" '
  $0 == start { skip = 1; next }
  $0 == end { skip = 0; next }
  skip != 1 { print }
' "$CURRENT_CRON" > "$NEXT_CRON"

{
  cat "$NEXT_CRON"
  if [ -s "$NEXT_CRON" ]; then
    printf '\n'
  fi
  printf '%s\n' "$JOB_BLOCK"
} | crontab -

echo "Installed Mechi daily Telegram report cron:"
echo "  schedule: $REPORT_TIME_CRON ($REPORT_TZ)"
echo "  repo: $MECHI_REPO"
echo "  log: $LOG_FILE"
echo
echo "Smoke test without sending:"
echo "  cd $MECHI_REPO && npm run ops:daily-report:telegram"
