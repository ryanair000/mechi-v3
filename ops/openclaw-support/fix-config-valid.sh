#!/bin/bash
cd /home/ubuntu/.openclaw

# Remove invalid allowFrom from groups - only requireMention is valid
cat openclaw.json | jq '
  .channels.whatsapp.groups["*"] = {
    "requireMention": true
  } |
  .channels.whatsapp.accounts.default.groups["*"] = {
    "requireMention": true
  } |
  .channels.telegram.groups["*"] = {
    "requireMention": true
  }
' > tmp.json && mv tmp.json openclaw.json

echo "Config fixed - removed invalid allowFrom from groups"
