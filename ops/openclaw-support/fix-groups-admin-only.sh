#!/bin/bash
cd /home/ubuntu/.openclaw

# Update WhatsApp groups to require mention and only respond to admin
cat openclaw.json | jq '
  .channels.whatsapp.groups["*"].requireMention = true |
  .channels.whatsapp.groups["*"].allowFrom = ["254708355692", "+254708355692"] |
  .channels.whatsapp.accounts.default.groups["*"].requireMention = true |
  .channels.whatsapp.accounts.default.groups["*"].allowFrom = ["254708355692", "+254708355692"] |
  .channels.telegram.groups["*"].requireMention = true |
  .channels.telegram.groups["*"].allowFrom = ["6806783421", "6738706706"]
' > tmp.json && mv tmp.json openclaw.json

echo "Groups now require mention AND only respond to admin tags"
