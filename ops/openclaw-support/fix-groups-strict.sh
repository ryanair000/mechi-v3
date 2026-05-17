#!/bin/bash
cd /home/ubuntu/.openclaw

# Update groups config - require mention AND only allow admin to trigger responses
cat openclaw.json | jq '
  .channels.whatsapp.groups["*"] = {
    "requireMention": true,
    "allowFrom": ["254708355692", "+254708355692", "254708355692@s.whatsapp.net"]
  } |
  .channels.whatsapp.accounts.default.groups["*"] = {
    "requireMention": true,
    "allowFrom": ["254708355692", "+254708355692", "254708355692@s.whatsapp.net"]
  } |
  .channels.telegram.groups["*"] = {
    "requireMention": true,
    "allowFrom": ["6806783421", "6738706706"]
  }
' > tmp.json && mv tmp.json openclaw.json

echo "Groups: requireMention=true, allowFrom=admin only"
cat openclaw.json | jq '.channels.whatsapp.groups, .channels.whatsapp.accounts.default.groups'
