#!/bin/bash
cd /home/ubuntu/.openclaw
cat openclaw.json | jq '.channels.telegram.dmPolicy = "open"' > tmp.json && mv tmp.json openclaw.json
echo "Telegram dmPolicy set to open"
