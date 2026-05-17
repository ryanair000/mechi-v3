#!/bin/bash
cd /home/ubuntu/.openclaw

# Backup current config
cp openclaw.json "openclaw.json.bak-$(date +%Y%m%d-%H%M%S)"

# Update config with jq
cat openclaw.json | jq '
  .channels.telegram.dmPolicy = "open" |
  .channels.telegram.allowFrom = ["*"] |
  .channels.telegram.timeoutSeconds = 60 |
  .channels.telegram.historyLimit = 50 |
  .channels.telegram.dmHistoryLimit = 50 |
  .channels.whatsapp.dmPolicy = "open" |
  .channels.whatsapp.allowFrom = ["*"] |
  .channels.whatsapp.accounts.default.dmPolicy = "open" |
  .channels.whatsapp.accounts.default.allowFrom = ["*"] |
  .agents.entries = [
    (.agents.entries[] | if .id == "support" then .model = "anthropic/claude-sonnet-4-20250514" | .thinkingDefault = "minimal" | .fastModeDefault = true else . end),
    (.agents.entries[] | if .id == "control" then .model = "anthropic/claude-sonnet-4-20250514" else . end),
    (.agents.entries[] | if .id == "community" then .model = "anthropic/claude-sonnet-4-20250514" else . end)
  ] |
  .agents.entries = [.agents.entries[] | select(.id != null)] |
  .agents.entries = (.agents.entries | unique_by(.id))
' > openclaw-new.json

# Validate and apply
if jq empty openclaw-new.json 2>/dev/null; then
  mv openclaw-new.json openclaw.json
  echo "Config updated successfully"
else
  echo "Config validation failed, keeping original"
  rm -f openclaw-new.json
  exit 1
fi
