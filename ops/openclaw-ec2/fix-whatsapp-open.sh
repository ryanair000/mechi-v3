#!/bin/bash
cd /home/ubuntu/.openclaw

# Fix WhatsApp account to be open to everyone
cat openclaw.json | jq '
  .channels.whatsapp.accounts.default.dmPolicy = "open" |
  .channels.whatsapp.accounts.default.allowFrom = ["*"]
' > tmp.json && mv tmp.json openclaw.json

echo "WhatsApp account dmPolicy set to open"
cat openclaw.json | jq '.channels.whatsapp.accounts.default | {dmPolicy, allowFrom}'
